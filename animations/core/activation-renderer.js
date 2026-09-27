(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CardiacAnimation = root.CardiacAnimation || {};
  root.CardiacAnimation.ActivationRenderer = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function activationState(time, events) {
    return {
      atrial: time >= events.pStart && time < events.pEnd,
      avDelay: time >= events.avStart && time < events.avEnd,
      ventricular: time >= events.qrsStart && time < events.qrsEnd,
      ventricularRepolarization: time >= events.tStart && time < events.tEnd
    };
  }

  class ActivationRenderer {
    constructor(config) {
      this.config = config;
    }

    render(context, state) {
      const activation = activationState(state.cycleSeconds, this.config.timing.events);
      const adapter = this.config.renderAdapters && this.config.renderAdapters.activation;
      const rendered = typeof adapter === "function" ? adapter(context, state, activation, this.config) : null;
      return Object.assign({ embeddedInCompositeFrame: !adapter }, activation, rendered || {});
    }
  }

  return { ActivationRenderer, activationState };
});
