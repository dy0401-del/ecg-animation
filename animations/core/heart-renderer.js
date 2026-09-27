(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CardiacAnimation = root.CardiacAnimation || {};
  root.CardiacAnimation.HeartRenderer = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  class HeartRenderer {
    constructor(config, design) {
      this.config = config;
      this.design = design;
      this.frames = [];
    }

    async preload() {
      const urls = this.config.renderModel && this.config.renderModel.heartFrames || [];
      if (typeof Image === "undefined") return [];
      this.frames = await Promise.all(urls.map(url => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Failed to load heart frame: " + url));
        image.src = url;
      })));
      return this.frames;
    }

    render(context, state) {
      if (!this.frames.length) throw new Error("Heart frames are not loaded.");
      const adapter = this.config.renderAdapters && this.config.renderAdapters.heart;
      if (typeof adapter === "function") {
        const rendered = adapter(context, state, this.config, this.design, this.frames);
        return Object.assign({ frameIndex: 0, mode: this.config.renderModel.mode }, rendered || {});
      }
      const geometry = this.design.heart;
      const index = Math.min(this.frames.length - 1, state.sourceFrame);
      context.drawImage(
        this.frames[index],
        geometry.left,
        geometry.top,
        geometry.width,
        geometry.height
      );
      return { frameIndex: index, mode: this.config.renderModel.mode };
    }
  }

  return { HeartRenderer };
});
