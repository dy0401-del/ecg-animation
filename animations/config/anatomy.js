(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CardiacAnimation = root.CardiacAnimation || {};
  root.CardiacAnimation.Anatomy = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  return Object.freeze({
    view: "realistic-cutaway-v24",
    coordinateSpace: Object.freeze({ width: 768, height: 1088 }),
    chambers: Object.freeze(["right-atrium", "left-atrium", "right-ventricle", "left-ventricle"]),
    conductionNodes: Object.freeze([
      Object.freeze({ id: "sa-node", label: "洞結節" }),
      Object.freeze({ id: "av-node", label: "房室結節" }),
      Object.freeze({ id: "his-bundle", label: "ヒス束" })
    ]),
    conductionPathways: Object.freeze([
      Object.freeze({ id: "bachmann-bundle", label: "Bachmann束" }),
      Object.freeze({ id: "internodal-pathways", label: "結節間路" }),
      Object.freeze({ id: "right-bundle-branch", label: "右脚" }),
      Object.freeze({ id: "left-bundle-branch", label: "左脚" }),
      Object.freeze({ id: "left-anterior-fascicle", label: "左脚前枝" }),
      Object.freeze({ id: "left-posterior-fascicle", label: "左脚後枝" }),
      Object.freeze({ id: "purkinje-network", label: "プルキンエ線維" })
    ]),
    goldenMasterPolicy: Object.freeze({
      anatomyAndLabelsAreProtected: true,
      sinusRenderer: "precomposed-frame-sequence",
      futureRhythms: "reuse-anatomy-and-label-layout; replace-only-physiology-layers"
    })
  });
});
