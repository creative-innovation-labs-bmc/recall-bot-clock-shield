(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const ASSETS = window.RECALL_CLOCK_ASSETS || Object.freeze({
    mode: 'placeholder',
    hour: Object.freeze({ enabled: false, fallback: 'assets/videos/hour-placeholder.mp4', template: 'assets/hour/{value}.mp4' }),
    minute: Object.freeze({ enabled: false, fallback: 'assets/videos/minute-placeholder.mp4', template: 'assets/minute/{value}.mp4' }),
    second: Object.freeze({ enabled: false, fallback: 'assets/videos/second-placeholder.mp4', source: 'assets/second/seconds-00-59.mp4', cycleSeconds: 60 })
  });

  const CONFIG = Object.freeze({
    timeZone: 'Australia/Melbourne',
    nativeWidth: 3840,
    nativeHeight: 804,
    debug: params.get('debug') === '1',
    softDriftSeconds: 0.07,
    hardDriftSeconds: 0.18,
    softPlaybackRate: 0.02,
    syncIntervalMs: 250
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
  const activeSources = new Map();
  const syncStats = Object.fromEntries(Object.keys(videos).map(kind => [kind, {
    lastDriftMs: 0,
    lastAction: 'waiting',
    softCorrections: 0,
    hardCorrections: 0,
    lastCorrectionAt: 0,
    lastFrameSyncAt: 0
  }]));

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
      second: map.second.padStart(2, '0'),
      millisecond: Date.now() % 1000
    };
  }

  function assetSource(kind, now) {
    const definition = ASSETS[kind];
    if (!definition || !definition.enabled) return definition?.fallback || '';
    if (kind === 'second') return definition.source;
    return definition.template.replace('{value}', now[kind]);
  }

  function updateMediaSources(now) {
    Object.entries(videos).forEach(([kind, video]) => {
      const source = assetSource(kind, now);
      if (source && activeSources.get(kind) !== source) setVideoSource(kind, video, source, true);
    });
  }

  function renderClock(force = false) {
    const now = partsNow();
    const key = `${now.hour}:${now.minute}:${now.second}`;
    if (!force && key === lastRenderedSecond) return;
    lastRenderedSecond = key;

    updateMediaSources(now);
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

  function elapsedSeconds(kind, now) {
    const fraction = now.millisecond / 1000;
    if (kind === 'hour') return Number(now.minute) * 60 + Number(now.second) + fraction;
    return Number(now.second) + fraction;
  }

  function mediaCycle(kind, video) {
    const configured = kind === 'second' && ASSETS.second?.enabled ? Number(ASSETS.second.cycleSeconds) : 0;
    if (configured > 0) return configured;
    return Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
  }

  function targetMediaTime(kind, video, now = partsNow()) {
    const cycle = mediaCycle(kind, video);
    if (cycle <= 0) return 0;
    return elapsedSeconds(kind, now) % cycle;
  }

  function circularDifference(target, actual, duration) {
    let difference = target - actual;
    if (difference > duration / 2) difference -= duration;
    if (difference < -duration / 2) difference += duration;
    return difference;
  }

  function markAction(kind, action) {
    const stats = syncStats[kind];
    if (stats.lastAction !== action) {
      if (action === 'soft') stats.softCorrections += 1;
      if (action === 'seek') stats.hardCorrections += 1;
      stats.lastAction = action;
    }
  }

  function synchroniseVideo(kind, video, actualTime = video.currentTime, force = false) {
    if (document.hidden || video.readyState < 1 || video.seeking) return;
    const cycle = mediaCycle(kind, video);
    if (cycle <= 0) return;

    const target = targetMediaTime(kind, video);
    const drift = circularDifference(target, actualTime, cycle);
    const absoluteDrift = Math.abs(drift);
    const stats = syncStats[kind];
    stats.lastDriftMs = Math.round(drift * 1000);

    const now = performance.now();
    if ((force || absoluteDrift > CONFIG.hardDriftSeconds) && now - stats.lastCorrectionAt > 450) {
      video.playbackRate = 1;
      video.currentTime = target;
      stats.lastCorrectionAt = now;
      markAction(kind, 'seek');
      return;
    }

    if (absoluteDrift > CONFIG.softDriftSeconds) {
      video.playbackRate = drift > 0 ? 1 + CONFIG.softPlaybackRate : 1 - CONFIG.softPlaybackRate;
      markAction(kind, 'soft');
    } else {
      video.playbackRate = 1;
      markAction(kind, 'locked');
    }
  }

  function beginFrameSync(kind, video) {
    if (typeof video.requestVideoFrameCallback !== 'function') return;
    const watch = (_now, metadata) => {
      const stats = syncStats[kind];
      const timestamp = performance.now();
      if (timestamp - stats.lastFrameSyncAt >= CONFIG.syncIntervalMs) {
        stats.lastFrameSyncAt = timestamp;
        synchroniseVideo(kind, video, metadata.mediaTime);
      }
      video.requestVideoFrameCallback(watch);
    };
    video.requestVideoFrameCallback(watch);
  }

  function playbackQuality(video) {
    if (typeof video.getVideoPlaybackQuality !== 'function') return 'n/a';
    const quality = video.getVideoPlaybackQuality();
    return `${quality.droppedVideoFrames}/${quality.totalVideoFrames}`;
  }

  function videoState(kind, video) {
    const duration = Number.isFinite(video.duration) ? video.duration.toFixed(2) : '--';
    const current = Number.isFinite(video.currentTime) ? video.currentTime.toFixed(2) : '0.00';
    const stats = syncStats[kind];
    return `${video.readyState}/${video.networkState} ${video.paused ? 'paused' : 'playing'} ${current}/${duration}s rate ${video.playbackRate.toFixed(2)} drift ${stats.lastDriftMs}ms ${stats.lastAction} drop ${playbackQuality(video)}`;
  }

  function renderDebug(now = partsNow()) {
    if (!CONFIG.debug) return;
    const rect = stage.getBoundingClientRect();
    debugNode.hidden = false;
    debugNode.textContent = [
      `native ${CONFIG.nativeWidth}×${CONFIG.nativeHeight} | viewport ${innerWidth}×${innerHeight}`,
      `stage ${Math.round(rect.width)}×${Math.round(rect.height)} | scale ${stageScale.toFixed(4)}`,
      `assets ${ASSETS.mode} | Melbourne ${now.day} ${now.hour}:${now.minute}:${now.second}`,
      `hour   ${videoState('hour', videos.hour)}`,
      `minute ${videoState('minute', videos.minute)}`,
      `second ${videoState('second', videos.second)}`,
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

  function setVideoSource(kind, video, source, forceSync = false) {
    activeSources.set(kind, source);
    video.dataset.requestedSource = source;
    video.src = source;
    video.load();
    progress.set(video, { time: -1, checkedAt: performance.now() });
    const onMetadata = () => {
      synchroniseVideo(kind, video, video.currentTime, forceSync);
      ensurePlaying(video);
    };
    video.addEventListener('loadedmetadata', onMetadata, { once: true, passive: true });
    ensurePlaying(video);
  }

  function initialiseVideo(kind, video) {
    video.disablePictureInPicture = true;
    const fallback = ASSETS[kind]?.fallback || '';
    video.addEventListener('loadeddata', () => ensurePlaying(video), { passive: true });
    video.addEventListener('canplay', () => ensurePlaying(video), { passive: true });
    video.addEventListener('stalled', () => ensurePlaying(video), { passive: true });
    video.addEventListener('waiting', () => ensurePlaying(video), { passive: true });
    video.addEventListener('error', () => {
      if (fallback && activeSources.get(kind) !== fallback) setVideoSource(kind, video, fallback, true);
      renderDebug();
    }, { passive: true });
    setVideoSource(kind, video, fallback, true);
    beginFrameSync(kind, video);
  }

  function playbackWatchdog() {
    const now = performance.now();
    Object.entries(videos).forEach(([kind, video]) => {
      const previous = progress.get(video) || { time: -1, checkedAt: now };
      const advancing = Math.abs(video.currentTime - previous.time) > 0.01;
      if (advancing) {
        progress.set(video, { time: video.currentTime, checkedAt: now });
      } else if (!document.hidden && now - previous.checkedAt > 6000 && video.readyState >= 2) {
        ensurePlaying(video);
        synchroniseVideo(kind, video, video.currentTime, true);
        progress.set(video, { time: video.currentTime, checkedAt: now });
      }
      if (!document.hidden && video.paused && video.readyState >= 2) ensurePlaying(video);
      if (typeof video.requestVideoFrameCallback !== 'function') synchroniseVideo(kind, video);
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
      Object.entries(videos).forEach(([kind, video]) => {
        ensurePlaying(video);
        synchroniseVideo(kind, video, video.currentTime, true);
      });
    }
  }, { passive: true });
  window.addEventListener('pointerdown', () => Object.values(videos).forEach(ensurePlaying), { once: true, passive: true });

  window.__RECALL_CLOCK_QC__ = Object.freeze({
    config: CONFIG,
    assets: ASSETS,
    get scale() { return stageScale; },
    get time() { return partsNow(); },
    syncState: () => JSON.parse(JSON.stringify(syncStats)),
    videoState: () => Object.fromEntries(Object.entries(videos).map(([kind, video]) => [kind, videoState(kind, video)]))
  });
})();
