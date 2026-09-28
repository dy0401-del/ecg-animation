(() => {
  'use strict';
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d', { alpha: false });
  const fps = Number(canvas.dataset.fps);
  const count = Number(canvas.dataset.frames);
  const toggle = document.getElementById('toggle');
  const reset = document.getElementById('reset');
  const speed = document.getElementById('speed');
  const loop = document.getElementById('loop');
  const seek = document.getElementById('seek');
  const status = document.getElementById('frame-status');
  const loading = document.getElementById('frame-loading');
  const video = document.createElement('video');
  video.id = 'canvas-video-source';
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('tabindex', '-1');
  // Keep a tiny source surface composited for video-frame callbacks, without
  // showing a second player or native video controls to the learner.
  video.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0.001;pointer-events:none';
  canvas.after(video);
  // A tap must be possible even when Safari refuses to preload a first frame.
  toggle.disabled = speed.disabled = loop.disabled = false;
  reset.disabled = seek.disabled = true;
  loading.hidden = false;
  loading.textContent = '「再生」をタップするとアニメーションを読み込みます。';
  video.playbackRate = Number(speed.value);
  video.loop = loop.checked;
  seek.max = String(count - 1);
  let callback = null;
  let lastPaintTime = -1;
  let drawnFrames = 0, sampleFrames = 0, sampleStart = performance.now();
  const videoCallbacks = typeof video.requestVideoFrameCallback === 'function';

  function paint(time = video.currentTime) {
    if (video.readyState < 2) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    drawnFrames++;
    const now = performance.now();
    if (now - sampleStart >= 1000) {
      // Lightweight DOM diagnostics make sustained playback measurable without
      // exposing native video controls or retaining any frame images.
      canvas.dataset.drawnFrames = String(drawnFrames);
      canvas.dataset.renderedFps = ((drawnFrames - sampleFrames) * 1000 / (now - sampleStart)).toFixed(1);
      if (typeof video.getVideoPlaybackQuality === 'function') {
        const quality = video.getVideoPlaybackQuality();
        canvas.dataset.totalVideoFrames = String(quality.totalVideoFrames);
        canvas.dataset.droppedVideoFrames = String(quality.droppedVideoFrames);
      }
      sampleFrames = drawnFrames; sampleStart = now;
    }
    lastPaintTime = time;
    seek.value = String(Math.min(count - 1, Math.max(0, Math.floor(time * fps))));
    status.textContent = `${time.toFixed(2)} / ${video.duration.toFixed(2)} 秒`;
  }
  function stopDrawing() {
    if (callback === null) return;
    if (videoCallbacks) video.cancelVideoFrameCallback(callback);
    else cancelAnimationFrame(callback);
    callback = null;
  }
  function schedule() {
    if (callback !== null || video.paused || video.ended || document.hidden) return;
    if (videoCallbacks) {
      callback = video.requestVideoFrameCallback((now, metadata) => {
        callback = null;
        paint(metadata.mediaTime);
        schedule();
      });
    } else {
      callback = requestAnimationFrame(() => {
        callback = null;
        if (video.currentTime !== lastPaintTime) paint();
        schedule();
      });
    }
  }
  async function play() {
    loading.hidden = false;
    loading.textContent = 'アニメーションを読み込み中…';
    try {
      if (video.error) video.load();
      // Call play synchronously from the click handler, before any await, so
      // iPhone Safari retains the user's media-playback activation.
      await video.play();
    }
    catch (error) {
      toggle.textContent = '再生';
      loading.hidden = false;
      loading.textContent = '再生を開始できませんでした。再生ボタンをもう一度押してください。';
      console.error(error);
    }
  }
  toggle.onclick = () => {
    if (video.paused) {
      if (video.ended) video.currentTime = 0;
      play();
    } else video.pause();
  };
  reset.onclick = () => { video.currentTime = 0; play(); };
  speed.addEventListener('change', () => { video.playbackRate = Number(speed.value); });
  loop.addEventListener('change', () => { video.loop = loop.checked; });
  seek.addEventListener('input', () => { video.currentTime = Number(seek.value) / fps; });
  function updateReadiness() {
    reset.disabled = seek.disabled = video.readyState < 1;
    if (video.readyState < 2) return;
    paint();
    loading.hidden = true;
    schedule();
  }
  video.addEventListener('loadedmetadata', updateReadiness);
  video.addEventListener('loadeddata', updateReadiness);
  video.addEventListener('canplay', updateReadiness);
  video.addEventListener('playing', updateReadiness);
  video.addEventListener('play', () => {
    toggle.textContent = '一時停止';
    updateReadiness();
    sampleStart = performance.now(); sampleFrames = drawnFrames;
    schedule();
  });
  video.addEventListener('pause', () => {
    toggle.textContent = '再生';
    stopDrawing();
    paint();
  });
  video.addEventListener('ended', () => {
    toggle.textContent = '再生';
    stopDrawing();
    paint();
  });
  video.addEventListener('seeked', () => { paint(); schedule(); });
  video.addEventListener('error', () => {
    video.pause();
    stopDrawing();
    reset.disabled = seek.disabled = true;
    toggle.disabled = false;
    loading.hidden = false;
    loading.textContent = '動画の読込みに失敗しました。「再生」をタップして再試行してください。';
    console.error(video.error);
  });
  document.addEventListener('visibilitychange', () => {
    stopDrawing();
    if (!document.hidden) { paint(); schedule(); }
  });
  window.addEventListener('pagehide', () => { video.pause(); stopDrawing(); });
  window.addEventListener('pageshow', () => { paint(); });
  video.src = canvas.dataset.videoSource;
})();
