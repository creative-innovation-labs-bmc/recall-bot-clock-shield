import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const ROOT_URL = 'http://127.0.0.1:4173';
const SCREEN_URL = `${ROOT_URL}/screen-b7f4e2/?debug=1`;
const captures = [
  { name: 'native-3840x804', width: 3840, height: 804 },
  { name: 'desktop-1600x900', width: 1600, height: 900 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(ROOT_URL);
      if (response.ok) return;
    } catch (_) {
      // Server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Local HTTP server did not start');
}

const server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});

try {
  await waitForServer();
  await mkdir('qc-output', { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  try {
    for (const capture of captures) {
      const page = await browser.newPage({ viewport: { width: capture.width, height: capture.height } });
      const consoleErrors = [];
      const pageErrors = [];
      const externalRequests = [];

      page.on('console', message => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.hostname !== '127.0.0.1') externalRequests.push(request.url());
      });

      await page.goto(SCREEN_URL, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1500);

      const result = await page.evaluate(() => {
        const stage = document.querySelector('#stage');
        const shell = document.querySelector('#stage-shell');
        const stageRect = stage.getBoundingClientRect();
        const shellRect = shell.getBoundingClientRect();
        const panels = [...document.querySelectorAll('.panel')];
        const videos = [...document.querySelectorAll('video')];
        return {
          stageOffset: [stage.offsetWidth, stage.offsetHeight],
          stageRect: [stageRect.width, stageRect.height],
          shellRect: [shellRect.width, shellRect.height],
          panelOffsets: panels.map(panel => [panel.offsetWidth, panel.offsetHeight]),
          panelDatesVisible: [...document.querySelectorAll('.panel-date')].every(node => getComputedStyle(node).display !== 'none'),
          videos: videos.map(video => ({ source: video.getAttribute('src'), muted: video.muted, loop: video.loop, playsInline: video.playsInline })),
          fontStatus: document.fonts.status,
          openSansLoaded: document.fonts.check('28px "Open Sans Local"'),
          ptSerifLoaded: document.fonts.check('320px "PT Serif Local"'),
          bodyOverflow: [document.body.scrollWidth, document.body.scrollHeight, innerWidth, innerHeight],
          qcApi: Boolean(window.__RECALL_CLOCK_QC__),
        };
      });

      assert.deepEqual(result.stageOffset, [3840, 804]);
      assert.equal(result.panelOffsets.length, 3);
      result.panelOffsets.forEach(size => assert.deepEqual(size, [1280, 804]));
      assert.equal(result.panelDatesVisible, true);
      assert.equal(result.videos.length, 3);
      result.videos.forEach(video => {
        assert.match(video.source, /assets\/videos\/.+-placeholder\.mp4$/);
        assert.equal(video.muted, true);
        assert.equal(video.loop, true);
        assert.equal(video.playsInline, true);
      });
      assert.equal(result.fontStatus, 'loaded');
      assert.equal(result.openSansLoaded, true);
      assert.equal(result.ptSerifLoaded, true);
      assert.equal(result.qcApi, true);
      assert.ok(result.stageRect[0] <= capture.width + 0.5);
      assert.ok(result.stageRect[1] <= capture.height + 0.5);
      assert.ok(Math.abs(result.stageRect[0] / result.stageRect[1] - 3840 / 804) < 0.001);
      assert.ok(result.bodyOverflow[0] <= capture.width);
      assert.ok(result.bodyOverflow[1] <= capture.height);
      assert.deepEqual(externalRequests, []);
      assert.deepEqual(pageErrors, []);
      assert.deepEqual(consoleErrors, []);

      await page.screenshot({ path: `qc-output/${capture.name}.png`, fullPage: true });
      await page.close();
    }

    const root = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await root.goto(ROOT_URL, { waitUntil: 'domcontentloaded' });
    const rootText = await root.locator('body').innerText();
    assert.equal(rootText.trim(), '');
    await root.close();
  } finally {
    await browser.close();
  }

  console.log('Browser QC passed: native, desktop and mobile layouts are stable and local-only.');
} finally {
  server.kill('SIGTERM');
}
