(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CardiacAnimation = root.CardiacAnimation || {};
  root.CardiacAnimation.EcgRenderer = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const SHAPE = Object.freeze({ p0: 0.07, p1: 0.17, q0: 0.25, q1: 0.34, t0: 0.48, t1: 0.68 });

  function lerp(a, b, progress) {
    return a + (b - a) * progress;
  }

  function mapTime(time, events, beatSeconds) {
    const times = [0, events.pStart, events.pEnd, events.qrsStart, events.qrsEnd, events.tStart, events.tEnd, beatSeconds];
    const positions = [0, SHAPE.p0, SHAPE.p1, SHAPE.q0, SHAPE.q1, SHAPE.t0, SHAPE.t1, 1];
    for (let index = 1; index < times.length; index += 1) {
      if (time <= times[index]) {
        const progress = Math.max(0, (time - times[index - 1]) / (times[index] - times[index - 1]));
        return lerp(positions[index - 1], positions[index], progress);
      }
    }
    return 1;
  }

  function amplitude(position) {
    if (position >= SHAPE.p0 && position <= SHAPE.p1) {
      return 0.18 * Math.sin(Math.PI * (position - SHAPE.p0) / (SHAPE.p1 - SHAPE.p0)) ** 2;
    }
    if (position >= SHAPE.q0 && position <= SHAPE.q1) {
      const points = [[0.25, 0], [0.262, -0.10], [0.276, 0], [0.290, 1.05], [0.301, 0], [0.314, -0.22], [0.340, 0]];
      for (let index = 1; index < points.length; index += 1) {
        if (position <= points[index][0]) {
          return lerp(points[index - 1][1], points[index][1],
            (position - points[index - 1][0]) / (points[index][0] - points[index - 1][0]));
        }
      }
    }
    if (position >= SHAPE.t0 && position <= SHAPE.t1) {
      const peak = 0.596;
      const progress = position < peak
        ? (position - SHAPE.t0) / (peak - SHAPE.t0)
        : (SHAPE.t1 - position) / (SHAPE.t1 - peak);
      return 0.32 * Math.sin(Math.PI * 0.5 * progress) ** 2;
    }
    return 0;
  }

  function stage(time, events) {
    if (time < events.pStart) return "洞結節発火";
    if (time < events.pEnd) return "P波｜両心房の脱分極";
    if (time < events.qrsStart) return "PR segment";
    if (time < events.qrsEnd) return "QRS｜両心室の脱分極";
    if (time < events.tStart) return "ST segment";
    if (time < events.tEnd) return "T波｜心室の再分極";
    return "TP segment";
  }

  function roundedRect(context, x, y, width, height, radius) {
    const value = Math.min(radius, width / 2, height / 2);
    context.beginPath(); context.moveTo(x + value, y); context.lineTo(x + width - value, y);
    context.quadraticCurveTo(x + width, y, x + width, y + value); context.lineTo(x + width, y + height - value);
    context.quadraticCurveTo(x + width, y + height, x + width - value, y + height); context.lineTo(x + value, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - value); context.lineTo(x, y + value);
    context.quadraticCurveTo(x, y, x + value, y); context.closePath();
  }

  class EcgRenderer {
    constructor(config, design) {
      this.config = config;
      this.design = design;
    }

    render(context, state) {
      const adapter = this.config.renderAdapters && this.config.renderAdapters.ecg;
      if (typeof adapter === "function") return adapter(context, state, this.config, this.design);
      const events = this.config.timing.events;
      const beatSeconds = state.rrIntervalMs / 1000;
      const time = state.beatPhase * beatSeconds;
      const progress = mapTime(time, events, beatSeconds);
      const totalBeats = this.config.rhythm.rrIntervalsMs.length;
      const beatIndex = Math.max(0, Math.min(totalBeats - 1, state.beatIndex - 1));
      const style = this.design.ecg;
      const panelWidth = style.width;
      const smallBox = style.smallBoxPx;
      const largeBox = smallBox * 5;
      const largeBoxesPerBeat = 5;
      const fontStack = this.design.typography.fontStack;

      context.fillStyle = "#ffffff"; context.fillRect(0, 0, panelWidth, style.height);
      context.fillStyle = "#111827"; context.font = "800 42px " + fontStack; context.fillText("Ⅱ", 28, 52);
      context.font = "700 34px " + fontStack; context.fillText(this.config.visual.ecgTitle, 92, 50);
      const stageText = stage(time, events);
      context.font = "700 30px " + fontStack;
      const stagePadX = 18;
      const stageWidth = Math.ceil(context.measureText(stageText).width) + stagePadX * 2;
      const stageX = panelWidth - 28 - stageWidth;
      const stageY = 7;
      const stageHeight = 52;
      context.fillStyle = "#F1F5F9"; roundedRect(context, stageX, stageY, stageWidth, stageHeight, 9); context.fill();
      context.strokeStyle = "#CBD5E1"; context.lineWidth = 1.5; context.stroke();
      context.fillStyle = "#111827"; context.textAlign = "right";
      context.fillText(stageText, panelWidth - 28 - stagePadX, 44); context.textAlign = "left";

      const left = 28;
      const right = left + totalBeats * largeBoxesPerBeat * largeBox;
      const top = 74;
      const bottom = 306;
      const baseline = 239;
      const scale = 130;
      context.fillStyle = "#fffdfd"; context.fillRect(left, top, right - left, bottom - top);
      for (let x = left, index = 0; x <= right; x += smallBox, index += 1) {
        context.beginPath(); context.moveTo(x, top); context.lineTo(x, bottom);
        context.strokeStyle = index % 5 === 0 ? "#edb7bd" : "#f8e1e4";
        context.lineWidth = index % 5 === 0 ? 1 : 0.65; context.stroke();
      }
      for (let y = top, index = 0; y <= bottom; y += smallBox, index += 1) {
        context.beginPath(); context.moveTo(left, y); context.lineTo(right, y);
        context.strokeStyle = index % 5 === 0 ? "#edb7bd" : "#f8e1e4";
        context.lineWidth = index % 5 === 0 ? 1 : 0.65; context.stroke();
      }

      context.save(); context.beginPath(); context.rect(left, top, right - left, bottom - top); context.clip();
      context.strokeStyle = "#20282e"; context.lineWidth = 3; context.lineJoin = "round"; context.lineCap = "butt"; context.beginPath();
      const sequenceEnd = beatIndex + progress;
      const end = Math.floor(sequenceEnd * 2400);
      for (let index = 0; index <= end; index += 1) {
        const sequencePosition = index / 2400;
        const localPosition = sequencePosition - Math.floor(sequencePosition);
        const normalizedPosition = sequencePosition / totalBeats;
        const x = left + normalizedPosition * (right - left);
        const y = baseline - amplitude(localPosition) * scale;
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      if (progress > 0) {
        context.lineTo(left + sequenceEnd / totalBeats * (right - left), baseline - amplitude(progress) * scale);
      }
      context.stroke(); context.restore();
      context.fillStyle = "#1F2933"; context.font = "700 26px " + fontStack;
      context.fillText(this.config.visual.ecgCaption, 28, 350);
      context.fillStyle = "#374151"; context.font = "600 22px " + fontStack;
      context.fillText(this.config.visual.ecgCalibration, 28, 385);
      return { time, progress, sequenceProgress: sequenceEnd / totalBeats, stage: stageText };
    }
  }

  return { EcgRenderer, SHAPE, mapTime, amplitude, stage };
});
