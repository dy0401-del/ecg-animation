(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CardiacAnimation = root.CardiacAnimation || {};
  root.CardiacAnimation.MechanicalRenderer = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  class MechanicalRenderer {
    constructor(config, design, heartRenderer) {
      this.config = config;
      this.design = design;
      this.heartRenderer = heartRenderer;
    }

    render(context, state) {
      const adapters = this.config.renderAdapters || {};
      const frames = this.heartRenderer.frames;
      const atrialAdapter = adapters.atrialMechanical;
      const ventricularAdapter = adapters.ventricularMechanical;
      const atrial = typeof atrialAdapter === "function"
        ? atrialAdapter(context, state, this.config, this.design, frames) || {}
        : { active: false, mode: "none" };
      const ventricular = typeof ventricularAdapter === "function"
        ? ventricularAdapter(context, state, this.config, this.design, frames) || {}
        : { active: false, progress: 0, mode: "none" };
      return {
        separated: typeof atrialAdapter === "function" &&
          typeof ventricularAdapter === "function" &&
          atrialAdapter !== ventricularAdapter,
        atrial,
        ventricular
      };
    }
  }

  return { MechanicalRenderer };
});
