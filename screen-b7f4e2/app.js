(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const CONFIG = Object.freeze({
    timeZone: 'Australia/Melbourne',
    nativeWidth: 3840,
    nativeHeight: 804,
    debug: params.get('debug') === '1',
    videoSources: Object.freeze({
      hour: 'assets/videos/hour-placeholder.mp4',
      minute: 'assets/videos/minute-placeholder.mp4',
      second: 'assets/videos/second-placeholder.mp4'
    })
  });

  const stage = document.querySelector('#stage');
  const shell = document.querySelector('#stage-shell');
  const videos = {
    hour: document.querySelector('#hour-video'),
    minute: document.querySelector('#minute-video'),
    second: document.querySelector('#second-video')
  };
  const values = {
    hour: document.querySelector('#hour-value'),
    minute: document.querySelector('#minute-value'),
    second: document.querySelector('#second-value')
  };
  const dateNodes = [...document.querySelectorAll('.panel-date')];
  const miniClocks = [...document.querySelectorAll('.mini-clock')];
  const debugNode = document.querySelector('#debug');
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: CONFIG.timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  let lastRenderedSecond = '';
  let clockTimer = 0;
  let fitFrame = 0;
  let stageScale = 1;
  const progress = new WeakMap();

  function fitStage() {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => {
      const widthScale = window.innerWidth / CONFIG.nativeWidth;
      const heightScale = window.innerHeight / CONFIG.nativeHeight;
      stageScale = Math.max(0.01, Math.min(widthScale, heightScale));
      shell.style.width = `${CONFIG.nativeWidth * stageScale}px`;
      shell.style.height = `${CONFIG.nativeHeight * stageScale}px`;
      stage.style.transform = `scale(${stageScale})`;
      renderDebug();
    });
  }

  function partsNow() {
    const parts = formatter.formatToParts(new Date());
    const map = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return {
      day: `${map.weekday} ${map.day} ${map.month}`.toUpperCase(),
      hour: map.hour.padStart(2, '0'),
      minute: map.minute.padStart(2, '0'),
      second: map.second.padStart(2, '0')
    };
  }

  function renderClock(force = false) {
    const now = partsNow();
    const key = `${now.hour}:${now.minute}:${now.second}`;
    if (!force && key === lastRenderedSecond) return;
    lastRenderedSecond = key;

    values.hour.textContent = now.hour;
    values.minute.textContent = now.minute;
    values.second.textContent = now.second;
    dateNodes.forEach(node => { node.textContent = now.day; });
    miniClocks.forEach(node => {
      node.textContent = key;
      node.dateTime = key;
    });
    renderDebug(now);
  }

  function playbackQuality(video) {
    if (typeof video.getVideoPlaybackQuality !== 'function') return 'n/a';
    const quality = video.getVideoPlaybackQuality();
    return `${quality.droppedVideoFrames}/${quality.totalVideoFrames}`;
  }

  function videoState(video) {
    const duration = Number.isFinite(video.duration) ? video.duration.toFixed(2) : '--';
    const current = Number.isFinite(video.currentTime) ? video.currentTime.toFixed(2) : '0.00';
    return `${video.readyState}/${video.networkState} ${video.paused ? 'paused' : 'playing'} ${current}/${duration}s drop ${playbackQuality(video)}`;
  }

  function renderDebug(now = partsNow()) {
    if (!CONFIG.debug) return;
    const rect = stage.getBoundingClientRect();
    debugNode.hidden = false;
    debugNode.textContent = [
      `native ${CONFIG.nativeWidth}×${CONFIG.nativeHeight} | viewport ${innerWidth}×${innerHeight}`,
      `stage ${Math.round(rect.width)}×${Math.round(rect.height)} | scale ${stageScale.toFixed(4)}`,
      `Melbourne ${now.day} ${now.hour}:${now.minute}:${now.second}`,
      `hour   ${videoState(videos.hour)}`,
      `minute ${videoState(videos.minute)}`,
      `second ${videoState(videos.second)}`,
      `fonts ${document.fonts.status} | Open Sans ${document.fonts.check('28px "Open Sans Local"')} | PT Serif ${document.fonts.check('320px "PT Serif Local"')}`
    ].join('\n');
  }

  async function ensurePlaying(video) {
    try {
      await video.play();
    } catch (_) {
      // Kiosk playback allows muted autoplay. A user gesture fallback is registered below.
    }
  }

  function initialiseVideo(kind, video) {
    video.disablePictureInPicture = true;
    video.src = CONFIG.videoSources[kind];
    video.addEventListener('loadeddata', () => ensurePlaying(video), { passive: true });
    video.addEventListener('canplay', () => ensurePlaying(video), { passive: true });
    video.addEventListener('stalled', () => ensurePlaying(video), { passive: true });
    video.addEventListener('waiting', () => ensurePlaying(video), { passive: true });
    video.addEventListener('error', () => renderDebug(), { passive: true });
    video.load();
    progress.set(video, { time: -1, checkedAt: performance.now() });
    ensurePlaying(video);
  }

  function playbackWatchdog() {
    const now = performance.now();
    Object.values(videos).forEach(video => {
      const previous = progress.get(video) || { time: -1, checkedAt: now };
      const advancing = Math.abs(video.currentTime - previous.time) > 0.01;
      if (advancing) {
        progress.set(video, { time: video.currentTime, checkedAt: now });
      } else if (!document.hidden && now - previous.checkedAt > 6000 && video.readyState >= 2) {
        ensurePlaying(video);
        progress.set(video, { time: video.currentTime, checkedAt: now });
      }
      if (!document.hidden && video.paused && video.readyState >= 2) ensurePlaying(video);
    });
    renderDebug();
  }

  function scheduleClockTick() {
    clearTimeout(clockTimer);
    const delay = 1000 - (Date.now() % 1000) + 8;
    clockTimer = window.setTimeout(() => {
      renderClock();
      scheduleClockTick();
    }, delay);
  }

  Object.entries(videos).forEach(([kind, video]) => initialiseVideo(kind, video));
  fitStage();
  renderClock(true);
  scheduleClockTick();
  window.setInterval(playbackWatchdog, 2000);

  window.addEventListener('resize', fitStage, { passive: true });
  window.addEventListener('orientationchange', fitStage, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      renderClock(true);
      fitStage();
      Object.values(videos).forEach(ensurePlaying);
    }
  }, { passive: true });
  window.addEventListener('pointerdown', () => Object.values(videos).forEach(ensurePlaying), { once: true, passive: true });

  window.__RECALL_CLOCK_QC__ = Object.freeze({
    config: CONFIG,
    get scale() { return stageScale; },
    get time() { return partsNow(); },
    videoState: () => Object.fromEntries(Object.entries(videos).map(([kind, video]) => [kind, videoState(video)]))
  });
})();
