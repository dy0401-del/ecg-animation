(() => {
  'use strict';
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d', { alpha: false });
  const count = Number(canvas.dataset.frames);
  const fps = Number(canvas.dataset.fps);
  const duration = count / fps;
  const folder = canvas.dataset.framePath;
  const toggle = document.getElementById('toggle');
  const reset = document.getElementById('reset');
  const speed = document.getElementById('speed');
  const loop = document.getElementById('loop');
  const seek = document.getElementById('seek');
  const status = document.getElementById('frame-status');
  const loading = document.getElementById('frame-loading');
  const blobs = new Array(count);
  const cache = new Map();
  const pending = new Map();
  let ready = false, playing = false, position = 0, previous = 0, shown = -1, rendering = false;
  const controls = [toggle, reset, speed, loop, seek];
  controls.forEach(control => { control.disabled = true; });
  seek.max = String(count - 1);
  function indexAt(seconds) { return Math.min(count - 1, Math.max(0, Math.floor(seconds * fps))); }
  function bitmap(index) {
    if (cache.has(index)) return Promise.resolve(cache.get(index));
    if (pending.has(index)) return pending.get(index);
    const task = createImageBitmap(blobs[index]).then(image => {
      cache.set(index, image);
      pending.delete(index);
      return image;
    });
    pending.set(index, task);
    return task;
  }
  function warm(index) {
    const keep = new Set([index]);
    for (let offset = 1; offset <= 12; offset++) {
      const next = index + offset;
      if (next < count || loop.checked) keep.add(next % count);
    }
    for (const [key, image] of cache) {
      if (!keep.has(key)) { image.close(); cache.delete(key); }
    }
    for (const key of keep) bitmap(key).catch(fail);
  }
  function fail(error) {
    playing = false;
    loading.hidden = false;
    loading.textContent = '画像の読込みに失敗しました。ページを再読込みしてください。';
    controls.forEach(control => { control.disabled = true; });
    console.error(error);
  }
  async function paint() {
    const index = indexAt(position);
    if (rendering) return;
    rendering = true;
    try {
      const image = await bitmap(index);
      // A seek or reset may have happened while the image was decoding.
      if (index === indexAt(position)) {
        ctx.drawImage(image, 0, 0);
        shown = index;
        seek.value = String(index);
        status.textContent = `${position.toFixed(2)} / ${duration.toFixed(2)} 秒`;
        warm(index);
      }
    } catch (error) { fail(error); }
    finally { rendering = false; }
  }
  function advance(now) {
    if (playing && previous) {
      position += (now - previous) / 1000 * Number(speed.value);
      if (position >= duration) {
        if (loop.checked) position %= duration;
        else { position = duration; playing = false; toggle.textContent = '再生'; }
      }
    }
    previous = now;
  }
  function tick(now) {
    if (ready) {
      advance(now);
      if (shown !== indexAt(position)) paint();
    }
    requestAnimationFrame(tick);
  }
  toggle.onclick = () => {
    advance(performance.now());
    if (!playing && position >= duration) position = 0;
    playing = !playing;
    toggle.textContent = playing ? '一時停止' : '再生';
  };
  reset.onclick = () => {
    position = 0; previous = performance.now(); playing = true;
    toggle.textContent = '一時停止'; paint();
  };
  speed.addEventListener('change', () => { previous = performance.now(); });
  seek.addEventListener('input', () => {
    position = Number(seek.value) / fps; previous = performance.now(); paint();
  });
  window.addEventListener('pagehide', () => { for (const image of cache.values()) image.close(); });
  (async () => {
    let next = 0, loaded = 0;
    async function worker() {
      while (next < count) {
        const index = next++;
        const response = await fetch(`${folder}/${String(index).padStart(3, '0')}.webp`);
        if (!response.ok) throw new Error(`Frame ${index}: ${response.status}`);
        blobs[index] = await response.blob();
        if (index === 0) {
          const image = await bitmap(0);
          ctx.drawImage(image, 0, 0);
          shown = 0;
        }
        loaded++;
        loading.textContent = `アニメーションを読み込み中… ${loaded} / ${count}`;
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker));
    await Promise.all(Array.from({ length: 13 }, (_, index) => bitmap(index)));
    await paint();
    ready = true; loading.hidden = true;
    controls.forEach(control => { control.disabled = false; });
    previous = performance.now(); requestAnimationFrame(tick);
  })().catch(fail);
})();
