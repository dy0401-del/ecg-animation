(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CardiacAnimation = root.CardiacAnimation || {};
  root.CardiacAnimation.Design = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  return Object.freeze({
    id: "sinus-v24-visual-style",
    background: "#ffffff",
    canvas: Object.freeze({ width: 1808, height: 1488, heartHeight: 1088 }),
    heart: Object.freeze({ width: 768, height: 1088, left: 520, top: 0 }),
    ecg: Object.freeze({
      width: 1808,
      height: 400,
      top: 1088,
      smallBoxPx: 14,
      largeBoxPx: 70,
      paperSpeedMmPerSecond: 25,
      minorGrid: "#f8e1e4",
      majorGrid: "#edb7bd",
      trace: "#20282e",
      traceWidth: 3,
      baselineY: 239,
      amplitudeScale: 130
    }),
    typography: Object.freeze({
      fontStack: '"BIZ UDPGothic","BIZ UDPゴシック","Noto Sans JP","Yu Gothic","Meiryo",sans-serif',
      text: "#1F2933",
      heading: "#111827",
      support: "#374151"
    }),
    stageBadge: Object.freeze({
      fill: "#F1F5F9",
      stroke: "#CBD5E1",
      radius: 9
    }),
    labels: Object.freeze({ language: "ja", mode: "embedded-in-golden-frames" }),
    conduction: Object.freeze({
      restingPath: "thin-dark-yellow",
      excitation: "bright-moving-light-mass-with-short-afterglow",
      forbidGrowingThickPath: true
    })
  });
});
