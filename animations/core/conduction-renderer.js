(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CardiacAnimation = root.CardiacAnimation || {};
  root.CardiacAnimation.ConductionRenderer = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function conductionStage(time, events) {
    if (time < events.pStart) return "sa-node";
    if (time < events.avStart) return "atrial-pathways";
    if (time < events.avEnd) return "av-node-delay";
    if (time < events.hisEnd) return "his-bundle";
    if (time < events.bundleEnd) return "bundle-branches-and-fascicles";
    if (time < events.qrsEnd) return "purkinje-and-ventricular-activation";
    return "resting";
  }

  class ConductionRenderer {
    constructor(config) {
      this.config = config;
    }

    render(context, state) {
      const stage = conductionStage(state.cycleSeconds, this.config.timing.events);
      // V24 contains the approved light-wave and pathway pixels in each protected
      // composite frame. Future rhythm adapters may provide this hook to draw
      // moving wavelets, reentry circuits, ectopic foci, or accessory pathways.
      const adapter = this.config.renderAdapters && this.config.renderAdapters.conduction;
      const rendered = typeof adapter === "function" ? adapter(context, state, this.config) : null;
      return Object.assign({ stage, embeddedInCompositeFrame: !adapter }, rendered || {});
    }
  }

  return { ConductionRenderer, conductionStage };
});
