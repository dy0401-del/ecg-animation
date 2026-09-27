(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CardiacAnimation = root.CardiacAnimation || {};
  root.CardiacAnimation.Defaults = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  return Object.freeze({
    rhythm: "sinus",
    duration: Object.freeze({ totalSeconds: 5, fps: 60 }),
    heartRate: 60,
    lead: "II",
    output: Object.freeze({ format: "html", videoFormat: "mp4" })
  });
});
