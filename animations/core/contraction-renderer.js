(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CardiacAnimation = root.CardiacAnimation || {};
  root.CardiacAnimation.ContractionRenderer = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function contractionState(time, events, config) {
    return {
      atrial: Boolean(config.atrialContraction.enabled) &&
        time >= events.atrialContractionStart && time < events.qrsStart,
      ventricular: Boolean(config.ventricularContraction.enabled) &&
        time >= events.ventricularContractionStart && time < events.tEnd
    };
  }

  class ContractionRenderer {
    constructor(config) {
      this.config = config;
    }

    render(context, state) {
      const contraction = contractionState(state.cycleSeconds, this.config.timing.events, this.config);
      const adapter = this.config.renderAdapters && this.config.renderAdapters.contraction;
      const rendered = typeof adapter === "function" ? adapter(context, state, contraction, this.config) : null;
      return Object.assign({ embeddedInCompositeFrame: !adapter }, contraction, rendered || {});
    }
  }

  return { ContractionRenderer, contractionState };
});
