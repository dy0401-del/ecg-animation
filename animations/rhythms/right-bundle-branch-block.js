(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CardiacAnimation = root.CardiacAnimation || {};
  root.CardiacAnimation.Rhythms = root.CardiacAnimation.Rhythms || {};
  root.CardiacAnimation.Rhythms["right-bundle-branch-block"] = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const currentScriptUrl = typeof document !== "undefined" && document.currentScript
    ? document.currentScript.src
    : null;
  const frameBaseUrl = currentScriptUrl
    ? new URL("../assets/heart/sinus-v24/", currentScriptUrl).href
    : "assets/heart/sinus-v24/";
  const sinusFrames = Array.from({ length: 120 }, (_, index) => {
    const filename = String(index).padStart(3, "0") + ".webp";
    return currentScriptUrl ? new URL(filename, frameBaseUrl).href : frameBaseUrl + filename;
  });

  const events = Object.freeze({
    saPeak: 0.02,
    pStart: 0.02,
    pEnd: 0.10,
    avStart: 0.10,
    avEnd: 0.17,
    hisStart: 0.17,
    hisEnd: 0.19,
    bundleStart: 0.19,
    bundleEnd: 0.20,
    qrsStart: 0.20,
    septalActivationEnd: 0.220,
    leftVentricleActivationStart: 0.20,
    leftVentricleActivationEnd: 0.255,
    transseptalActivationStart: 0.265,
    rightVentricleActivationStart: 0.270,
    qrsEnd: 0.320,
    atrialContractionStart: 0.075,
    leftVentricleContractionStart: 0.210,
    rightVentricleContractionStart: 0.420,
    tStart: 0.54,
    tEnd: 0.74
  });

  const FONT = '"BIZ UDPGothic","BIZ UDPゴシック","Noto Sans JP","Yu Gothic","Meiryo",sans-serif';
  const RIGHT_VENTRICLE_ANCHORS = Object.freeze({
    tricuspidAnnulus: Object.freeze({ x: 180, y: 560 }),
    outflowTract: Object.freeze({ x: 340, y: 515 }),
    freeWallCenter: Object.freeze({ x: 100, y: 770 }),
    apex: Object.freeze({ x: 410, y: 925 }),
    septalAttachment: Object.freeze({ x: 430, y: 775 })
  });
  const RIGHT_VENTRICLE_MESH = Object.freeze({
    left: 60,
    top: 470,
    right: 470,
    bottom: 1040,
    columns: 8,
    rows: 10,
    boundaryFadePx: 72,
    maximumInwardPx: 50
  });
  const WHOLE_HEART_MESH = Object.freeze({
    left: 0,
    top: 0,
    right: 768,
    bottom: 1088,
    columns: 10,
    rows: 14
  });
  const RBBB_DESIGN = Object.freeze({
    id: "rbbb-education-sinus-ecg-position",
    background: "#F8FAFC",
    // 心臓の位置・大きさは固定し、洞調律版と同じくECGを下段へ配置する。
    canvas: Object.freeze({ width: 1808, height: 1488, heartHeight: 1088 }),
    heart: Object.freeze({ width: 768, height: 1088, left: 176, top: -8 }),
    ecg: Object.freeze({
      width: 1808,
      height: 400,
      left: 0,
      top: 1088,
      smallBoxPx: 14,
      largeBoxPx: 70,
      paperSpeedMmPerSecond: 25,
      minorGrid: "#f8e1e4",
      majorGrid: "#edb7bd",
      trace: "#20282e",
      traceWidth: 3
    }),
    typography: Object.freeze({
      fontStack: FONT,
      text: "#1F2933",
      heading: "#111827",
      support: "#374151"
    }),
    labels: Object.freeze({ language: "ja", mode: "rbbb-external-callouts" }),
    conduction: Object.freeze({
      restingPath: "single-frame-continuous-mesh-delayed-right-ventricle",
      excitation: "yellow-normal-cyan-delayed",
      forbidGrowingThickPath: true
    })
  });

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function smoothStep(value) {
    const progress = clamp(value, 0, 1);
    return progress * progress * (3 - 2 * progress);
  }

  function windowEnvelope(time, start, peak, end) {
    if (time < start || time > end) return 0;
    if (time <= peak) return smoothStep((time - start) / Math.max(0.0001, peak - start));
    return 1 - smoothStep((time - peak) / Math.max(0.0001, end - peak));
  }

  function roundedRect(context, x, y, width, height, radius) {
    const value = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + value, y);
    context.lineTo(x + width - value, y);
    context.quadraticCurveTo(x + width, y, x + width, y + value);
    context.lineTo(x + width, y + height - value);
    context.quadraticCurveTo(x + width, y + height, x + width - value, y + height);
    context.lineTo(x + value, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - value);
    context.lineTo(x, y + value);
    context.quadraticCurveTo(x, y, x + value, y);
    context.closePath();
  }

  function pointOnPolyline(points, progress) {
    const lengths = [];
    let total = 0;
    for (let index = 1; index < points.length; index += 1) {
      const length = Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]);
      lengths.push(length);
      total += length;
    }
    let target = clamp(progress, 0, 1) * total;
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

  function drawGlow(context, x, y, radius, alpha, hue) {
    const palette = hue === "cyan"
      ? ["226,255,255", "87,224,244", "26,155,190"]
      : ["255,255,225", "255,239,86", "255,163,18"];
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius * 3.4);
    gradient.addColorStop(0, "rgba(" + palette[0] + "," + Math.min(1, alpha) + ")");
    gradient.addColorStop(0.18, "rgba(" + palette[1] + "," + (0.94 * alpha) + ")");
    gradient.addColorStop(0.54, "rgba(" + palette[2] + "," + (0.48 * alpha) + ")");
    gradient.addColorStop(1, "rgba(" + palette[2] + ",0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius * 3.4, 0, Math.PI * 2);
    context.fill();
  }

  function drawMovingSignal(context, points, progress, radius, hue) {
    const head = pointOnPolyline(points, progress);
    drawGlow(context, head.x, head.y, radius, 1, hue);
    for (const trail of [0.06, 0.12]) {
      const point = pointOnPolyline(points, progress - trail);
      drawGlow(context, point.x, point.y, radius * 0.48, 0.20 * (1 - trail / 0.18), hue);
    }
  }

  function drawRegionScaled(context, image, geometry, region, scaleX, scaleY, shiftX, shiftY, filter) {
    const centerX = geometry.left + region.x;
    const centerY = geometry.top + region.y;
    context.save();
    context.beginPath();
    context.ellipse(centerX, centerY, region.rx, region.ry, region.rotation || 0, 0, Math.PI * 2);
    context.clip();
    context.fillStyle = "#ffffff";
    context.fillRect(centerX - region.rx - 12, centerY - region.ry - 12, region.rx * 2 + 24, region.ry * 2 + 24);
    context.translate(centerX + (shiftX || 0), centerY + (shiftY || 0));
    context.scale(scaleX, scaleY);
    context.translate(-centerX, -centerY);
    if (filter) context.filter = filter;
    context.drawImage(image, geometry.left, geometry.top, geometry.width, geometry.height);
    context.restore();
  }

  function interpolateKeyframes(value, keyframes) {
    if (value <= keyframes[0][0]) return keyframes[0][1];
    for (let index = 1; index < keyframes.length; index += 1) {
      const previous = keyframes[index - 1];
      const current = keyframes[index];
      if (value <= current[0]) {
        const progress = (value - previous[0]) / Math.max(0.000001, current[0] - previous[0]);
        return previous[1] + (current[1] - previous[1]) * progress;
      }
    }
    return keyframes[keyframes.length - 1][1];
  }

  function frameAtSinusPhase(frames, phase) {
    return frames[Math.min(frames.length - 1, Math.max(0, Math.floor(clamp(phase, 0, 0.999999) * frames.length)))];
  }

  function drawHeartRegion(context, image, geometry, regions, alpha) {
    context.save();
    context.beginPath();
    for (const region of regions) {
      context.moveTo(geometry.left + region.x + region.rx, geometry.top + region.y);
      context.ellipse(
        geometry.left + region.x,
        geometry.top + region.y,
        region.rx,
        region.ry,
        region.rotation || 0,
        0,
        Math.PI * 2
      );
    }
    context.clip();
    context.globalAlpha = alpha == null ? 1 : alpha;
    context.drawImage(image, geometry.left, geometry.top, geometry.width, geometry.height);
    context.restore();
  }

  function traceRightVentricle(context, geometry) {
    const anchors = RIGHT_VENTRICLE_ANCHORS;
    const left = geometry.left;
    const top = geometry.top;
    context.beginPath();
    context.moveTo(left + anchors.tricuspidAnnulus.x, top + anchors.tricuspidAnnulus.y);
    context.bezierCurveTo(left + 235, top + 525, left + 300, top + 500, left + anchors.outflowTract.x, top + anchors.outflowTract.y);
    context.bezierCurveTo(left + 370, top + 570, left + 374, top + 675, left + 385, top + 775);
    context.bezierCurveTo(left + 390, top + 845, left + 410, top + 900, left + anchors.apex.x, top + anchors.apex.y);
    context.bezierCurveTo(left + 310, top + 930, left + 165, top + 850, left + anchors.freeWallCenter.x, top + anchors.freeWallCenter.y);
    context.bezierCurveTo(left + 98, top + 675, left + 132, top + 600, left + anchors.tricuspidAnnulus.x, top + anchors.tricuspidAnnulus.y);
    context.closePath();
  }

  function drawImageTriangle(context, image, source, destination) {
    const s0 = source[0];
    const s1 = source[1];
    const s2 = source[2];
    const d0 = destination[0];
    const d1 = destination[1];
    const d2 = destination[2];
    const sx1 = s1.x - s0.x;
    const sy1 = s1.y - s0.y;
    const sx2 = s2.x - s0.x;
    const sy2 = s2.y - s0.y;
    const determinant = sx1 * sy2 - sx2 * sy1;
    if (Math.abs(determinant) < 0.000001) return;
    const dx1 = d1.x - d0.x;
    const dy1 = d1.y - d0.y;
    const dx2 = d2.x - d0.x;
    const dy2 = d2.y - d0.y;
    const a = (dx1 * sy2 - dx2 * sy1) / determinant;
    const c = (dx2 * sx1 - dx1 * sx2) / determinant;
    const b = (dy1 * sy2 - dy2 * sy1) / determinant;
    const d = (dy2 * sx1 - dy1 * sx2) / determinant;
    const e = d0.x - a * s0.x - c * s0.y;
    const f = d0.y - b * s0.x - d * s0.y;
    // Subpixel overlap prevents antialiased cracks between moving mesh triangles.
    const center = { x: (d0.x + d1.x + d2.x) / 3, y: (d0.y + d1.y + d2.y) / 3 };
    const edge = [d0, d1, d2].map(point => {
      const dx = point.x - center.x, dy = point.y - center.y;
      const factor = 0.7 / Math.max(1, Math.hypot(dx, dy));
      return { x: point.x + dx * factor, y: point.y + dy * factor };
    });
    context.save();
    context.beginPath();
    context.moveTo(edge[0].x, edge[0].y);
    context.lineTo(edge[1].x, edge[1].y);
    context.lineTo(edge[2].x, edge[2].y);
    context.closePath();
    context.clip();
    context.transform(a, b, c, d, e, f);
    context.drawImage(image, 0, 0);
    context.restore();
  }

  function rightVentricleMeshDisplacement(x, y, phase) {
    const mesh = RIGHT_VENTRICLE_MESH;
    const lateral = clamp((RIGHT_VENTRICLE_ANCHORS.septalAttachment.x - x) / 330, 0, 1);
    // 左室は210 msから収縮。右室は390 msに中隔側から始まり、420 msに自由壁へ到達する。
    const localStart = events.rightVentricleContractionStart - 0.030 + lateral * 0.030;
    const delayedProgress = windowEnvelope(phase, localStart, localStart + 0.140, localStart + 0.380);
    const vectorAnchors = [
      { point: RIGHT_VENTRICLE_ANCHORS.tricuspidAnnulus, dx: 0.34, dy: 0.08, radius: 175 },
      { point: RIGHT_VENTRICLE_ANCHORS.outflowTract, dx: 0.24, dy: 0.10, radius: 165 },
      { point: RIGHT_VENTRICLE_ANCHORS.freeWallCenter, dx: 1.00, dy: 0.00, radius: 225 },
      { point: RIGHT_VENTRICLE_ANCHORS.apex, dx: 0.24, dy: -0.34, radius: 190 },
      { point: RIGHT_VENTRICLE_ANCHORS.septalAttachment, dx: 0.04, dy: 0.00, radius: 150 }
    ];
    let weightedDx = 0;
    let weightedDy = 0;
    let totalWeight = 0;
    for (const anchor of vectorAnchors) {
      const deltaX = x - anchor.point.x;
      const deltaY = y - anchor.point.y;
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;
      const weight = Math.exp(-distanceSquared / (2 * anchor.radius * anchor.radius));
      weightedDx += anchor.dx * weight;
      weightedDy += anchor.dy * weight;
      totalWeight += weight;
    }
    const distanceToBoundary = Math.min(x - mesh.left, mesh.right - x, y - mesh.top, mesh.bottom - y);
    const boundaryBlend = smoothStep(clamp(distanceToBoundary / mesh.boundaryFadePx, 0, 1));
    const magnitude = delayedProgress * mesh.maximumInwardPx * boundaryBlend;
    return {
      x: magnitude * weightedDx / Math.max(0.0001, totalWeight),
      y: magnitude * weightedDy / Math.max(0.0001, totalWeight),
      delayedProgress,
      correction: delayedProgress
    };
  }

  function leftVentricleMeshDisplacement(x, y, phase) {
    const progress = windowEnvelope(phase, events.leftVentricleContractionStart, 0.330, 0.570);
    const region = { left: 350, top: 470, right: 768, bottom: 1088, boundaryFadePx: 82 };
    const distanceToBoundary = Math.min(x - region.left, region.right - x, y - region.top, region.bottom - y);
    const boundaryBlend = smoothStep(clamp(distanceToBoundary / region.boundaryFadePx, 0, 1));
    const anchors = [
      { x: 690, y: 750, dx: -1.00, dy: 0.00, radius: 235 },
      { x: 560, y: 980, dx: -0.18, dy: -0.38, radius: 210 },
      { x: 430, y: 775, dx: -0.05, dy: 0.00, radius: 175 },
      { x: 615, y: 560, dx: -0.28, dy: 0.08, radius: 175 }
    ];
    let weightedDx = 0;
    let weightedDy = 0;
    let totalWeight = 0;
    for (const anchor of anchors) {
      const deltaX = x - anchor.x;
      const deltaY = y - anchor.y;
      const weight = Math.exp(-(deltaX * deltaX + deltaY * deltaY) / (2 * anchor.radius * anchor.radius));
      weightedDx += anchor.dx * weight;
      weightedDy += anchor.dy * weight;
      totalWeight += weight;
    }
    const magnitude = progress * 50 * boundaryBlend;
    return {
      x: magnitude * weightedDx / Math.max(0.0001, totalWeight),
      y: magnitude * weightedDy / Math.max(0.0001, totalWeight),
      progress
    };
  }

  function wholeHeartMeshDisplacement(x, y, phase) {
    const left = leftVentricleMeshDisplacement(x, y, phase);
    const right = rightVentricleMeshDisplacement(x, y, phase);
    return { x: left.x + right.x, y: left.y + right.y };
  }

  function drawContinuousRightVentricleMesh(context, image, geometry, phase) {
    const mesh = WHOLE_HEART_MESH;
    const sourceWidth = Number(image && (image.naturalWidth || image.width)) || geometry.width;
    const sourceHeight = Number(image && (image.naturalHeight || image.height)) || geometry.height;
    const vertices = [];
    let maximumDisplacement = 0;
    for (let row = 0; row <= mesh.rows; row += 1) {
      const y = mesh.top + (mesh.bottom - mesh.top) * row / mesh.rows;
      const vertexRow = [];
      for (let column = 0; column <= mesh.columns; column += 1) {
        const x = mesh.left + (mesh.right - mesh.left) * column / mesh.columns;
        const displacement = wholeHeartMeshDisplacement(x, y, phase);
        maximumDisplacement = Math.max(maximumDisplacement, Math.hypot(displacement.x, displacement.y));
        vertexRow.push({
          source: { x: x * sourceWidth / geometry.width, y: y * sourceHeight / geometry.height },
          destination: { x: geometry.left + x + displacement.x, y: geometry.top + y + displacement.y }
        });
      }
      vertices.push(vertexRow);
    }
    for (let row = 0; row < mesh.rows; row += 1) {
      for (let column = 0; column < mesh.columns; column += 1) {
        const topLeft = vertices[row][column];
        const topRight = vertices[row][column + 1];
        const bottomLeft = vertices[row + 1][column];
        const bottomRight = vertices[row + 1][column + 1];
        drawImageTriangle(
          context,
          image,
          [topLeft.source, topRight.source, bottomRight.source],
          [topLeft.destination, topRight.destination, bottomRight.destination]
        );
        drawImageTriangle(
          context,
          image,
          [topLeft.source, bottomRight.source, bottomLeft.source],
          [topLeft.destination, bottomRight.destination, bottomLeft.destination]
        );
      }
    }
    const anchorDisplacements = {};
    for (const [name, point] of Object.entries(RIGHT_VENTRICLE_ANCHORS)) {
      const displacement = rightVentricleMeshDisplacement(point.x, point.y, phase);
      anchorDisplacements[name] = { x: displacement.x, y: displacement.y };
    }
    return {
      maximumDisplacementPx: maximumDisplacement,
      meshColumns: mesh.columns,
      meshRows: mesh.rows,
      boundaryFadePx: RIGHT_VENTRICLE_MESH.boundaryFadePx,
      anchorDisplacements,
      septalOnsetSeconds: events.rightVentricleContractionStart - 0.030,
      freeWallOnsetSeconds: events.rightVentricleContractionStart,
      separateFrameUsed: false,
      maskUsed: false
    };
  }

  function drawDelayedRightVentricularWave(context, geometry, progress, alpha) {
    if (progress <= 0 || alpha <= 0) return;
    const front = clamp(progress, 0.02, 0.98);
    const frontX = geometry.left + 430 - front * 318;
    context.save();
    traceRightVentricle(context, geometry);
    context.clip();
    context.globalCompositeOperation = "screen";
    context.globalAlpha = alpha;
    context.filter = "blur(5px)";
    context.strokeStyle = "rgba(126,232,244,0.72)";
    context.shadowColor = "rgba(43,181,211,0.48)";
    context.shadowBlur = 14;
    context.lineWidth = 30;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(frontX + 34, geometry.top + 560);
    context.bezierCurveTo(
      frontX - 8,
      geometry.top + 660,
      frontX - 20,
      geometry.top + 825,
      frontX + 58,
      geometry.top + 965
    );
    context.stroke();
    context.restore();

    const terminalProgress = smoothStep((progress - 0.72) / 0.28);
    if (terminalProgress > 0) {
      context.save();
      traceRightVentricle(context, geometry);
      context.clip();
      context.globalCompositeOperation = "screen";
      context.globalAlpha = alpha * terminalProgress;
      const terminal = context.createRadialGradient(
        geometry.left + 245,
        geometry.top + 635,
        12,
        geometry.left + 245,
        geometry.top + 635,
        118
      );
      terminal.addColorStop(0, "rgba(225,255,255,0.66)");
      terminal.addColorStop(0.45, "rgba(73,211,234,0.26)");
      terminal.addColorStop(1, "rgba(31,166,201,0)");
      context.fillStyle = terminal;
      context.fillRect(geometry.left + 70, geometry.top + 455, 350, 360);
      context.restore();
    }
  }

  function traceLeftVentricle(context, geometry) {
    context.beginPath();
    context.moveTo(geometry.left + 438, geometry.top + 565);
    context.bezierCurveTo(geometry.left + 550, geometry.top + 500, geometry.left + 720, geometry.top + 555, geometry.left + 742, geometry.top + 720);
    context.bezierCurveTo(geometry.left + 760, geometry.top + 875, geometry.left + 650, geometry.top + 1035, geometry.left + 505, geometry.top + 1038);
    context.bezierCurveTo(geometry.left + 430, geometry.top + 960, geometry.left + 400, geometry.top + 720, geometry.left + 438, geometry.top + 565);
    context.closePath();
  }

  function drawLeftVentricularWave(context, geometry, progress, alpha) {
    if (progress <= 0 || alpha <= 0) return;
    const front = clamp(progress, 0.02, 0.98);
    const frontX = geometry.left + 430 + front * 270;
    context.save();
    traceLeftVentricle(context, geometry);
    context.clip();
    context.globalCompositeOperation = "screen";
    context.globalAlpha = alpha;
    context.filter = "blur(5px)";
    context.strokeStyle = "rgba(255,226,104,0.78)";
    context.shadowColor = "rgba(255,177,35,0.48)";
    context.shadowBlur = 13;
    context.lineWidth = 32;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(frontX - 15, geometry.top + 575);
    context.bezierCurveTo(
      frontX + 22,
      geometry.top + 700,
      frontX + 8,
      geometry.top + 865,
      frontX - 80,
      geometry.top + 1015
    );
    context.stroke();
    context.restore();
  }

  function drawBaseHeart(context, state, config, design, frames) {
    const geometry = design.heart;
    const phase = state.cycleSeconds;
    context.fillStyle = design.background || "#ffffff";
    context.fillRect(0, 0, design.canvas.width, design.canvas.heartHeight);
    if (phase < events.hisStart) {
      // 心房・房室結節・His束までは、洞調律の承認済みフレーム推移をそのまま使用する。
      const sinusPhase = interpolateKeyframes(phase, [
        [0, 0],
        [events.pStart, 0.0375],
        [events.pEnd, 0.2171],
        [events.avEnd, 0.34],
        [events.hisEnd, 0.37],
        [events.qrsStart, 0.465]
      ]);
      const frame = frameAtSinusPhase(frames, sinusPhase);
      context.drawImage(frame, geometry.left, geometry.top, geometry.width, geometry.height);
      return {
        frameIndex: frames.indexOf(frame),
        rightPurkinjeActivated: false,
        rightVentricleRenderedFromSinusFrames: false,
        rightVentricleRenderedFromSeparateFrame: false,
        rightVentricleMaskCompositing: false,
        mode: "sinus-v24-identical-preventricular-spread"
      };
    }

    // 興奮の焼き込まれていない静止フレームのみを心室の基準面にする。
    const ventricularSourcePhase = 0;
    const leftFrame = frameAtSinusPhase(frames, ventricularSourcePhase);
    // 一枚の同一フレームを土台にし、右室は共有頂点メッシュの変位だけで遅延させる。
    // 別フレーム、マスク、切り抜きは使用しない。
    context.drawImage(leftFrame, geometry.left, geometry.top, geometry.width, geometry.height);
    const rightMesh = drawContinuousRightVentricleMesh(context, leftFrame, geometry, phase);
    const leftMyocardialProgress = clamp(
      (phase - events.leftVentricleActivationStart) / (events.leftVentricleActivationEnd - events.leftVentricleActivationStart),
      0,
      1
    );
    const leftExcitationFade = phase <= events.leftVentricleActivationEnd
      ? 1
      : 1 - clamp((phase - events.leftVentricleActivationEnd) / 0.010, 0, 1);
    drawLeftVentricularWave(context, geometry, leftMyocardialProgress, leftExcitationFade);
    const myocardialProgress = clamp(
      (phase - events.transseptalActivationStart) / (events.qrsEnd - events.transseptalActivationStart),
      0,
      1
    );
    const excitationFade = phase <= events.qrsEnd
      ? 1
      : 1 - clamp((phase - events.qrsEnd) / 0.035, 0, 1);
    drawDelayedRightVentricularWave(context, geometry, myocardialProgress, excitationFade);
    return {
      frameIndex: frames.indexOf(leftFrame),
      rightFrameIndex: frames.indexOf(leftFrame),
      rightPurkinjeActivated: false,
      rightVentricleRenderedFromSinusFrames: false,
      rightVentricleRenderedFromSeparateFrame: false,
      rightVentricleFullyAnimated: true,
      rightVentricleContinuousSurface: true,
      rightVentricleContinuousMesh: true,
      rightVentricleBoundaryFeatherPx: 0,
      rightVentricleMaskCompositing: false,
      rightVentricleMeshColumns: rightMesh.meshColumns,
      rightVentricleMeshRows: rightMesh.meshRows,
      rightVentricleMeshBoundaryFadePx: rightMesh.boundaryFadePx,
      rightVentricleMaximumDisplacementPx: rightMesh.maximumDisplacementPx,
      rightVentricleAnchorDisplacements: rightMesh.anchorDisplacements,
      rightVentricleSeptalMeshOnsetSeconds: rightMesh.septalOnsetSeconds,
      rightVentricleFreeWallMeshOnsetSeconds: rightMesh.freeWallOnsetSeconds,
      rightVentricleAnchors: Object.keys(RIGHT_VENTRICLE_ANCHORS),
      rightVentricleAnimatedRegions: ["tricuspid_annulus", "outflow_tract", "free_wall", "apex", "septal_attachment"],
      rightVentricleMyocardialWavefront: myocardialProgress > 0 && excitationFade > 0,
      leftVentricleMyocardialWavefront: leftMyocardialProgress > 0 && leftExcitationFade > 0,
      rightVentricleMyocardialProgress: myocardialProgress,
      rightVentricleTerminalRegion: myocardialProgress >= 0.72,
      mode: "resting-sinus-anatomy-sequential-lv-rv"
    };
  }

  function drawAtrialMechanical(context, state, config, design, frames) {
    const phase = state.cycleSeconds;
    const progress = windowEnvelope(phase, 0.075, 0.13, 0.205);
    return { active: progress > 0, progress, organized: true, chambers: ["right_atrium", "left_atrium"], embeddedInSinusFrames: true };
  }

  function drawVentricularMechanical(context, state, config, design, frames) {
    const phase = state.cycleSeconds;
    const leftProgress = windowEnvelope(phase, events.leftVentricleContractionStart, 0.330, 0.570);
    const rightProgress = windowEnvelope(phase, events.rightVentricleContractionStart, 0.560, 0.800);
    return {
      active: leftProgress > 0 || rightProgress > 0,
      progress: Math.max(leftProgress, rightProgress),
      leftProgress,
      rightProgress,
      rightDelaySeconds: events.rightVentricleContractionStart - events.leftVentricleContractionStart,
      mode: config.ventricularContraction.mode,
      embeddedInSinusFrames: false,
      qrsTriggered: true
    };
  }

  function drawBlockMark(context, x, y, active) {
    context.save();
    context.fillStyle = active ? "rgba(255,239,235,0.98)" : "rgba(255,248,246,0.92)";
    context.strokeStyle = "#C54835";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(x, y, active ? 17 : 14, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(x - 7, y - 7);
    context.lineTo(x + 7, y + 7);
    context.moveTo(x + 7, y - 7);
    context.lineTo(x - 7, y + 7);
    context.stroke();
    context.restore();
  }

  function drawPathFront(context, geometry, points, progress, width) {
    if (progress < 0 || progress > 1) return;
    context.save();
    context.translate(geometry.left, geometry.top);
    context.globalCompositeOperation = "screen";
    context.strokeStyle = "#ffffdc";
    context.shadowColor = "#ffe32d";
    context.shadowBlur = 20;
    context.lineWidth = width || 7;
    context.lineCap = "round";
    context.beginPath();
    const start = Math.max(0, progress - 0.22);
    for (let i = 0; i <= 20; i++) {
      const p = pointOnPolyline(points, start + (progress - start) * i / 20);
      if (i === 0) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y);
    }
    context.stroke();
    context.restore();
  }

  function drawConduction(context, state, config) {
    const geometry = config.visual.design.heart;
    const left = geometry.left;
    const top = geometry.top;
    const phase = state.cycleSeconds;
    let stage = "洞結節発火待機";

    if (phase >= events.pStart && phase < events.pEnd) {
      stage = "洞結節から両心房へ正常伝導";
    } else if (phase >= events.avStart && phase < events.avEnd) {
      stage = "房室結節で生理的遅延";
    } else if (phase >= events.hisStart && phase < events.hisEnd) {
      stage = "ヒス束（His束）まで正常伝導";
    } else if (phase >= events.bundleStart && phase < events.leftVentricleActivationStart + 0.055) {
      stage = "左脚・左脚前枝／後枝へ正常伝導";
    } else if (phase >= events.transseptalActivationStart && phase < events.qrsEnd) {
      stage = "左室から心筋間伝導で右室へ遅延興奮";
    }

    const hisProgress = (phase - events.hisStart) / (events.hisEnd - events.hisStart);
    drawPathFront(context, geometry, [[333,463],[353,493],[372,541]], hisProgress, 9);
    const fascicleProgress = (phase - events.bundleStart) / (events.qrsStart - events.bundleStart);
    drawPathFront(context, geometry, [[372,541],[415,596],[491,628],[560,676],[620,708]], fascicleProgress, 8);
    drawPathFront(context, geometry, [[372,541],[397,600],[405,697],[420,785],[474,859]], fascicleProgress, 8);
    const purkinjeProgress = (phase - events.qrsStart) / 0.035;
    for (const path of [
      [[620,708],[640,753],[656,824],[620,902],[550,949]],
      [[474,859],[508,889],[557,900],[612,844],[651,780]],
      [[474,859],[494,909],[538,949],[597,933],[660,877]]
    ]) drawPathFront(context, geometry, path, purkinjeProgress, 5);
    const blockActive = phase >= events.hisStart && phase <= events.qrsEnd;
    drawBlockMark(context, left + 330, top + 642, blockActive);
    return {
      stage,
      avConducted: phase >= events.avStart && phase <= events.hisEnd,
      avBlocked: false,
      avStatus: phase >= events.avStart && phase <= events.hisEnd ? "通過" : "待機",
      rightBundleBlocked: true,
      rightBundleSignalPropagated: false,
      leftBundleConducted: phase >= events.bundleStart && phase <= events.leftVentricleActivationStart + 0.055,
      transseptalToRightVentricle: phase >= events.transseptalActivationStart && phase <= events.qrsEnd,
      usesExistingAnatomicalConductionPaths: true,
      visualPropagationMode: "left-fascicles-only-short-wavefront",
      movingSignalDots: false,
      addedConductionLines: false,
      embeddedInCompositeFrame: false
    };
  }

  function drawActivationGlow(context, x, y, rx, ry, alpha, colorStops) {
    const gradient = context.createRadialGradient(x, y, 12, x, y, Math.max(rx, ry));
    gradient.addColorStop(0, colorStops[0].replace("ALPHA", String(0.36 * alpha)));
    gradient.addColorStop(0.55, colorStops[1].replace("ALPHA", String(0.17 * alpha)));
    gradient.addColorStop(1, colorStops[2]);
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    context.fill();
  }

  function drawActivation(context, state, activation, config) {
    const phase = state.cycleSeconds;
    const geometry = config.visual.design.heart;
    const left = geometry.left;
    const top = geometry.top;
    const atrial = phase >= events.pStart && phase <= events.pEnd;
    const leftProgress = clamp((phase - events.leftVentricleActivationStart) / (events.leftVentricleActivationEnd - events.leftVentricleActivationStart), 0, 1);
    const rightProgress = clamp((phase - events.rightVentricleActivationStart) / (events.qrsEnd - events.rightVentricleActivationStart), 0, 1);
    const leftActive = phase >= events.leftVentricleActivationStart && phase <= events.leftVentricleActivationEnd;
    const rightActive = phase >= events.rightVentricleActivationStart && phase <= events.qrsEnd;
    return {
      atrial,
      organizedAtrial: true,
      leftVentricle: leftActive,
      rightVentricle: rightActive,
      leftVentricleProgress: leftProgress,
      rightVentricleProgress: rightProgress,
      rightVentricleDelaySeconds: events.rightVentricleActivationStart - events.leftVentricleActivationStart,
      activationOrder: "left-first-right-delayed",
      ventricular: leftActive || rightActive,
      ventricularRepolarization: phase >= events.tStart && phase <= events.tEnd,
      embeddedInCompositeFrame: false,
      visualPropagationMode: "sinus-anatomy-independent-sequential-wavefronts",
      movingSignalDots: false
    };
  }

  function drawContraction(context, state) {
    const phase = state.cycleSeconds;
    const atrial = phase >= 0.075 && phase <= 0.205;
    const leftProgress = windowEnvelope(phase, events.leftVentricleContractionStart, 0.330, 0.570);
    const rightProgress = windowEnvelope(phase, events.rightVentricleContractionStart, 0.560, 0.800);
    return {
      atrial,
      atrialLocalQuiver: false,
      ventricular: leftProgress > 0 || rightProgress > 0,
      ventricularProgress: Math.max(leftProgress, rightProgress),
      leftVentricleProgress: leftProgress,
      rightVentricleProgress: rightProgress,
      rightVentricleDelaySeconds: events.rightVentricleContractionStart - events.leftVentricleContractionStart,
      embeddedInCompositeFrame: false
    };
  }

  function drawLeader(context, text, x, y, targetX, targetY, align) {
    context.font = "700 23px " + FONT;
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

  function drawPill(context, text, x, y, width, palette) {
    context.save();
    context.fillStyle = palette.fill;
    context.strokeStyle = palette.stroke;
    context.lineWidth = 2;
    roundedRect(context, x, y, width, 42, 10);
    context.fill();
    context.stroke();
    context.fillStyle = palette.text;
    context.font = "800 20px " + FONT;
    context.textAlign = "center";
    context.fillText(text, x + width / 2, y + 29);
    context.restore();
  }

  function drawLabels(context, state, config) {
    // Match the sinus ECG title and phase badge, using the free strip immediately
    // above the ECG so both accepted lead traces retain their size and position.
    const design = config.visual.design;
    const top = design.canvas.heartHeight - 60;
    const stageText = ecgStage(state.cycleSeconds);
    context.save();
    context.fillStyle = "#111827";
    context.font = "700 34px " + FONT;
    context.fillText(config.visual.ecgTitle, 28, top + 43);
    context.font = "700 30px " + FONT;
    const width = Math.ceil(context.measureText(stageText).width) + 36;
    const x = design.canvas.width - 28 - width;
    context.fillStyle = "#F1F5F9";
    roundedRect(context, x, top, width, 52, 9);
    context.fill();
    context.strokeStyle = "#CBD5E1";
    context.lineWidth = 1.5;
    context.stroke();
    context.fillStyle = "#111827";
    context.textAlign = "right";
    context.fillText(stageText, design.canvas.width - 46, top + 37);
    context.restore();
    return { labelsVisible: true, embeddedInCompositeFrame: false, teachingStage: stageText };
  }

  function piecewise(points, time) {
    if (time < points[0][0] || time > points[points.length - 1][0]) return 0;
    for (let index = 1; index < points.length; index += 1) {
      if (time <= points[index][0]) {
        const previous = points[index - 1];
        const next = points[index];
        const progress = (time - previous[0]) / Math.max(0.00001, next[0] - previous[0]);
        return previous[1] + (next[1] - previous[1]) * progress;
      }
    }
    return 0;
  }

  // Fixed coordinates digitized from the supplied V1 and V6 images.
  const MORPHOLOGY = Object.freeze({"V1":[[0,0],[0.010909,-0.013333],[0.014545,-0.053333],[0.018182,-0.013333],[0.021818,-0.013333],[0.025455,0.0],[0.029091,0.0],[0.032727,0.0],[0.036364,-0.013333],[0.04,-0.013333],[0.043636,-0.053333],[0.047273,-0.013333],[0.050909,-0.013333],[0.054545,-0.013333],[0.058182,0.0],[0.061818,-0.013333],[0.065455,-0.013333],[0.069091,-0.013333],[0.072727,-0.013333],[0.076364,-0.013333],[0.08,-0.013333],[0.083636,-0.013333],[0.087273,-0.013333],[0.090909,-0.013333],[0.094545,-0.013333],[0.098182,-0.013333],[0.101818,-0.013333],[0.105455,-0.013333],[0.109091,-0.013333],[0.112727,0.0],[0.116364,0.0],[0.12,0.0],[0.123636,-0.013333],[0.127273,-0.013333],[0.130909,-0.013333],[0.134545,-0.013333],[0.138182,-0.013333],[0.141818,-0.013333],[0.145455,-0.013333],[0.149091,0.0],[0.152727,0.0],[0.156364,0.0],[0.16,0.0],[0.163636,0.0],[0.167273,0.0],[0.170909,0.0],[0.174545,0.013333],[0.178182,0.013333],[0.181818,0.013333],[0.185455,0.013333],[0.189091,0.013333],[0.192727,0.013333],[0.196364,0.013333],[0.2,0.013333],[0.203636,0.013333],[0.207273,0.013333],[0.210909,0.106667],[0.214545,0.053333],[0.218182,0.066667],[0.221818,0.093333],[0.225455,0.133333],[0.229091,0.053333],[0.232727,0.0],[0.236364,-0.106667],[0.24,-0.173333],[0.243636,-0.266667],[0.247273,-0.28],[0.250909,-0.24],[0.254545,-0.173333],[0.258182,-0.093333],[0.261818,-0.013333],[0.265455,0.24],[0.269091,0.44],[0.272727,0.733333],[0.276364,0.84],[0.28,0.946667],[0.283636,0.986667],[0.287273,0.84],[0.290909,0.64],[0.294545,0.48],[0.298182,0.346667],[0.301818,0.173333],[0.305455,0.066667],[0.309091,0.08],[0.312727,0.08],[0.316364,0.08],[0.32,0.08],[0.323636,0.08],[0.327273,0.08],[0.330909,0.066667],[0.334545,0.066667],[0.338182,0.08],[0.341818,0.08],[0.345455,0.066667],[0.349091,0.066667],[0.352727,0.066667],[0.356364,0.066667],[0.36,0.066667],[0.363636,0.053333],[0.367273,0.066667],[0.370909,0.066667],[0.374545,0.066667],[0.378182,0.066667],[0.381818,0.08],[0.385455,0.093333],[0.389091,0.093333],[0.392727,0.08],[0.396364,0.066667],[0.4,0.053333],[0.403636,0.04],[0.407273,0.026667],[0.410909,-0.013333],[0.414545,-0.04],[0.418182,-0.04],[0.421818,-0.026667],[0.425455,-0.013333],[0.429091,0.0],[0.432727,0.0],[0.436364,0.0],[0.44,-0.013333],[0.443636,-0.013333],[0.447273,-0.026667],[0.450909,-0.04],[0.454545,-0.053333],[0.458182,-0.066667],[0.461818,-0.08],[0.465455,-0.08],[0.469091,-0.093333],[0.472727,-0.106667],[0.476364,-0.12],[0.48,-0.133333],[0.483636,-0.16],[0.487273,-0.173333],[0.490909,-0.173333],[0.494545,-0.2],[0.498182,-0.226667],[0.501818,-0.24],[0.505455,-0.266667],[0.509091,-0.293333],[0.512727,-0.306667],[0.516364,-0.333333],[0.52,-0.346667],[0.523636,-0.36],[0.527273,-0.373333],[0.530909,-0.386667],[0.534545,-0.413333],[0.538182,-0.426667],[0.541818,-0.44],[0.545455,-0.453333],[0.549091,-0.4],[0.552727,-0.453333],[0.556364,-0.453333],[0.56,-0.453333],[0.563636,-0.44],[0.567273,-0.426667],[0.570909,-0.413333],[0.574545,-0.386667],[0.578182,-0.373333],[0.581818,-0.346667],[0.585455,-0.32],[0.589091,-0.306667],[0.592727,-0.266667],[0.596364,-0.253333],[0.6,-0.213333],[0.603636,-0.186667],[0.607273,-0.173333],[0.610909,-0.173333],[0.614545,-0.12],[0.618182,-0.093333],[0.621818,-0.08],[0.625455,-0.053333],[0.629091,-0.026667],[0.632727,-0.013333],[0.636364,-0.013333],[0.64,0.0],[0.643636,0.013333],[0.647273,0.026667],[0.650909,0.04],[0.654545,0.053333],[0.658182,0.066667],[0.661818,0.066667],[0.665455,0.08],[0.669091,0.08],[0.672727,0.053333],[0.676364,0.08],[0.68,0.08],[0.683636,0.08],[0.687273,0.08],[0.690909,0.08],[0.694545,0.08],[0.698182,0.08],[0.701818,0.066667],[0.705455,0.066667],[0.709091,0.066667],[0.712727,0.066667],[0.716364,0.066667],[0.72,0.066667],[0.723636,0.066667],[0.727273,0.053333],[0.730909,0.053333],[0.734545,0.053333],[0.738182,0.053333],[0.741818,0.053333],[0.745455,0.053333],[0.749091,0.053333],[0.752727,0.066667],[0.756364,0.066667],[0.76,0.066667],[0.763636,0.053333],[0.767273,0.053333],[0.770909,0.066667],[0.774545,0.066667],[0.778182,0.066667],[0.781818,0.066667],[0.785455,0.066667],[0.789091,0.066667],[0.792727,0.053333],[0.796364,0.053333],[0.8,0.066667],[0.803636,0.066667],[0.807273,0.066667],[0.810909,0.066667],[0.814545,0.066667],[0.818182,0.053333],[0.821818,0.053333],[0.825455,0.053333],[0.829091,0.053333],[0.832727,0.053333],[0.836364,0.053333],[0.84,0.053333],[0.843636,0.04],[0.847273,0.04],[0.850909,0.04],[0.854545,0.04],[0.858182,0.04],[0.861818,0.04],[0.865455,0.026667],[0.869091,0.026667],[0.872727,0.026667],[0.876364,0.026667],[0.88,0.013333],[0.883636,0.013333],[0.887273,0.013333],[0.890909,0.013333],[0.894545,0.013333],[0.898182,0.013333],[0.901818,0.013333],[0.905455,0.0],[0.909091,0.0],[0.912727,0.0],[0.916364,0.0],[0.92,-0.066667],[0.923636,-0.013333],[0.927273,-0.013333],[0.930909,-0.013333],[0.934545,-0.013333],[0.938182,-0.013333],[0.941818,-0.013333],[0.945455,-0.026667],[0.949091,-0.066667],[0.952727,-0.026667],[0.956364,-0.026667],[0.96,-0.026667],[0.963636,-0.026667],[0.967273,-0.026667],[0.970909,-0.026667],[0.974545,-0.026667],[0.978182,-0.026667],[0.981818,-0.026667],[0.985455,-0.026667],[0.989091,-0.026667],[0.992727,-0.026667],[0.996364,-0.04],[1,0]],"V6":[[0,0],[0.018182,0.053333],[0.021818,0.053333],[0.025455,0.066667],[0.029091,0.066667],[0.032727,0.066667],[0.036364,0.066667],[0.04,0.053333],[0.043636,0.053333],[0.047273,0.053333],[0.050909,0.053333],[0.054545,0.053333],[0.058182,0.053333],[0.061818,0.053333],[0.065455,0.053333],[0.069091,0.053333],[0.072727,0.053333],[0.076364,0.053333],[0.08,0.053333],[0.083636,0.053333],[0.087273,-0.013333],[0.090909,0.04],[0.094545,0.04],[0.098182,0.04],[0.101818,0.04],[0.105455,0.04],[0.109091,0.04],[0.112727,0.053333],[0.116364,0.04],[0.12,-0.013333],[0.123636,0.053333],[0.127273,0.04],[0.130909,0.04],[0.134545,0.04],[0.138182,0.04],[0.141818,0.026667],[0.145455,0.026667],[0.149091,0.026667],[0.152727,0.026667],[0.156364,0.026667],[0.16,0.026667],[0.163636,0.013333],[0.167273,0.013333],[0.170909,0.013333],[0.174545,0.026667],[0.178182,-0.013333],[0.181818,0.026667],[0.185455,0.026667],[0.189091,0.013333],[0.192727,0.013333],[0.196364,0.013333],[0.2,0.013333],[0.203636,0.0],[0.207273,0.0],[0.210909,-0.013333],[0.214545,-0.013333],[0.218182,-0.053333],[0.221818,-0.08],[0.225455,-0.08],[0.229091,0.026667],[0.232727,0.066667],[0.236364,0.293333],[0.24,0.44],[0.243636,0.6],[0.247273,0.48],[0.250909,0.36],[0.254545,0.2],[0.258182,0.093333],[0.261818,-0.08],[0.265455,-0.213333],[0.269091,-0.24],[0.272727,-0.36],[0.276364,-0.453333],[0.28,-0.426667],[0.283636,-0.4],[0.287273,-0.466667],[0.290909,-0.333333],[0.294545,-0.24],[0.298182,-0.133333],[0.301818,-0.066667],[0.305455,-0.053333],[0.309091,-0.053333],[0.312727,-0.053333],[0.316364,-0.053333],[0.32,-0.04],[0.323636,-0.04],[0.327273,-0.04],[0.330909,-0.026667],[0.334545,-0.04],[0.338182,-0.04],[0.341818,-0.04],[0.345455,-0.04],[0.349091,-0.053333],[0.352727,-0.053333],[0.356364,-0.066667],[0.36,-0.066667],[0.363636,-0.066667],[0.367273,-0.08],[0.370909,-0.08],[0.374545,-0.093333],[0.378182,-0.093333],[0.381818,-0.093333],[0.385455,-0.093333],[0.389091,-0.093333],[0.392727,-0.133333],[0.396364,-0.106667],[0.4,-0.106667],[0.403636,-0.106667],[0.407273,-0.106667],[0.410909,-0.106667],[0.414545,-0.106667],[0.418182,-0.106667],[0.421818,-0.106667],[0.425455,-0.106667],[0.429091,-0.093333],[0.432727,-0.093333],[0.436364,-0.093333],[0.44,-0.08],[0.443636,-0.08],[0.447273,-0.066667],[0.450909,-0.053333],[0.454545,-0.053333],[0.458182,-0.04],[0.461818,-0.04],[0.465455,-0.026667],[0.469091,-0.013333],[0.472727,0.0],[0.476364,0.013333],[0.48,0.026667],[0.483636,0.04],[0.487273,0.08],[0.490909,0.093333],[0.494545,0.106667],[0.498182,0.106667],[0.501818,0.146667],[0.505455,0.146667],[0.509091,0.16],[0.512727,0.186667],[0.516364,0.2],[0.52,0.213333],[0.523636,0.226667],[0.527273,0.24],[0.530909,0.24],[0.534545,0.253333],[0.538182,0.253333],[0.541818,0.253333],[0.545455,0.253333],[0.549091,0.213333],[0.552727,0.24],[0.556364,0.226667],[0.56,0.213333],[0.563636,0.2],[0.567273,0.186667],[0.570909,0.16],[0.574545,0.146667],[0.578182,0.133333],[0.581818,0.106667],[0.585455,0.106667],[0.589091,0.08],[0.592727,0.08],[0.596364,0.066667],[0.6,0.053333],[0.603636,0.04],[0.607273,0.013333],[0.610909,-0.013333],[0.614545,0.0],[0.618182,0.0],[0.621818,-0.013333],[0.625455,-0.013333],[0.629091,-0.013333],[0.632727,-0.013333],[0.636364,-0.026667],[0.64,-0.026667],[0.643636,-0.026667],[0.647273,-0.04],[0.650909,-0.04],[0.654545,-0.026667],[0.658182,-0.026667],[0.661818,-0.026667],[0.665455,-0.026667],[0.669091,-0.026667],[0.672727,-0.013333],[0.676364,-0.013333],[0.68,-0.013333],[0.683636,-0.013333],[0.687273,-0.013333],[0.690909,0.0],[0.694545,0.0],[0.698182,0.0],[0.701818,-0.013333],[0.705455,0.0],[0.709091,0.0],[0.712727,0.0],[0.716364,0.013333],[0.72,0.013333],[0.723636,0.013333],[0.727273,0.013333],[0.730909,0.0],[0.734545,-0.013333],[0.738182,0.0],[0.741818,0.0],[0.745455,-0.013333],[0.749091,0.0],[0.752727,0.0],[0.756364,0.0],[0.76,0.0],[0.763636,0.0],[0.767273,0.0],[0.770909,0.0],[0.774545,0.0],[0.778182,0.0],[0.781818,0.0],[0.785455,-0.013333],[0.789091,-0.013333],[0.792727,-0.013333],[0.796364,-0.013333],[0.8,0.0],[0.803636,0.0],[0.807273,-0.013333],[0.810909,0.0],[0.814545,0.0],[0.818182,-0.013333],[0.821818,-0.013333],[0.825455,-0.013333],[0.829091,0.0],[0.832727,0.0],[0.836364,0.0],[0.84,0.0],[0.843636,0.0],[0.847273,0.0],[0.850909,0.0],[0.854545,0.0],[0.858182,0.0],[0.861818,0.0],[0.865455,0.013333],[0.869091,0.013333],[0.872727,0.013333],[0.876364,0.013333],[0.88,0.013333],[0.883636,0.013333],[0.887273,0.013333],[0.890909,0.013333],[0.894545,0.013333],[0.898182,0.026667],[0.901818,0.013333],[0.905455,0.013333],[0.909091,0.013333],[0.912727,0.026667],[0.916364,0.026667],[0.92,0.026667],[0.923636,0.026667],[0.927273,0.026667],[0.930909,0.026667],[0.934545,0.026667],[0.938182,0.026667],[0.941818,0.026667],[0.945455,0.026667],[0.949091,0.026667],[0.952727,0.026667],[0.956364,0.026667],[0.96,0.04],[0.963636,0.04],[0.967273,0.04],[0.970909,0.04],[0.974545,0.04],[0.978182,0.04],[0.981818,0.04],[0.985455,0.04],[0.989091,0.04],[0.992727,0.04],[0.996364,0.04],[1,0]]});

  // Keep the accepted QRS/ST/T amplitudes; map only their time coordinates
  // to the locked cardiac electrical events. Mechanical timing stays separate.
  const ECG_POINTS = Object.freeze(Object.fromEntries(["V1", "V6"].map(lead => {
    const tStart = lead === "V1" ? 0.44 : 0.461818;
    const tEnd = lead === "V1" ? 0.665455 : 0.636364;
    const anchors = [[0,0], [0.2,events.qrsStart], [0.265455,events.rightVentricleActivationStart],
      [0.32,events.qrsEnd], [tStart,events.tStart], [tEnd,events.tEnd], [1,1]];
    const points = MORPHOLOGY[lead].filter(p => p[0] >= 0.2).map(([time,value]) =>
      [interpolateKeyframes(time, anchors),value]);
    // Organized atrial excitation needs a visible P wave before ventricular excitation.
    const atrial = [[0,0], [events.pStart,0]];
    for (let i=1;i<=32;i++) {
      const progress=i/32;
      atrial.push([events.pStart+(events.pEnd-events.pStart)*progress,
        (lead === "V1" ? 0.08 : 0.10)*Math.sin(Math.PI*progress)**2]);
    }
    atrial.push([events.qrsStart-0.001,0]);
    return [lead,Object.freeze(atrial.concat(points).map(Object.freeze))];
  })));

  function ecgAmplitude(time, lead) {
    const local = ((time % 1) + 1) % 1;
    return piecewise(ECG_POINTS[lead], local);
  }

  function ecgStage(phase) {
    if (phase < events.pStart) return "洞結節発火";
    if (phase < events.pEnd) return "P波｜両心房の脱分極";
    if (phase < events.avEnd) return "房室結節で生理的遅延";
    if (phase < events.hisEnd) return "ヒス束（His束）へ伝導";
    if (phase < events.qrsStart) return "右脚遮断・左脚は伝導";
    if (phase < events.septalActivationEnd) return "QRS第1相｜中隔興奮";
    if (phase < events.rightVentricleActivationStart) return "QRS第2相｜左室優位興奮";
    if (phase < events.qrsEnd) return "QRS第3相｜遅れた右室終末興奮";
    if (phase < events.tStart) return "ST部分｜二次性変化";
    if (phase < events.tEnd) return "T波｜心室再分極";
    return "TP部分｜規則的洞調律";
  }

  function drawGrid(context, left, right, top, bottom, smallBox) {
    context.fillStyle = "#fffdfd";
    context.fillRect(left, top, right - left, bottom - top);
    for (let x = left, index = 0; x <= right + 0.1; x += smallBox, index += 1) {
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x, bottom);
      context.strokeStyle = index % 5 === 0 ? "#edb7bd" : "#f8e1e4";
      context.lineWidth = index % 5 === 0 ? 1 : 0.65;
      context.stroke();
    }
    for (let y = top, index = 0; y <= bottom + 0.1; y += smallBox, index += 1) {
      context.beginPath();
      context.moveTo(left, y);
      context.lineTo(right, y);
      context.strokeStyle = index % 5 === 0 ? "#edb7bd" : "#f8e1e4";
      context.lineWidth = index % 5 === 0 ? 1 : 0.65;
      context.stroke();
    }
  }

  function drawLead(context, lead, top, state, config, style) {
    const left = 28;
    const right = style.width - 30;
    const duration = config.duration.totalSeconds;
    const pixelsPerSecond = (right - left) / duration;
    const baseline = top + 118;
    const scale = 85;
    drawGrid(context, left, right, top, top + 172, pixelsPerSecond * 0.04);
    context.save();
    context.beginPath(); context.rect(left, top, right - left, 172); context.clip();
    context.strokeStyle = style.trace;
    context.lineWidth = 2.5;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.beginPath();
    const elapsed = clamp(state.timeSeconds, 0, duration);
    const rr = state.rrIntervalMs / 1000;
    // Draw the actual digitized vertices, so narrow peaks are never lost by sampling.
    context.moveTo(left, baseline);
    for (let beat = 0; beat * rr <= elapsed; beat++) {
      for (const [time, amplitude] of ECG_POINTS[lead]) {
        const absolute = beat * rr + time;
        if (absolute > elapsed) break;
        context.lineTo(left + absolute * pixelsPerSecond, baseline - amplitude * scale);
      }
    }
    context.lineTo(left + elapsed * pixelsPerSecond, baseline - ecgAmplitude(state.cycleSeconds, lead) * scale);
    context.stroke(); context.restore();
    context.fillStyle = "#111827";
    context.font = "700 25px " + FONT;
    context.fillText(lead, left + 8, top + 29);
    return { terminalHighlighted: false, paperSpeedMmPerSecond: 25,
      smallBoxDurationSeconds: 0.04, qrsSmallBoxes: (events.qrsEnd-events.qrsStart)/0.04 };
  }

  function drawEcg(context, state, config, design) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, design.ecg.width, design.ecg.height);
    const v1 = drawLead(context, "V1", 14, state, config, design.ecg);
    drawLead(context, "V6", 210, state, config, design.ecg);
    return {
      time: state.timeSeconds, progress: state.timeSeconds / config.duration.totalSeconds,
      sequenceProgress: state.timeSeconds / config.duration.totalSeconds,
      stage: ecgStage(state.cycleSeconds), pWavePresent: true,
      leads: ["V1", "V6"], leadMorphologies: {V1:"rSR_prime",V6:"broad_terminal_S"},
      renderingMode: "independent_vector_path_per_lead",
      qrsPhases: ["septal_activation", "left_ventricular_dominant_activation", "delayed_right_ventricular_terminal_activation"],
      qrsWidthSeconds: events.qrsEnd-events.qrsStart, qrsSmallBoxes: v1.qrsSmallBoxes,
      smallBoxDurationSeconds: 0.04, paperSpeedMmPerSecond: 25,
      synchronizedLeadEvents: true, ventricularActivationOrder: "left-first-right-delayed",
      terminalRPrimeHighlighted: false, terminalSHighlighted: false,
      delayedRightVentricularActivationActive: state.cycleSeconds>=events.rightVentricleActivationStart && state.cycleSeconds<=events.qrsEnd,
      panelPlacement: "below-heart-sinus-position", displayedBeats: state.timeSeconds / (state.rrIntervalMs/1000),
      referenceTrace: "assets/ecg/rbbb-reference/traced-waveforms.json"
    };
  }

  const config = {
    id: "right-bundle-branch-block",
    name: "右脚ブロック",
    abbreviation: "RBBB",
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
      mode: "normal_sinus",
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
      mode: "rbbb",
      pathways: ["his_bundle", "left_bundle_branch", "left_anterior_fascicle", "left_posterior_fascicle", "left_purkinje_network"],
      blockedPathways: ["right_bundle_branch"],
      rightBundleBranch: { conduction: "blocked", signal: "stops_at_proximal_segment" },
      leftBundleBranch: { conduction: "normal", fascicles: ["left_anterior_fascicle", "left_posterior_fascicle"] }
    },
    ventricularActivation: {
      origin: "supraventricular",
      mode: "left-first-right-delayed",
      qrsWidthMode: "wide",
      ecgSyncEvent: "qrs",
      leftVentricleStartSeconds: 0.20,
      rightVentricleStartSeconds: 0.270,
      rightVentricleDelayMs: 70,
      rightVentricleMechanism: "transseptal_myocardial_spread_from_left_ventricle"
    },
    atrialContraction: { enabled: true, timing: "after_atrial_depolarization", mode: "organized" },
    ventricularContraction: {
      enabled: true,
      timing: "slightly_dyssynchronous_after_ventricular_depolarization",
      mode: "left_first_right_slightly_delayed",
      leftStartSeconds: events.leftVentricleContractionStart,
      rightStartSeconds: events.rightVentricleContractionStart,
      rightDelayMs: 210
    },
    ecg: {
      lead: "V1",
      leads: ["V1", "V6"],
      pWave: { present: true, morphology: "sinus_p_waves_in_V1_and_V6", timing: "pWave" },
      prInterval: { present: true, durationMode: "physiologic", durationMs: 180 },
      qrs: {
        morphology: { V1: "rSR_prime", V6: "broad_terminal_S" },
        widthMode: "wide",
        durationMs: 120,
        timing: "qrs",
        V1: { pattern: "rSR_prime", terminalRPrime: true, terminalRPrimeStrength: 0.78 },
        V6: { pattern: "broad_terminal_S", broadTerminalS: true, terminalSStrength: 0.35 }
      },
      stSegment: { morphology: { V1: "secondary_depression", V6: "near_isoelectric" } },
      tWave: {
        morphology: { V1: "secondary_inversion", V6: "upright" },
        timing: "tWave",
        represents: "ventricular_repolarization"
      },
      baseline: { mode: "isoelectric" },
      rrPattern: { mode: "regular" },
      synchronizedFromSingleEvent: true
    },
    timing: { units: "seconds-within-cycle", events },
    renderModel: {
      mode: "rbbb-single-sinus-v24-frame-plus-continuous-rv-mesh-wavefront",
      sourceFrameCount: 120,
      heartFrames: sinusFrames,
      anatomySource: "sinus-v24/000-119.webp",
      mechanicalLayersSeparated: true,
      layerOrder: ["base_anatomy", "atrial_mechanical", "ventricular_mechanical", "electrical_conduction", "myocardial_activation", "labels", "two_lead_ecg"],
      physiologyLayers: ["normal_atrial_activation", "normal_av_his_conduction", "blocked_right_bundle", "left_bundle_fascicles", "left_ventricle_activation", "transseptal_right_ventricle_activation", "slightly_dyssynchronous_contraction"]
    },
    visual: {
      design: RBBB_DESIGN,
      playbackRate: 1,
      playbackRates: [1, 0.5, 0.25],
      designId: "rbbb-education-sinus-ecg-position",
      screenTitle: "右脚ブロック",
      documentTitle: "右脚ブロックとV1・V6誘導心電図",
      ariaLabel: "上段に右脚ブロックの心臓内伝導、下段に同期したV1誘導・V6誘導心電図を示す医療教育アニメーション",
      ecgTitle: "右脚ブロック",
      ecgCaption: "模式波形・洞調律 HR 60回/分・QRS 120 ms",
      ecgCalibration: "25 mm/秒相当｜V1：rSR′｜V6：幅広い終末S波",
      explanation: "右脚ブロックは心房リズム異常ではなく心室内伝導障害です。洞結節からヒス束までは正常に伝わり、左脚・左脚前枝・左脚後枝を通って左室が先に興奮します。右脚は遮断され、右室は左室側からの心筋間伝導で遅れて興奮します。V1・V6は提供画像の波形を座標化し、同じ拍動イベントから5拍連続で描画します。初期再生は1倍速で、0.5倍速・0.25倍速に切り替えられます。P波とT波は固定した心臓イベントへ同期し、QRSは心室の電気的興奮に対応します。収縮の時間差と変形量は教育用に強調し、左室の収縮開始は210 ms、右室自由壁は420 msです。画像からのトレースであり診断用実測データではありません。"
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
    }
  };

  return config;
});


