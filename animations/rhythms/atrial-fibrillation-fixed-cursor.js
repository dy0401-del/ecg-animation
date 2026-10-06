(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CardiacAnimation = root.CardiacAnimation || {};
  root.CardiacAnimation.Rhythms = root.CardiacAnimation.Rhythms || {};
  root.CardiacAnimation.Rhythms["atrial-fibrillation"] = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const DEFAULT_SEED = 20260915;
  const DEFAULT_BEAT_TIMES = Object.freeze([0.18, 1.02, 2.12, 3.05, 4.18]);
  const FAST_AF_110_BEAT_TIMES = Object.freeze([0.18, 0.70, 1.30, 1.78, 2.34, 2.84, 3.49, 3.98, 4.55]);
  const currentScriptUrl = typeof document !== "undefined" && document.currentScript
    ? document.currentScript.src
    : null;
  const restingFrame = currentScriptUrl
    ? new URL("../assets/heart/sinus-v24/000.webp", currentScriptUrl).href
    : "assets/heart/sinus-v24/000.webp";

  function mulberry32(seed) {
    let value = seed >>> 0;
    return function () {
      value += 0x6D2B79F5;
      let result = value;
      result = Math.imul(result ^ result >>> 15, result | 1);
      result ^= result + Math.imul(result ^ result >>> 7, result | 61);
      return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
  }

  function round(value, digits) {
    const scale = 10 ** (digits || 0);
    return Math.round(value * scale) / scale;
  }

  function makeBeatTimes(heartRate, duration, seed) {
    if (heartRate === 60 && duration === 5 && seed === DEFAULT_SEED) return DEFAULT_BEAT_TIMES.slice();
    if (heartRate === 110 && duration === 5 && seed === DEFAULT_SEED) return FAST_AF_110_BEAT_TIMES.slice();
    const random = mulberry32(seed);
    const mean = 60 / Math.max(35, Math.min(190, heartRate));
    const minimum = Math.max(0.38, mean * 0.72);
    const maximum = Math.min(1.25, mean * 1.34);
    const endGuard = 0.43;
    const times = [Math.min(0.18, Math.max(0.08, duration * 0.04))];
    let previous = null;
    while (times[times.length - 1] < duration - endGuard) {
      let interval = minimum + random() * (maximum - minimum);
      if (previous != null && Math.abs(interval - previous) < 0.045) {
        interval = interval + (interval < mean ? -0.055 : 0.055);
      }
      interval = Math.max(minimum, Math.min(maximum, interval));
      const next = round(times[times.length - 1] + interval, 3);
      if (next > duration - endGuard) break;
      times.push(next);
      previous = interval;
      if (times.length > 100) break;
    }
    return times;
  }

  function makeWavelets(seed, duration) {
    const random = mulberry32(seed ^ 0xA51F1B);
    const wavelets = [];
    let start = -0.75;
    let index = 0;
    while (start < duration) {
      const leftAtrium = index % 2 === 1;
      const centerX = leftAtrium ? 545 : 230;
      const centerY = leftAtrium ? 390 : 390;
      const angle = random() * Math.PI * 2;
      const radiusX = leftAtrium ? 82 : 92;
      const radiusY = 74;
      const x = centerX + Math.cos(angle) * radiusX * (0.22 + random() * 0.54);
      const y = centerY + Math.sin(angle) * radiusY * (0.18 + random() * 0.52);
      const direction = random() * Math.PI * 2;
      const distance = 72 + random() * 76;
      wavelets.push(Object.freeze({
        id: index,
        chamber: leftAtrium ? "left_atrium" : "right_atrium",
        start: round(start, 3),
        lifetime: round(0.48 + random() * 0.18, 3),
        x: round(x, 2),
        y: round(y, 2),
        dx: round(Math.cos(direction) * distance, 2),
        dy: round(Math.sin(direction) * distance, 2),
        curve: round((random() - 0.5) * 108, 2),
        radius: round(5.5 + random() * 3, 2)
      }));
      start += 0.085 + random() * 0.035;
      index += 1;
    }
    return Object.freeze(wavelets);
  }

  function makeAvImpulses(seed, duration, beatTimes) {
    const random = mulberry32(seed ^ 0x7A11CE);
    const impulses = [];
    let time = -0.08;
    let index = 0;
    while (time < duration) {
      impulses.push(Object.freeze({
        time: round(time, 3),
        sourceX: index % 2 ? 492 + random() * 92 : 238 + random() * 86,
        sourceY: 420 + random() * 62,
        conducted: false
      }));
      time += 0.11 + random() * 0.10;
      index += 1;
    }
    for (const beatTime of beatTimes) {
      impulses.push(Object.freeze({
        time: round(Math.max(0, beatTime - 0.16), 3),
        sourceX: 290 + random() * 230,
        sourceY: 430 + random() * 54,
        conducted: true
      }));
    }
    return Object.freeze(impulses.sort((a, b) => a.time - b.time));
  }

  function nearestBeatDelta(time, beatTimes) {
    let best = Infinity;
    for (const eventTime of beatTimes) {
      const delta = time - eventTime;
      if (Math.abs(delta) < Math.abs(best)) best = delta;
    }
    return best;
  }

  function previousBeatDelta(time, beatTimes) {
    let previous = null;
    for (const eventTime of beatTimes) {
      if (eventTime > time) break;
      previous = eventTime;
    }
    return previous == null ? Infinity : time - previous;
  }

  function smoothStep(value) {
    const progress = Math.max(0, Math.min(1, value));
    return progress * progress * (3 - 2 * progress);
  }

  function contractionProgress(time, beatTimes) {
    const delta = previousBeatDelta(time, beatTimes);
    if (delta < 0.10 || delta > 0.34) return 0;
    if (delta < 0.20) return smoothStep((delta - 0.10) / 0.10);
    return 1 - smoothStep((delta - 0.20) / 0.14);
  }

  function irregularMotion(time, patch) {
    const primary = Math.sin(time * Math.PI * 2 * patch.frequency + patch.phase);
    const secondary = Math.sin(time * Math.PI * 2 * patch.frequency * 1.71 + patch.phase * 0.57 + 1.3);
    const tertiary = Math.cos(time * Math.PI * 2 * patch.frequency * 0.63 + patch.phase * 1.41);
    return primary * 0.56 + secondary * 0.29 + tertiary * 0.15;
  }

  function drawLocalizedWallDeformation(context, image, geometry, time, patch) {
    const motion = irregularMotion(time, patch);
    const crossMotion = irregularMotion(time + 0.037, Object.assign({}, patch, {
      frequency: patch.frequency * 1.13,
      phase: patch.phase + 0.91
    }));
    const shiftX = motion * patch.amplitudeX;
    const shiftY = crossMotion * patch.amplitudeY;
    const scaleX = 1 + motion * patch.scaleX;
    const scaleY = 1 + crossMotion * patch.scaleY;
    const centerX = geometry.left + patch.x;
    const centerY = geometry.top + patch.y;

    context.save();
    context.beginPath();
    context.ellipse(centerX, centerY, patch.rx, patch.ry, patch.rotation, 0, Math.PI * 2);
    context.clip();
    context.fillStyle = "#ffffff";
    context.fillRect(centerX - patch.rx - 10, centerY - patch.ry - 10, patch.rx * 2 + 20, patch.ry * 2 + 20);
    context.translate(centerX + shiftX, centerY + shiftY);
    context.scale(scaleX, scaleY);
    context.translate(-centerX, -centerY);
    context.drawImage(image, geometry.left, geometry.top, geometry.width, geometry.height);
    context.restore();
  }

  function drawBaseHeart(context, state, config, design, frames) {
    const geometry = design.heart;
    const image = frames[0];
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, design.canvas.width, design.canvas.heartHeight);
    context.drawImage(image, geometry.left, geometry.top, geometry.width, geometry.height);
    // 洞結節は解剖学的に残すが、AFの支配的発火源には見せない。
    context.save();
    context.globalAlpha = 0.76;
    context.fillStyle = "#873f36";
    context.beginPath();
    context.ellipse(geometry.left + 188, geometry.top + 277, 20, 15, -0.2, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return { frameIndex: 0, mode: "base-anatomy-only" };
  }

  function drawAtrialMechanical(context, state, config, design, frames) {
    const geometry = design.heart;
    const image = frames[0];
    const activity = config.atrialMechanicalActivity;
    const patches = [
      { chamber: "right_atrium", region: "lateral_wall", x: 114, y: 402, rx: 66, ry: 142, rotation: -0.13, phase: 0.10, frequency: 4.1, amplitudeX: 6.6, amplitudeY: 4.0, scaleX: 0.013, scaleY: 0.010 },
      { chamber: "right_atrium", region: "inferior_wall", x: 245, y: 482, rx: 105, ry: 54, rotation: 0.17, phase: 1.80, frequency: 5.7, amplitudeX: 5.0, amplitudeY: 4.7, scaleX: 0.010, scaleY: 0.014 },
      { chamber: "right_atrium", region: "superior_wall", x: 222, y: 313, rx: 76, ry: 55, rotation: -0.16, phase: 3.15, frequency: 6.4, amplitudeX: 4.6, amplitudeY: 3.8, scaleX: 0.009, scaleY: 0.012 },
      { chamber: "left_atrium", region: "lateral_wall", x: 666, y: 405, rx: 66, ry: 140, rotation: 0.13, phase: 4.60, frequency: 4.8, amplitudeX: 6.4, amplitudeY: 4.1, scaleX: 0.013, scaleY: 0.010 },
      { chamber: "left_atrium", region: "inferior_wall", x: 536, y: 482, rx: 105, ry: 54, rotation: -0.17, phase: 5.55, frequency: 5.9, amplitudeX: 5.0, amplitudeY: 4.7, scaleX: 0.010, scaleY: 0.014 },
      { chamber: "left_atrium", region: "superior_wall", x: 558, y: 314, rx: 76, ry: 55, rotation: 0.16, phase: 2.45, frequency: 6.7, amplitudeX: 4.5, amplitudeY: 3.8, scaleX: 0.009, scaleY: 0.012 }
    ];
    for (const patch of patches) drawLocalizedWallDeformation(context, image, geometry, state.timeSeconds, patch);
    return {
      active: true,
      mode: activity.mode,
      organized: false,
      chambers: ["right_atrium", "left_atrium"],
      independentlyRendered: true,
      patchCount: patches.length
    };
  }

  function drawVentricularMechanical(context, state, config, design, frames) {
    const progress = contractionProgress(state.timeSeconds, config.timing.ventricularBeatTimes);
    if (progress <= 0) {
      return {
        active: false,
        progress: 0,
        mode: "resting_between_qrs",
        independentlyRendered: true
      };
    }
    const geometry = design.heart;
    const image = frames[0];
    const shrinkX = 1 - 0.042 * progress;
    const shrinkY = 1 - 0.060 * progress;
    const sourceTop = 505;
    const sourceHeight = geometry.height - sourceTop;
    context.save();
    context.beginPath();
    context.moveTo(geometry.left, geometry.top + sourceTop);
    context.lineTo(geometry.left, geometry.top + geometry.height);
    context.lineTo(geometry.left + geometry.width, geometry.top + geometry.height);
    context.lineTo(geometry.left + geometry.width, geometry.top + sourceTop);
    context.bezierCurveTo(geometry.left + 620, geometry.top + 506, geometry.left + 560, geometry.top + 514, geometry.left + 505, geometry.top + 535);
    context.bezierCurveTo(geometry.left + 455, geometry.top + 516, geometry.left + 420, geometry.top + 520, geometry.left + 390, geometry.top + 544);
    context.bezierCurveTo(geometry.left + 350, geometry.top + 520, geometry.left + 294, geometry.top + 510, geometry.left + 242, geometry.top + 534);
    context.bezierCurveTo(geometry.left + 182, geometry.top + 510, geometry.left + 80, geometry.top + 505, geometry.left, geometry.top + sourceTop);
    context.closePath();
    context.clip();
    context.fillStyle = "#ffffff";
    context.fillRect(geometry.left, geometry.top + 505, geometry.width, 583);
    const sliceCount = 36;
    const sourceSliceHeight = sourceHeight / sliceCount;
    for (let index = 0; index < sliceCount; index += 1) {
      const fraction = index / (sliceCount - 1);
      const horizontalEnvelope = smoothStep(fraction);
      const sliceScaleX = 1 - (1 - shrinkX) * horizontalEnvelope;
      const sourceY = sourceTop + index * sourceSliceHeight;
      const destinationY = geometry.top + sourceTop + (sourceY - sourceTop) * shrinkY;
      const destinationWidth = geometry.width * sliceScaleX;
      context.drawImage(
        image,
        0,
        sourceY,
        geometry.width,
        sourceSliceHeight + 1,
        geometry.left + (geometry.width - destinationWidth) / 2,
        destinationY,
        destinationWidth,
        sourceSliceHeight * shrinkY + 1.2
      );
    }
    context.restore();
    return {
      active: true,
      progress,
      mode: config.ventricularContraction.mode,
      independentlyRendered: true,
      qrsTriggered: true
    };
  }

  function waveletPosition(wavelet, progress) {
    const bend = Math.sin(Math.PI * progress) * wavelet.curve;
    return {
      x: wavelet.x + wavelet.dx * progress - Math.sin(Math.atan2(wavelet.dy, wavelet.dx)) * bend,
      y: wavelet.y + wavelet.dy * progress + Math.cos(Math.atan2(wavelet.dy, wavelet.dx)) * bend
    };
  }

  function drawGlow(context, x, y, radius, alpha) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius * 3.4);
    gradient.addColorStop(0, "rgba(255,255,225," + Math.min(1, alpha) + ")");
    gradient.addColorStop(0.18, "rgba(255,239,86," + (0.95 * alpha) + ")");
    gradient.addColorStop(0.52, "rgba(255,190,20," + (0.52 * alpha) + ")");
    gradient.addColorStop(1, "rgba(255,150,0,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius * 3.4, 0, Math.PI * 2);
    context.fill();
  }

  function pointOnPolyline(points, progress) {
    const lengths = [];
    let total = 0;
    for (let index = 1; index < points.length; index += 1) {
      const length = Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]);
      lengths.push(length);
      total += length;
    }
    let target = Math.max(0, Math.min(1, progress)) * total;
    for (let index = 0; index < lengths.length; index += 1) {
      if (target <= lengths[index]) {
        const local = lengths[index] ? target / lengths[index] : 0;
        return {
          x: points[index][0] + (points[index + 1][0] - points[index][0]) * local,
          y: points[index][1] + (points[index + 1][1] - points[index][1]) * local
        };
      }
      target -= lengths[index];
    }
    return { x: points[points.length - 1][0], y: points[points.length - 1][1] };
  }

  function drawMovingSignal(context, points, progress, headRadius) {
    const head = pointOnPolyline(points, progress);
    drawGlow(context, head.x, head.y, headRadius, 1);
    for (const trail of [0.07, 0.14]) {
      const point = pointOnPolyline(points, progress - trail);
      drawGlow(context, point.x, point.y, headRadius * 0.48, 0.22 * (1 - trail / 0.20));
    }
  }

  function drawAvRing(context, x, y, radius, alpha, color) {
    context.save();
    context.strokeStyle = color.replace("ALPHA", String(alpha));
    context.lineWidth = 4;
    context.shadowColor = color.replace("ALPHA", String(Math.min(1, alpha * 0.8)));
    context.shadowBlur = 8;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function drawAvBadge(context, text, x, y, passed) {
    context.save();
    context.fillStyle = passed ? "rgba(232,248,242,0.96)" : "rgba(255,238,232,0.96)";
    context.strokeStyle = passed ? "#31856f" : "#c5543f";
    context.lineWidth = 2;
    roundedRect(context, x, y, 58, 30, 8);
    context.fill();
    context.stroke();
    context.fillStyle = passed ? "#216a58" : "#a43f30";
    context.font = '800 18px "BIZ UDPGothic","BIZ UDPゴシック","Noto Sans JP","Yu Gothic","Meiryo",sans-serif';
    context.textAlign = "center";
    context.fillText(text, x + 29, y + 22);
    context.restore();
  }

  function drawConduction(context, state, config) {
    const geometry = { left: 520, top: 0 };
    const time = state.timeSeconds;
    let activeWavelets = 0;
    context.save();
    context.beginPath();
    context.ellipse(geometry.left + 232, 390, 150, 148, -0.08, 0, Math.PI * 2);
    context.ellipse(geometry.left + 548, 390, 142, 143, 0.08, 0, Math.PI * 2);
    context.clip();
    context.globalCompositeOperation = "screen";
    for (const wavelet of config.atrialActivation.wavelets) {
      const progress = (time - wavelet.start) / wavelet.lifetime;
      if (progress < 0 || progress > 1) continue;
      activeWavelets += 1;
      const envelope = Math.sin(Math.PI * progress) ** 0.7;
      for (let trail = 5; trail >= 0; trail -= 1) {
        const trailProgress = Math.max(0, progress - trail * 0.043);
        const point = waveletPosition(wavelet, trailProgress);
        drawGlow(
          context,
          geometry.left + point.x,
          point.y,
          wavelet.radius * (trail === 0 ? 1 : 0.64),
          envelope * (trail === 0 ? 1 : 0.11 * (6 - trail))
        );
      }
    }
    context.restore();

    const avX = geometry.left + 329;
    const avY = 458;
    let avArrivals = 0;
    let conductedNow = false;
    let blockedNow = false;
    for (const impulse of config.avNode.impulses) {
      const local = time - impulse.time;
      if (local < -0.16 || local > 0.12) continue;
      avArrivals += 1;
      const progress = Math.max(0, Math.min(1, (local + 0.16) / 0.16));
      const x = geometry.left + impulse.sourceX + (329 - impulse.sourceX) * progress;
      const y = impulse.sourceY + (458 - impulse.sourceY) * progress;
      if (local < 0) {
        drawGlow(context, x, y, impulse.conducted ? 9.5 : 6.3, impulse.conducted ? 1 : 0.68);
      } else if (impulse.conducted && local <= 0.07) {
        conductedNow = true;
        const passProgress = local / 0.07;
        drawGlow(context, avX, avY, 12, 1 - passProgress * 0.28);
        drawAvRing(context, avX, avY, 10 + passProgress * 8, 1 - passProgress, "rgba(49,153,126,ALPHA)");
      } else if (!impulse.conducted) {
        blockedNow = true;
        const blockProgress = Math.min(1, local / 0.12);
        drawAvRing(context, avX, avY, 8 + blockProgress * 18, 1 - blockProgress, "rgba(210,78,55,ALPHA)");
        context.save();
        context.strokeStyle = "rgba(184,58,43," + (1 - blockProgress) + ")";
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(avX - 6, avY - 6);
        context.lineTo(avX + 6, avY + 6);
        context.moveTo(avX + 6, avY - 6);
        context.lineTo(avX - 6, avY + 6);
        context.stroke();
        context.restore();
      }
    }
    const delta = nearestBeatDelta(time, config.timing.ventricularBeatTimes);
    const conductedElectricalActive = delta >= -0.16 && delta <= 0.08;
    const conductedNarrativeActive = delta >= -0.16 && delta <= 0.34;
    const passBadgeVisible = conductedNow || (delta >= -0.16 && delta < -0.07);
    const blockedBadgeVisible = blockedNow && !conductedNarrativeActive;
    if (avArrivals) drawGlow(context, avX, avY, passBadgeVisible ? 10 : 7, passBadgeVisible ? 1 : 0.58);
    if (passBadgeVisible) drawAvBadge(context, "通過", avX + 12, avY + 22, true);
    else if (blockedBadgeVisible) drawAvBadge(context, "遮断", avX - 70, avY + 22, false);

    const hisPath = [[avX, avY], [geometry.left + 350, 515], [geometry.left + 374, 592]];
    const rightBundle = [[geometry.left + 374, 592], [geometry.left + 308, 665], [geometry.left + 255, 760]];
    const leftBundle = [[geometry.left + 374, 592], [geometry.left + 438, 670], [geometry.left + 510, 765]];
    const rightPurkinje = [
      [[geometry.left + 255, 760], [geometry.left + 205, 842], [geometry.left + 174, 925]],
      [[geometry.left + 255, 760], [geometry.left + 274, 850], [geometry.left + 310, 920]]
    ];
    const leftPurkinje = [
      [[geometry.left + 510, 765], [geometry.left + 548, 852], [geometry.left + 582, 942]],
      [[geometry.left + 510, 765], [geometry.left + 610, 826], [geometry.left + 646, 900]]
    ];
    let conductionStage = "心房内multiple wavelets";
    if (delta >= -0.16 && delta < -0.11) {
      conductionStage = "房室結節を一部通過";
      drawGlow(context, avX, avY, 12, 1);
      drawAvRing(context, avX, avY, 14, 0.9, "rgba(49,153,126,ALPHA)");
    } else if (delta >= -0.11 && delta < -0.07) {
      conductionStage = "ヒス束へ伝導";
      drawMovingSignal(context, hisPath, (delta + 0.11) / 0.04, 14);
    } else if (delta >= -0.07 && delta < -0.02) {
      conductionStage = "右脚・左脚へ伝導";
      const progress = (delta + 0.07) / 0.05;
      drawMovingSignal(context, rightBundle, progress, 13.5);
      drawMovingSignal(context, leftBundle, progress, 13.5);
    } else if (delta >= -0.02 && delta <= 0.08) {
      conductionStage = "プルキンエ線維から心室へ";
      const progress = (delta + 0.02) / 0.10;
      for (const path of rightPurkinje.concat(leftPurkinje)) {
        drawMovingSignal(context, path, progress, 12);
      }
    }
    return {
      stage: conductionStage,
      activeAtrialWavelets: activeWavelets,
      avArrivals,
      avBlocked: blockedBadgeVisible,
      avStatus: conductedElectricalActive ? "通過" : blockedBadgeVisible ? "遮断" : "待機",
      avConducted: conductedElectricalActive,
      usesExistingAnatomicalConductionPaths: true,
      addedConductionLines: false,
      embeddedInCompositeFrame: false
    };
  }

  function drawActivation(context, state, activation, config) {
    const delta = nearestBeatDelta(state.timeSeconds, config.timing.ventricularBeatTimes);
    const ventricular = delta >= 0 && delta <= 0.10;
    if (ventricular) {
      const spread = smoothStep(delta / 0.10);
      const envelope = Math.sin(Math.PI * Math.min(1, delta / 0.10));
      context.save();
      context.globalCompositeOperation = "screen";
      for (const [x, y, rx, ry] of [[790, 900 - spread * 120, 128 + spread * 34, 110 + spread * 105], [1080, 905 - spread * 125, 136 + spread * 36, 112 + spread * 110]]) {
        const gradient = context.createRadialGradient(x, y, 18, x, y, Math.max(rx, ry));
        gradient.addColorStop(0, "rgba(255,238,92," + (0.26 * envelope) + ")");
        gradient.addColorStop(0.55, "rgba(255,171,35," + (0.13 * envelope) + ")");
        gradient.addColorStop(1, "rgba(255,130,20,0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }
    return {
      atrial: false,
      atrialLocalQuiver: true,
      avDelay: false,
      ventricular,
      ventricularRepolarization: delta >= 0.22 && delta <= 0.42,
      embeddedInCompositeFrame: false
    };
  }

  function drawContraction(context, state, contraction, config) {
    const progress = contractionProgress(state.timeSeconds, config.timing.ventricularBeatTimes);
    return {
      atrial: false,
      atrialLocalQuiver: true,
      ventricular: progress > 0.001,
      ventricularProgress: progress,
      embeddedInCompositeFrame: false
    };
  }

  function drawLeader(context, text, x, y, targetX, targetY, align) {
    context.font = '700 24px "BIZ UDPGothic","BIZ UDPゴシック","Noto Sans JP","Yu Gothic","Meiryo",sans-serif';
    context.fillStyle = "#263238";
    context.textAlign = align || "left";
    context.fillText(text, x, y);
    const width = context.measureText(text).width;
    const startX = (align || "left") === "right" ? x - width - 12 : x + width + 12;
    context.strokeStyle = "#526A75";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(startX, y - 8);
    context.lineTo(targetX, targetY);
    context.stroke();
    context.fillStyle = "#526A75";
    context.beginPath();
    context.arc(targetX, targetY, 4, 0, Math.PI * 2);
    context.fill();
    context.textAlign = "left";
  }

  function drawEducationalPill(context, text, x, y, width, palette) {
    context.save();
    context.fillStyle = palette.fill;
    context.strokeStyle = palette.stroke;
    context.lineWidth = 2;
    roundedRect(context, x, y, width, 42, 10);
    context.fill();
    context.stroke();
    context.fillStyle = palette.text;
    context.font = '800 21px "BIZ UDPGothic","BIZ UDPゴシック","Noto Sans JP","Yu Gothic","Meiryo",sans-serif';
    context.textAlign = "center";
    context.fillText(text, x + width / 2, y + 29);
    context.restore();
  }

  function drawLabels(context, state, config) {
    const font = '"BIZ UDPGothic","BIZ UDPゴシック","Noto Sans JP","Yu Gothic","Meiryo",sans-serif';
    context.fillStyle = "#111827";
    context.font = "800 46px " + font;
    context.fillText("心房細動", 42, 68);
    context.fillStyle = "#374151";
    context.font = "700 24px " + font;
    context.fillText("AF（Atrial Fibrillation）", 44, 106);
    context.fillStyle = "#7A4B20";
    context.font = "700 22px " + font;
    context.fillText("複数の興奮波が連続・非同期に活動", 44, 146);
    drawEducationalPill(context, "主役：心房", 42, 164, 180, {
      fill: "#FFF4D6",
      stroke: "#DDAA39",
      text: "#714716"
    });
    drawLeader(context, "洞結節（非優位）", 48, 254, 708, 277, "left");
    drawLeader(context, "心房壁：別々に細かく動く", 48, 374, 747, 392, "left");
    drawLeader(context, "房室結節（一部だけ通過）", 1748, 454, 849, 458, "right");
    drawLeader(context, "ヒス束（ヒス・プルキンエ系）", 1748, 606, 887, 592, "right");
    drawLeader(context, "プルキンエ線維", 1748, 826, 1095, 842, "right");
    const ventricularProgress = contractionProgress(state.timeSeconds, config.timing.ventricularBeatTimes);
    if (ventricularProgress > 0.01) {
      drawEducationalPill(context, "QRS後：心室がまとまって収縮", 1374, 940, 352, {
        fill: "#E8F6F1",
        stroke: "#4B9A84",
        text: "#235F50"
      });
    } else {
      drawEducationalPill(context, "心室：QRS待機（静止）", 1420, 940, 306, {
        fill: "#F1F5F9",
        stroke: "#94A3B8",
        text: "#475569"
      });
    }
    return { title: "心房細動", language: "ja", embeddedInCompositeFrame: false };
  }

  function roundedRect(context, x, y, width, height, radius) {
    const value = Math.min(radius, width / 2, height / 2);
    context.beginPath(); context.moveTo(x + value, y); context.lineTo(x + width - value, y);
    context.quadraticCurveTo(x + width, y, x + width, y + value); context.lineTo(x + width, y + height - value);
    context.quadraticCurveTo(x + width, y + height, x + width - value, y + height); context.lineTo(x + value, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - value); context.lineTo(x, y + value);
    context.quadraticCurveTo(x, y, x + value, y); context.closePath();
  }

  function piecewise(points, time) {
    if (time < points[0][0] || time > points[points.length - 1][0]) return 0;
    for (let index = 1; index < points.length; index += 1) {
      if (time <= points[index][0]) {
        const previous = points[index - 1];
        const next = points[index];
        const progress = (time - previous[0]) / (next[0] - previous[0]);
        return previous[1] + (next[1] - previous[1]) * progress;
      }
    }
    return 0;
  }

  function fibrillatoryBaseline(time, seed) {
    const phase = (seed % 997) / 997 * Math.PI * 2;
    return 0.028 * Math.sin(time * 2 * Math.PI * 7.1 + phase) +
      0.018 * Math.sin(time * 2 * Math.PI * 11.7 + phase * 0.63) +
      0.009 * Math.sin(time * 2 * Math.PI * 17.3 + 1.7);
  }

  function ecgAmplitude(time, config) {
    let value = fibrillatoryBaseline(time, config.seed);
    const qrs = [[-0.028, 0], [-0.015, -0.12], [0, 1.05], [0.018, -0.24], [0.058, 0]];
    const tWave = [[0.205, 0], [0.285, 0.28], [0.405, 0]];
    for (const beatTime of config.timing.ventricularBeatTimes) {
      const delta = time - beatTime;
      value += piecewise(qrs, delta) + piecewise(tWave, delta);
    }
    return value;
  }

  function ecgStage(time, config) {
    const delta = nearestBeatDelta(time, config.timing.ventricularBeatTimes);
    if (delta >= -0.16 && delta < -0.11) return "房室結節を一部通過";
    if (delta >= -0.11 && delta < -0.07) return "ヒス束へ伝導";
    if (delta >= -0.07 && delta < -0.02) return "右脚・左脚へ伝導";
    if (delta >= -0.02 && delta < 0) return "プルキンエ線維へ伝導";
    if (delta >= -0.028 && delta < 0.058) return "QRS｜心室脱分極";
    if (delta >= 0.065 && delta < 0.205) return "心室収縮";
    if (delta >= 0.205 && delta < 0.405) return "T波｜心室再分極";
    return "心房内で複数興奮波";
  }

  function drawEcg(context, state, config, design) {
    const style = design.ecg;
    const font = design.typography.fontStack;
    const left = 28;
    const right = style.width - 30;
    const top = 74;
    const bottom = 306;
    const baseline = 239;
    const scale = 130;
    const smallBox = style.smallBoxPx;
    const stageText = ecgStage(state.timeSeconds, config);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, style.width, style.height);
    context.fillStyle = "#111827";
    context.font = "800 42px " + font;
    context.fillText("Ⅱ", 28, 52);
    context.font = "700 34px " + font;
    context.fillText("心房細動", 92, 50);
    context.font = "700 30px " + font;
    const pad = 18;
    const badgeWidth = Math.ceil(context.measureText(stageText).width) + pad * 2;
    const badgeX = style.width - 28 - badgeWidth;
    context.fillStyle = "#F1F5F9";
    roundedRect(context, badgeX, 7, badgeWidth, 52, 9);
    context.fill();
    context.strokeStyle = "#CBD5E1";
    context.lineWidth = 1.5;
    context.stroke();
    context.fillStyle = "#111827";
    context.textAlign = "right";
    context.fillText(stageText, style.width - 28 - pad, 44);
    context.textAlign = "left";

    context.fillStyle = "#fffdfd";
    context.fillRect(left, top, right - left, bottom - top);
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

    context.save();
    context.beginPath();
    context.rect(left, top, right - left, bottom - top);
    context.clip();
    context.strokeStyle = "#20282e";
    context.lineWidth = 3;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.beginPath();
    const endTime = Math.min(config.duration.totalSeconds, state.timeSeconds);
    const pixelsPerSecond = (right - left) / config.duration.totalSeconds;
    const cursorX = (left + right) / 2;
    const offset = endTime - (cursorX - left) / pixelsPerSecond;
    const startTime = Math.max(0, offset);
    const samples = Math.max(1, Math.floor((endTime - startTime) * 420));
    for (let index = 0; index <= samples; index += 1) {
      const time = startTime + (endTime - startTime) * index / samples;
      const x = left + (time - offset) * pixelsPerSecond;
      const y = baseline - ecgAmplitude(time, config) * scale;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.stroke();
    context.strokeStyle = '#bf8a20';context.lineWidth = 1.5;context.beginPath();context.moveTo(cursorX, top);context.lineTo(cursorX, bottom);context.stroke();
    context.restore();

    context.fillStyle = "#1F2933";
    context.font = "700 26px " + font;
    context.fillText(config.visual.ecgCaption, 28, 350);
    context.fillStyle = "#374151";
    context.font = "600 22px " + font;
    context.fillText(config.visual.ecgCalibration, 28, 385);
    return {
      time: state.timeSeconds,
      cursorX, offset, pixelsPerSecond,
      progress: endTime / config.duration.totalSeconds,
      sequenceProgress: endTime / config.duration.totalSeconds,
      stage: stageText,
      pWavePresent: false,
      qrsEvents: config.timing.ventricularBeatTimes.slice(),
      tWaveOffsetSeconds: 0.205
    };
  }

  const config = {
    id: "atrial-fibrillation",
    name: "心房細動",
    abbreviation: "AF",
    seed: DEFAULT_SEED,
    duration: { totalSeconds: 5, fps: 60 },
    heartRate: { mode: "variable", value: 60, min: 53, max: 72 },
    rhythm: {
      regularity: "irregularly_irregular",
      cycleMode: "event_based",
      rrIntervalsMs: DEFAULT_BEAT_TIMES.slice(1).map((time, index) => Math.round((time - DEFAULT_BEAT_TIMES[index]) * 1000)),
      ventricularBeatTimes: DEFAULT_BEAT_TIMES.slice()
    },
    pacemakerOrigin: {
      type: "multiple_atrial_wavelets",
      location: "both_atria",
      dominant: false
    },
    saNode: { active: true, dominant: false },
    atrialActivation: {
      mode: "multiple_wavelets",
      organized: false,
      pathways: [],
      spreadPattern: "multidirectional_continuous_nonsynchronous",
      contractionEnabled: false,
      ecgSyncEvent: "fibrillatory_baseline",
      simultaneousWaveletsTarget: { min: 4, max: 8 },
      wavelets: makeWavelets(DEFAULT_SEED, 5)
    },
    avNode: {
      conductionMode: "variable_filtering",
      delayMode: "variable",
      conductionRatio: "variable",
      impulses: makeAvImpulses(DEFAULT_SEED, 5, DEFAULT_BEAT_TIMES)
    },
    hisPurkinjeActivation: {
      enabled: true,
      mode: "his_to_bundle_branches_and_purkinje",
      pathways: ["his_bundle", "right_bundle_branch", "left_bundle_branch", "purkinje_network"]
    },
    ventricularActivation: {
      origin: "his_purkinje",
      mode: "organized_biventricular",
      qrsWidthMode: "normal",
      ecgSyncEvent: "ventricularBeatTimes"
    },
    atrialContraction: { enabled: false, timing: "none" },
    atrialMechanicalActivity: {
      mode: "localized_micro_quiver",
      organized: false,
      chambers: ["right_atrium", "left_atrium"],
      amplitudePx: { x: 6.6, y: 4.7 },
      frequencyHz: { min: 4.1, max: 6.7 },
      mechanicalLayer: "atrialMechanical"
    },
    ventricularContraction: {
      enabled: true,
      timing: "after_ventricular_depolarization",
      delaySeconds: 0.10,
      endSecondsAfterQrs: 0.34,
      mode: "smooth_global_contraction_per_conducted_beat"
    },
    ecg: {
      lead: "II",
      pWave: { present: false, morphology: "absent" },
      prInterval: { present: false, durationMode: "not_applicable" },
      qrs: { morphology: "normal_lead_II", widthMode: "normal", timing: "ventricularBeatTimes" },
      stSegment: { morphology: "isoelectric_with_fibrillatory_baseline" },
      tWave: {
        morphology: "upright_smooth",
        timing: "after_each_qrs",
        represents: "ventricular_repolarization"
      },
      baseline: { mode: "fibrillatory", amplitude: "fine", amplitudeNormalized: 0.055 },
      rrPattern: { mode: "irregularly_irregular" }
    },
    timing: {
      units: "absolute-seconds",
      ventricularBeatTimes: DEFAULT_BEAT_TIMES.slice(),
      avPassTimes: DEFAULT_BEAT_TIMES.map(time => round(Math.max(0, time - 0.16), 3)),
      events: {
        pStart: -1, pEnd: -1, avStart: 0, avEnd: 0,
        hisStart: -0.11, hisEnd: -0.07, bundleStart: -0.07, bundleEnd: -0.02,
        qrsStart: 0, qrsEnd: 0.058,
        atrialContractionStart: -1, ventricularContractionStart: 0.10,
        tStart: 0.205, tEnd: 0.405
      }
    },
    renderModel: {
      mode: "layered-af-on-protected-resting-anatomy",
      sourceFrameCount: 1,
      heartFrames: [restingFrame],
      anatomySource: "sinus-v24/000.webp",
      mechanicalLayersSeparated: true,
      layerOrder: ["base_anatomy", "atrial_mechanical", "ventricular_mechanical", "electrical_conduction", "myocardial_activation", "labels", "ecg"],
      physiologyLayers: ["atrial_mechanical", "ventricular_mechanical", "multiple_wavelets", "variable_av_filtering", "his_purkinje_activation", "ventricular_activation"]
    },
    visual: {
      designId: "sinus-v24-visual-style",
      screenTitle: "心房細動",
      ecgTitle: "心房細動",
      ecgCaption: "模式波形・心房細動（平均約60回/分）",
      ecgCalibration: "25 mm/秒相当｜P波なし｜RR間隔：完全不規則",
      explanation: "心房内の複数興奮波は連続・非同期に活動し、房室結節へ届く刺激の一部だけが不規則に心室へ伝わります。P波はなく、狭いQRSとT波が完全不規則なRR間隔で現れます。模式図であり診断用実測波形ではありません。"
    },
    renderAdapters: {
      heart: drawBaseHeart,
      atrialMechanical: drawAtrialMechanical,
      ventricularMechanical: drawVentricularMechanical,
      conduction: drawConduction,
      activation: drawActivation,
      contraction: drawContraction,
      labels: drawLabels,
      ecg: drawEcg
    },
    buildEventSchedule(target, request) {
      const seed = Number.isFinite(Number(request.seed)) ? Number(request.seed) : target.seed;
      const heartRate = Number(request.heartRate);
      const duration = Number(request.duration);
      const beatTimes = makeBeatTimes(heartRate, duration, seed);
      target.seed = seed;
      target.heartRate.value = heartRate;
      target.duration.totalSeconds = duration;
      target.timing.ventricularBeatTimes = beatTimes;
      target.timing.avPassTimes = beatTimes.map(time => round(Math.max(0, time - 0.16), 3));
      target.rhythm.ventricularBeatTimes = beatTimes.slice();
      target.rhythm.rrIntervalsMs = beatTimes.slice(1).map((time, index) => Math.round((time - beatTimes[index]) * 1000));
      if (target.rhythm.rrIntervalsMs.length) {
        const instantaneousRates = target.rhythm.rrIntervalsMs.map(interval => 60000 / interval);
        target.heartRate.min = Math.floor(Math.min(...instantaneousRates));
        target.heartRate.max = Math.ceil(Math.max(...instantaneousRates));
      }
      target.atrialActivation.wavelets = makeWavelets(seed, duration);
      target.avNode.impulses = makeAvImpulses(seed, duration, beatTimes);
      const rateLabel = heartRate >= 100 ? "頻脈性AF" : "心房細動";
      target.visual.ecgCaption = "模式波形・" + rateLabel + "（平均約" + Math.round(heartRate) + "回/分）";
    }
  };

  return config;
});
