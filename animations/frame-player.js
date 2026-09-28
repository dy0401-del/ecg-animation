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
  const controls = [toggle, reset, speed, loop, seek];
  const video = document.createElement('video');
  video.id = 'canvas-video-source';
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('tabindex', '-1');
  // Keep a tiny source surface composited for video-frame callbacks, without
  // showing a second player or native video controls to the learner.
  video.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0.001;pointer-events:none';
  canvas.after(video);
  controls.forEach(control => { control.disabled = true; });
  seek.max = String(count - 1);
  let callback = null;
  let lastPaintTime = -1;
  const videoCallbacks = typeof video.requestVideoFrameCallback === 'function';

  function paint(time = video.currentTime) {
    if (video.readyState < 2) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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
    try { await video.play(); }
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
  video.addEventListener('loadeddata', () => {
    video.playbackRate = Number(speed.value);
    video.loop = loop.checked;
    paint();
    loading.hidden = true;
    controls.forEach(control => { control.disabled = false; });
  });
  video.addEventListener('play', () => {
    toggle.textContent = '一時停止';
    loading.hidden = true;
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
    controls.forEach(control => { control.disabled = true; });
    loading.hidden = false;
    loading.textContent = '動画の読込みに失敗しました。ページを再読込みしてください。';
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
