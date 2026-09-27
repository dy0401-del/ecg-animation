(function () {
  "use strict";

  const namespace = window.CardiacAnimation;
  const query = new URLSearchParams(window.location.search);
  const request = Object.assign({}, window.CARDIAC_ANIMATION_REQUEST || {});
  if (query.has("rhythm")) request.rhythm = query.get("rhythm");
  if (query.has("heartRate")) request.heartRate = Number(query.get("heartRate"));
  if (query.has("duration")) request.duration = Number(query.get("duration"));
  if (query.has("fps")) request.fps = Number(query.get("fps"));
  if (query.has("seed")) request.seed = Number(query.get("seed"));

  const rhythmId = request.rhythm || namespace.Defaults.rhythm;
  const baseConfig = namespace.Rhythms[rhythmId];
  const loading = document.getElementById("loading");
  if (!baseConfig) {
    loading.textContent = "未対応の心調律です: " + rhythmId;
    return;
  }

  const config = namespace.RhythmEngine.applyOverrides(baseConfig, request);
  const design = config.visual && config.visual.design || namespace.Design;
  const canvas = document.getElementById("scene");
  canvas.width = design.canvas.width;
  canvas.height = design.canvas.height;
  canvas.style.aspectRatio = design.canvas.width + "/" + design.canvas.height;
  document.title = config.visual && config.visual.documentTitle || config.name + "とⅡ誘導心電図";
  canvas.setAttribute("aria-label", config.visual && config.visual.ariaLabel || "上段に" + config.name + "の心臓、下段にⅡ誘導心電図");
  const explanation = document.querySelector("#explanation p");
  if (explanation && config.visual && config.visual.explanation) explanation.textContent = config.visual.explanation;
  const context = canvas.getContext("2d");
  const panel = document.createElement("canvas");
  panel.width = design.ecg.width;
  panel.height = design.ecg.height;
  const panelContext = panel.getContext("2d");
  const engine = new namespace.RhythmEngine.CardiacRhythmEngine(
    config,
    design,
    context,
    panelContext
  );

  const play = document.getElementById("play");
  const reset = document.getElementById("reset");
  const seek = document.getElementById("seek");
  const speedControl = document.getElementById("speed");
  const status = document.getElementById("status");
  const totalDuration = engine.timeline.totalDurationMs;
  const frameCount = engine.timeline.frameCount;
  const exportMode = query.get("mode") === "export";
  const previewLoop = !exportMode;
  seek.max = String(frameCount - 1);

  let elapsedTime = 0;
  let previousTimestamp = null;
  let playing = true;
  let speed = config.visual.playbackRate || 1;
  if (config.visual.playbackRates) {
    speedControl.replaceChildren(...config.visual.playbackRates.map(rate => new Option(rate + "倍速", String(rate))));
  }
  if (!Array.from(speedControl.options).some(option => Number(option.value) === speed)) {
    speedControl.add(new Option(speed + "倍速", String(speed)));
  }
  speedControl.value = String(speed);
  let lastOutputFrame = -1;

  function renderElapsed(elapsed) {
    const state = engine.timeline.stateAt(elapsed);
    if (state.outputFrame === lastOutputFrame && !config.visual.playbackRate) return state;
    lastOutputFrame = state.outputFrame;
    const result = engine.renderAt(elapsed);
    seek.value = String(state.outputFrame);
    const totalBeats = config.timing && Array.isArray(config.timing.ventricularBeatTimes)
      ? config.timing.ventricularBeatTimes.length
      : engine.timeline.beats.length;
    status.value = state.timeSeconds.toFixed(2) + " / " + config.duration.totalSeconds.toFixed(2) +
      " 秒｜" + state.beatIndex + "/" + totalBeats + "拍";
    canvas.dataset.heartFrame = String(result.heart.frameIndex);
    canvas.dataset.ecgFrame = String(state.outputFrame);
    canvas.dataset.phase = String(state.beatPhase);
    canvas.dataset.beatPhase = String(state.beatPhase);
    canvas.dataset.ecgProgress = String(result.ecg.progress);
    canvas.dataset.ecgSequenceProgress = String(result.ecg.sequenceProgress);
    canvas.dataset.stage = result.ecg.stage;
    canvas.dataset.conductionStage = result.conduction.stage;
    canvas.dataset.activeAtrialWavelets = String(result.conduction.activeAtrialWavelets == null ? 0 : result.conduction.activeAtrialWavelets);
    canvas.dataset.avConducted = String(Boolean(result.conduction.avConducted));
    canvas.dataset.avBlocked = String(Boolean(result.conduction.avBlocked));
    canvas.dataset.avStatus = String(result.conduction.avStatus || "待機");
    canvas.dataset.atrialContraction = String(Boolean(result.contraction.atrial));
    canvas.dataset.mechanicalLayersSeparated = String(Boolean(result.mechanical.separated));
    canvas.dataset.ventricularContraction = String(Boolean(result.mechanical.ventricular.active));
    canvas.dataset.atrialLocalQuiver = String(Boolean(result.mechanical.atrial.active));
    canvas.dataset.ventricularContractionProgress = String(result.mechanical.ventricular.progress == null ? 0 : result.mechanical.ventricular.progress);
    canvas.dataset.pWavePresent = String(Boolean(result.ecg.pWavePresent == null ? config.ecg.pWave.present : result.ecg.pWavePresent));
    canvas.dataset.rightBundleBlocked = String(Boolean(result.conduction.rightBundleBlocked));
    canvas.dataset.rightBundleSignalPropagated = String(Boolean(result.conduction.rightBundleSignalPropagated));
    canvas.dataset.leftBundleConducted = String(Boolean(result.conduction.leftBundleConducted));
    canvas.dataset.transseptalToRightVentricle = String(Boolean(result.conduction.transseptalToRightVentricle));
    canvas.dataset.ventricularActivationOrder = String(result.ecg.ventricularActivationOrder || "");
    canvas.dataset.ecgLeads = Array.isArray(result.ecg.leads) ? result.ecg.leads.join(",") : String(config.ecg.lead || "");
    canvas.dataset.qrsWidthSeconds = String(result.ecg.qrsWidthSeconds == null ? "" : result.ecg.qrsWidthSeconds);
    canvas.dataset.qrsSmallBoxes = String(result.ecg.qrsSmallBoxes == null ? "" : result.ecg.qrsSmallBoxes);
    canvas.dataset.synchronizedLeadEvents = String(Boolean(result.ecg.synchronizedLeadEvents));
    canvas.dataset.terminalRPrimeHighlighted = String(Boolean(result.ecg.terminalRPrimeHighlighted));
    canvas.dataset.terminalSHighlighted = String(Boolean(result.ecg.terminalSHighlighted));
    canvas.dataset.canvasSize = canvas.width + "x" + canvas.height;
    return result;
  }

  function masterTimeline(timestamp) {
    if (previousTimestamp !== null && playing) {
      elapsedTime += (timestamp - previousTimestamp) * speed;
      if (elapsedTime >= totalDuration) {
        if (previewLoop) {
          elapsedTime %= totalDuration;
          lastOutputFrame = -1;
        } else {
          elapsedTime = totalDuration;
          playing = false;
          play.textContent = "再生";
        }
      }
    }
    previousTimestamp = timestamp;
    renderElapsed(elapsedTime);
    requestAnimationFrame(masterTimeline);
  }

  play.onclick = () => {
    playing = !playing;
    play.textContent = playing ? "一時停止" : "再生";
  };
  reset.onclick = () => {
    elapsedTime = 0;
    lastOutputFrame = -1;
    renderElapsed(elapsedTime);
  };
  seek.oninput = () => {
    playing = false;
    play.textContent = "再生";
    elapsedTime = Number(seek.value) * 1000 / config.duration.fps;
    lastOutputFrame = -1;
    renderElapsed(elapsedTime);
  };
  speedControl.onchange = event => {
    speed = Number(event.target.value);
  };
  document.addEventListener("visibilitychange", () => {
    previousTimestamp = null;
  });

  window.renderExportFrame = frameIndex => {
    if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= frameCount) {
      throw new RangeError("frameIndex must be 0.." + (frameCount - 1));
    }
    elapsedTime = frameIndex * 1000 / config.duration.fps;
    playing = false;
    lastOutputFrame = -1;
    return renderElapsed(elapsedTime);
  };

  window.cardiacAnimation = { config, engine, renderElapsed };
  window.renderExportTime = milliseconds => {
    elapsedTime = Math.max(0, Math.min(milliseconds, totalDuration));
    playing = false;
    lastOutputFrame = -1;
    return renderElapsed(elapsedTime);
  };
  engine.preload().then(() => {
    loading.remove();
    renderElapsed(0);
    window.__CARDIAC_READY__ = true;
    window.dispatchEvent(new CustomEvent("cardiac-animation-ready"));
    requestAnimationFrame(masterTimeline);
  }).catch(error => {
    loading.textContent = "画像を読み込めませんでした。ファイルを開き直してください。";
    loading.dataset.error = error.message;
  });
})();
