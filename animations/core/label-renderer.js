(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CardiacAnimation = root.CardiacAnimation || {};
  root.CardiacAnimation.LabelRenderer = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  class LabelRenderer {
    constructor(config) {
      this.config = config;
    }

    render(context, state) {
      const adapter = this.config.renderAdapters && this.config.renderAdapters.labels;
      const rendered = typeof adapter === "function" ? adapter(context, state, this.config) : null;
      return Object.assign({ language: "ja", embeddedInCompositeFrame: !adapter }, rendered || {});
    }
  }

  return { LabelRenderer };
});
