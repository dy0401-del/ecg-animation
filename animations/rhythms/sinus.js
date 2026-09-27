(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CardiacAnimation = root.CardiacAnimation || {};
  root.CardiacAnimation.Rhythms = root.CardiacAnimation.Rhythms || {};
  root.CardiacAnimation.Rhythms.sinus = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const currentScriptUrl = typeof document !== "undefined" && document.currentScript
    ? document.currentScript.src
    : null;
  const frameBaseUrl = currentScriptUrl
    ? new URL("../assets/heart/sinus-v24/", currentScriptUrl).href
    : "assets/heart/sinus-v24/";
  const frameUrls = Array.from({ length: 120 }, (_, index) => {
    const filename = String(index).padStart(3, "0") + ".webp";
    return currentScriptUrl ? new URL(filename, frameBaseUrl).href : frameBaseUrl + filename;
  });

  const events = Object.freeze({
    saPeak: 0.035,
    pStart: 0.0375,
    pEnd: 0.2171,
    avStart: 0.2,
    avEnd: 0.34,
    hisStart: 0.325,
    hisEnd: 0.37,
    bundleStart: 0.37,
    bundleEnd: 0.46,
    qrsStart: 0.465,
    qrsEnd: 0.66,
    atrialContractionStart: 0.08,
    ventricularContractionStart: 0.47,
    tStart: 0.68,
    tEnd: 0.83,
    repolarizationTintStart: 0.62
  });

  return {
    id: "sinus",
    name: "正常洞調律",
    abbreviation: "NSR",
    duration: { totalSeconds: 5, fps: 60 },
    heartRate: { mode: "fixed", value: 60, min: null, max: null },
    rhythm: {
      regularity: "regular",
      cycleMode: "beat_based",
      rrIntervalsMs: [1000, 1000, 1000, 1000, 1000]
    },
    pacemakerOrigin: {
      type: "sinus_node",
      location: "right_atrial_superior_lateral_wall",
      dominant: true
    },
    saNode: { active: true, dominant: true },
    atrialActivation: {
      mode: "organized_radial_and_preferred_pathways",
      organized: true,
      pathways: ["right_atrium", "bachmann_bundle", "left_atrium", "internodal_pathways"],
      spreadPattern: "sa_node_to_both_atria_then_av_node",
      contractionEnabled: true,
      ecgSyncEvent: "pWave"
    },
    avNode: {
      conductionMode: "one_to_one",
      delayMode: "physiologic",
      conductionRatio: "1:1"
    },
    hisPurkinjeActivation: {
      enabled: true,
      mode: "his_to_bundle_branches_fascicles_and_purkinje",
      pathways: [
        "his_bundle",
        "right_bundle_branch",
        "left_bundle_branch",
        "left_anterior_fascicle",
        "left_posterior_fascicle",
        "purkinje_network"
      ]
    },
    ventricularActivation: {
      origin: "his_purkinje",
      mode: "organized_biventricular",
      qrsWidthMode: "normal",
      ecgSyncEvent: "qrs"
    },
    atrialContraction: { enabled: true, timing: "after_atrial_depolarization" },
    ventricularContraction: { enabled: true, timing: "after_ventricular_depolarization" },
    ecg: {
      lead: "II",
      pWave: { present: true, morphology: "upright_smooth", timing: "pWave" },
      prInterval: { present: true, durationMode: "physiologic" },
      qrs: { morphology: "normal_lead_II", widthMode: "normal", timing: "qrs" },
      stSegment: { morphology: "isoelectric" },
      tWave: {
        morphology: "upright_smooth",
        timing: "tWave",
        represents: "ventricular_repolarization"
      },
      baseline: { mode: "isoelectric" },
      rrPattern: { mode: "regular" }
    },
    timing: { units: "seconds-within-cycle", events },
    renderModel: {
      mode: "v24-golden-composite-frames",
      sourceFrameCount: 120,
      heartFrames: frameUrls,
      layersEmbedded: ["anatomy", "labels", "conduction", "activation", "contraction", "repolarization"],
      extensionLayerPolicy: "future rhythms may replace physiology layers but must retain anatomy and label layout"
    },
    visual: {
      designId: "sinus-v24-visual-style",
      ecgTitle: "正常洞調律",
      ecgCaption: "模式波形・HR 60回/分",
      ecgCalibration: "25 mm/秒相当｜1大マス＝0.20秒｜RR＝1.00秒（5大マス）",
      heartSourceSHA256: "ecac53844dbeadb54119482c17cfb2d6a565d42816882202f158d5d7476603de"
    },
    goldenMaster: {
      file: "reference-archive/正常洞調律_Ⅱ誘導同期_v24.html",
      status: "archived-reference",
      sha256: "054e3183315ac96b1a31c740116c0600346908098c4559548aeaa1189caf2ff9",
      protected: true
    }
  };
});
