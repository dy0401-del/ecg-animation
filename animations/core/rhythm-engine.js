(function (root, factory) {
  const api = factory(root.CardiacAnimation || {});
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CardiacAnimation = root.CardiacAnimation || {};
  root.CardiacAnimation.RhythmEngine = api;
})(typeof window !== "undefined" ? window : globalThis, function (namespace) {
  "use strict";

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === "object") {
      const copy = {};
      for (const [key, item] of Object.entries(value)) copy[key] = clone(item);
      return copy;
    }
    return value;
  }

  function applyOverrides(baseConfig, overrides) {
    const config = clone(baseConfig);
    const requested = overrides || {};
    if (requested.duration != null) config.duration.totalSeconds = Number(requested.duration);
    if (requested.fps != null) config.duration.fps = Number(requested.fps);
    if (requested.heartRate != null) {
      const heartRate = Number(requested.heartRate);
      if (typeof config.buildEventSchedule === "function") {
        config.buildEventSchedule(config, {
          heartRate,
          duration: config.duration.totalSeconds,
          seed: requested.seed
        });
      } else {
        config.heartRate.value = heartRate;
        const rr = 60000 / heartRate;
        const beatCount = Math.ceil(config.duration.totalSeconds * 1000 / rr);
        config.rhythm.rrIntervalsMs = Array.from({ length: beatCount }, () => rr);
        config.visual.ecgCaption = "模式波形・HR " + heartRate + "回/分";
        config.visual.ecgCalibration = "25 mm/秒相当｜1大マス＝0.20秒｜RR＝" + (rr / 1000).toFixed(2) + "秒";
      }
    }
    if (requested.duration != null && requested.heartRate == null && typeof config.buildEventSchedule === "function") {
      config.buildEventSchedule(config, {
        heartRate: config.heartRate.value,
        duration: config.duration.totalSeconds,
        seed: requested.seed
      });
    } else if (requested.duration != null && requested.heartRate == null) {
      const rr = 60000 / config.heartRate.value;
      const beatCount = Math.ceil(config.duration.totalSeconds * 1000 / rr);
      config.rhythm.rrIntervalsMs = Array.from({ length: beatCount }, () => rr);
    }
    return config;
  }

  class CardiacRhythmEngine {
    constructor(config, design, sceneContext, ecgContext) {
      this.config = config;
      this.design = design;
      this.sceneContext = sceneContext;
      this.ecgContext = ecgContext;
      this.timeline = new namespace.Timeline.TimelineEngine(config);
      this.heart = new namespace.HeartRenderer.HeartRenderer(config, design);
      this.mechanical = new namespace.MechanicalRenderer.MechanicalRenderer(config, design, this.heart);
      this.conduction = new namespace.ConductionRenderer.ConductionRenderer(config);
      this.activation = new namespace.ActivationRenderer.ActivationRenderer(config);
      this.contraction = new namespace.ContractionRenderer.ContractionRenderer(config);
      this.labels = new namespace.LabelRenderer.LabelRenderer(config);
      this.ecg = new namespace.EcgRenderer.EcgRenderer(config, design);
    }

    async preload() {
      return this.heart.preload();
    }

    renderAt(elapsedTimeMs) {
      const state = this.timeline.stateAt(elapsedTimeMs);
      const heart = this.heart.render(this.sceneContext, state);
      const mechanical = this.mechanical.render(this.sceneContext, state);
      const conduction = this.conduction.render(this.sceneContext, state);
      const activation = this.activation.render(this.sceneContext, state);
      const contraction = this.contraction.render(this.sceneContext, state);
      const labels = this.labels.render(this.sceneContext, state);
      const ecg = this.ecg.render(this.ecgContext, state);
      this.sceneContext.drawImage(
        this.ecgContext.canvas,
        this.design.ecg.left || 0,
        this.design.ecg.top || 0
      );
      return { state, heart, mechanical, conduction, activation, contraction, labels, ecg };
    }
  }

  return { CardiacRhythmEngine, applyOverrides, clone };
});
