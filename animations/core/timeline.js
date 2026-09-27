(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CardiacAnimation = root.CardiacAnimation || {};
  root.CardiacAnimation.Timeline = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function positiveNumber(value, fallback) {
    return Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
  }

  function fixedRrMs(config) {
    return 60000 / positiveNumber(config.heartRate && config.heartRate.value, 60);
  }

  function buildBeatSchedule(config) {
    const totalMs = positiveNumber(config.duration && config.duration.totalSeconds, 5) * 1000;
    const declared = config.rhythm && Array.isArray(config.rhythm.rrIntervalsMs)
      ? config.rhythm.rrIntervalsMs.map(Number).filter(value => value > 0)
      : [];
    const fallback = fixedRrMs(config);
    const intervals = [];
    let elapsed = 0;
    let index = 0;
    while (elapsed < totalMs - 1e-8) {
      const next = declared.length ? declared[index % declared.length] : fallback;
      const duration = Math.min(next, totalMs - elapsed);
      intervals.push({ index, startMs: elapsed, durationMs: duration, nominalRrMs: next });
      elapsed += duration;
      index += 1;
      if (index > 10000) throw new Error("Beat schedule exceeded 10,000 events.");
    }
    return Object.freeze(intervals.map(Object.freeze));
  }

  class TimelineEngine {
    constructor(config) {
      this.config = config;
      this.totalDurationMs = positiveNumber(config.duration && config.duration.totalSeconds, 5) * 1000;
      this.fps = positiveNumber(config.duration && config.duration.fps, 60);
      this.frameCount = Math.round(this.totalDurationMs * this.fps / 1000);
      this.beats = buildBeatSchedule(config);
      this.ventricularEventTimesMs = config.rhythm && config.rhythm.cycleMode === "event_based" &&
        config.timing && Array.isArray(config.timing.ventricularBeatTimes)
        ? Object.freeze(config.timing.ventricularBeatTimes.map(value => Number(value) * 1000))
        : null;
    }

    stateAt(elapsedTimeMs) {
      const clamped = Math.max(0, Math.min(Number(elapsedTimeMs) || 0, this.totalDurationMs));
      let beat = this.beats[this.beats.length - 1];
      for (const candidate of this.beats) {
        if (clamped < candidate.startMs + candidate.durationMs || candidate === beat) {
          beat = candidate;
          break;
        }
      }
      const localMs = clamped >= this.totalDurationMs
        ? 0
        : Math.max(0, clamped - beat.startMs);
      const cyclePositionMs = this.config.rhythm && this.config.rhythm.regularity === "regular"
        ? ((clamped % beat.nominalRrMs) + beat.nominalRrMs) % beat.nominalRrMs
        : localMs % beat.nominalRrMs;
      const beatPhase = beat.nominalRrMs > 0 ? cyclePositionMs / beat.nominalRrMs : 0;
      const outputFrame = Math.min(
        this.frameCount - 1,
        Math.floor(Math.max(0, Math.min(clamped, this.totalDurationMs - 1e-8)) * this.fps / 1000)
      );
      const sourceFrameCount = this.config.renderModel && this.config.renderModel.sourceFrameCount || this.frameCount;
      const sourceFrame = Math.min(sourceFrameCount - 1, Math.floor(beatPhase * sourceFrameCount + 1e-8));
      if (this.ventricularEventTimesMs) {
        let previousIndex = -1;
        for (let index = 0; index < this.ventricularEventTimesMs.length; index += 1) {
          if (this.ventricularEventTimesMs[index] <= clamped + 1e-8) previousIndex = index;
          else break;
        }
        const previousMs = previousIndex >= 0 ? this.ventricularEventTimesMs[previousIndex] : null;
        const nextMs = previousIndex + 1 < this.ventricularEventTimesMs.length
          ? this.ventricularEventTimesMs[previousIndex + 1]
          : null;
        return {
          elapsedTimeMs: clamped,
          timeSeconds: clamped / 1000,
          outputFrame,
          beatIndex: previousIndex + 1,
          beatPhase: previousMs == null || nextMs == null ? 0 : (clamped - previousMs) / (nextMs - previousMs),
          phase: previousMs == null || nextMs == null ? 0 : (clamped - previousMs) / (nextMs - previousMs),
          cycleSeconds: previousMs == null ? clamped / 1000 : (clamped - previousMs) / 1000,
          rrIntervalMs: previousMs != null && nextMs != null ? nextMs - previousMs : null,
          beatStartMs: previousMs,
          sourceFrame: 0,
          previousVentricularEventSeconds: previousMs == null ? null : previousMs / 1000,
          nextVentricularEventSeconds: nextMs == null ? null : nextMs / 1000,
          timeSinceVentricularEventSeconds: previousMs == null ? null : (clamped - previousMs) / 1000
        };
      }
      return {
        elapsedTimeMs: clamped,
        timeSeconds: clamped / 1000,
        outputFrame,
        beatIndex: Math.min(this.beats.length, beat.index + 1),
        beatPhase,
        phase: beatPhase,
        cycleSeconds: beatPhase * beat.nominalRrMs / 1000,
        rrIntervalMs: beat.nominalRrMs,
        beatStartMs: beat.startMs,
        sourceFrame
      };
    }
  }

  return { TimelineEngine, buildBeatSchedule };
});
