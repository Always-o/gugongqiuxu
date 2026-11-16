/* ===========================================================
   故宫秋序 · 场景渲染引擎
   纯 SVG 程序化绘制：天际线 / 太和殿 / 角楼 / 御花园 / 金水河
   不依赖任何外部图片，离线可跑
   =========================================================== */

(function () {
  const NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    if (attrs) {
      for (const k in attrs) {
        if (attrs[k] !== undefined && attrs[k] !== null) node.setAttribute(k, attrs[k]);
      }
    }
    return node;
  }

  function svg(viewBox, cls) {
    const s = el('svg', { viewBox: viewBox, preserveAspectRatio: 'xMidYMax slice', class: cls || 'scene-svg' });
    return s;
  }

  function defsGradient(id, stops) {
    const g = el('linearGradient', { id: id, x1: '0', y1: '0', x2: '0', y2: '1' });
    stops.forEach(function (s) {
      g.appendChild(el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] === undefined ? 1 : s[2] }));
    });
    return g;
  }

  /* ---------------- 屋顶 ---------------- */

  // 庑殿顶：反宇（凹曲面）+ 檐角上翘 + 檐口描光
  function roofPath(x, y, w, h) {
    return [
      'M', x - 0.02 * w, y + 0.87 * h,
      'C', x + 0.21 * w, y + 0.87 * h, x + 0.27 * w, y + 0.34 * h, x + 0.32 * w, y,
      'L', x + 0.68 * w, y,
      'C', x + 0.73 * w, y + 0.34 * h, x + 0.79 * w, y + 0.87 * h, x + 1.02 * w, y + 0.87 * h,
      'L', x + 0.978 * w, y + 0.98 * h,
      'L', x + 0.022 * w, y + 0.98 * h,
      'Z'
    ].join(' ');
  }

  function hipRoof(g, x, y, w, h, fill, rim, rimOp) {
    const d = roofPath(x, y, w, h);
    g.appendChild(el('path', { d: d, fill: fill }));
    if (rim) {
      g.appendChild(el('path', {
        d: d, fill: 'none', stroke: rim, 'stroke-width': Math.max(0.8, w * 0.0035),
        opacity: rimOp === undefined ? 0.22 : rimOp, 'stroke-linejoin': 'round'
      }));
    }
    // 正脊两端鸱吻
    g.appendChild(el('path', {
      d: 'M ' + (x + 0.31 * w) + ' ' + y + ' l ' + (-0.022 * w) + ' ' + (-h * 0.10)
        + ' l ' + (0.022 * w) + ' ' + (h * 0.10) + ' Z',
      fill: fill
    }));
    g.appendChild(el('path', {
      d: 'M ' + (x + 0.69 * w) + ' ' + y + ' l ' + (0.022 * w) + ' ' + (-h * 0.10)
        + ' l ' + (-0.022 * w) + ' ' + (h * 0.10) + ' Z',
      fill: fill
    }));
  }

  // 攒尖顶（亭）
  function tentRoof(g, cx, y, w, h, fill, rim) {
    const d = [
      'M', cx - 0.035 * w, y,
      'C', cx - 0.14 * w, y + 0.30 * h, cx - 0.44 * w, y + 0.60 * h, cx - 0.50 * w, y + 0.88 * h,
      'Q', cx - 0.52 * w, y + 0.98 * h, cx - 0.50 * w, y + 1.04 * h,
      'Q', cx, y + 1.14 * h, cx + 0.50 * w, y + 1.04 * h,
      'Q', cx + 0.52 * w, y + 0.98 * h, cx + 0.50 * w, y + 0.88 * h,
      'C', cx + 0.44 * w, y + 0.60 * h, cx + 0.14 * w, y + 0.30 * h, cx + 0.035 * w, y,
      'Z'
    ].join(' ');
    g.appendChild(el('path', { d: d, fill: fill }));
    if (rim) g.appendChild(el('path', { d: d, fill: 'none', stroke: rim, 'stroke-width': 0.9, opacity: 0.2 }));
    g.appendChild(el('circle', { cx: cx, cy: y - h * 0.06, r: w * 0.018, fill: fill }));
  }

  /* 单体建筑 */
  function building(g, cfg) {
    const x = cfg.x, w = cfg.w, baseY = cfg.baseY;
    const bodyH = cfg.bodyH, roofH = cfg.roofH, tiers = cfg.tiers || 1;
    const fill = cfg.fill, rim = cfg.rim, op = cfg.opacity === undefined ? 1 : cfg.opacity;

    // 三层台基
    const pw = w * 1.12;
    for (let i = 0; i < 3; i++) {
      const pw2 = pw - i * (w * 0.038);
      const py = baseY - 7 - i * 6.5;
      g.appendChild(el('rect', { x: x + (w - pw2) / 2, y: py, width: pw2, height: 7, fill: fill, opacity: op }));
      if (rim) {
        g.appendChild(el('rect', {
          x: x + (w - pw2) / 2, y: py, width: pw2, height: 7, fill: rim, opacity: 0.07 * op
        }));
        g.appendChild(el('rect', {
          x: x + (w - pw2) / 2, y: py, width: pw2, height: 1, fill: rim, opacity: 0.30 * op
        }));
      }
    }

    // 屋身（略透，形成层次）
    const bodyY = baseY - 22 - bodyH;
    g.appendChild(el('rect', {
      x: x + 0.07 * w, y: bodyY, width: 0.86 * w, height: bodyH + 16, fill: fill, opacity: op * 0.88
    }));
    // 檐下阴影带
    g.appendChild(el('rect', {
      x: x + 0.07 * w, y: bodyY, width: 0.86 * w, height: bodyH * 0.16, fill: fill, opacity: op
    }));
    // 匾额
    if (rim) {
      g.appendChild(el('rect', {
        x: x + 0.44 * w, y: bodyY + bodyH * 0.22, width: 0.12 * w, height: bodyH * 0.24,
        fill: rim, opacity: 0.18 * op
      }));
      // 隔扇（竖向分格）
      const cols = 11;
      for (let i = 1; i < cols; i++) {
        const cxm = x + 0.07 * w + (0.86 * w) * i / cols;
        g.appendChild(el('rect', {
          x: cxm, y: bodyY + bodyH * 0.30, width: Math.max(0.6, w * 0.002), height: bodyH * 0.70 + 16,
          fill: rim, opacity: 0.09 * op
        }));
      }
      // 额枋
      g.appendChild(el('rect', {
        x: x + 0.07 * w, y: bodyY + bodyH * 0.24, width: 0.86 * w, height: Math.max(0.8, w * 0.0025),
        fill: rim, opacity: 0.14 * op
      }));
    }

    if (tiers > 1) {
      // 下檐
      hipRoof(g, x + 0.04 * w, bodyY - roofH * 0.94, 0.92 * w, roofH * 0.94, fill, rim, 0.26 * op);
      // 平座（矮）
      const upH = roofH * 0.34;
      g.appendChild(el('rect', {
        x: x + 0.20 * w, y: bodyY - roofH * 0.94 - upH, width: 0.60 * w, height: upH,
        fill: fill, opacity: op * 0.92
      }));
      // 上檐
      hipRoof(g, x + 0.16 * w, bodyY - roofH * 0.94 - upH - roofH * 0.80, 0.68 * w, roofH * 0.80, fill, rim, 0.3 * op);
    } else {
      hipRoof(g, x, bodyY - roofH, w, roofH, fill, rim, 0.24 * op);
    }
  }

  /* 连排庑房 */
  function colonnade(g, cfg) {
    for (let i = 0; i < cfg.count; i++) {
      building(g, {
        x: cfg.x + i * cfg.step, w: cfg.w, baseY: cfg.baseY,
        bodyH: cfg.bodyH, roofH: cfg.roofH, tiers: 1,
        fill: cfg.fill, rim: cfg.rim, opacity: cfg.opacity
      });
    }
  }

  /* 宫墙 */
  function palaceWall(g, x, y, w, h, fill, rim) {
    g.appendChild(el('rect', { x: x, y: y, width: w, height: h, fill: fill }));
    // 琉璃瓦压顶
    g.appendChild(el('rect', { x: x, y: y - 7, width: w, height: 7, fill: fill }));
    g.appendChild(el('rect', { x: x, y: y - 7.5, width: w, height: 1.1, fill: rim, opacity: 0.3 }));
    g.appendChild(el('rect', { x: x, y: y + 1.5, width: w, height: 1, fill: rim, opacity: 0.12 }));
    // 墙面砖缝
    for (let i = x + 20; i < x + w; i += 32) {
      g.appendChild(el('rect', { x: i, y: y + 12, width: 1, height: h - 14, fill: '#fff', opacity: 0.022 }));
    }
  }

  /* 角楼：三重檐 + 宝顶 */
  function cornerTower(g, cx, baseY, w, fill, rim) {
    const h = w * 0.34;
    g.appendChild(el('rect', { x: cx - w * 0.36, y: baseY - h * 0.6, width: w * 0.72, height: h * 0.6, fill: fill }));
    if (rim) g.appendChild(el('rect', { x: cx - w * 0.36, y: baseY - h * 0.6, width: w * 0.72, height: 1, fill: rim, opacity: 0.24 }));

    hipRoof(g, cx - w * 0.5, baseY - h * 1.08, w, h * 0.5, fill, rim, 0.22);
    g.appendChild(el('rect', { x: cx - w * 0.31, y: baseY - h * 1.5, width: w * 0.62, height: h * 0.44, fill: fill, opacity: 0.92 }));
    hipRoof(g, cx - w * 0.43, baseY - h * 1.98, w * 0.86, h * 0.5, fill, rim, 0.24);
    g.appendChild(el('rect', { x: cx - w * 0.21, y: baseY - h * 2.3, width: w * 0.42, height: h * 0.34, fill: fill, opacity: 0.92 }));
    hipRoof(g, cx - w * 0.33, baseY - h * 2.7, w * 0.66, h * 0.46, fill, rim, 0.26);
    g.appendChild(el('rect', { x: cx - 1.4, y: baseY - h * 2.9, width: 2.8, height: h * 0.14, fill: fill }));
    g.appendChild(el('circle', { cx: cx, cy: baseY - h * 2.93, r: w * 0.024, fill: fill }));
  }

  /* 树 */
  function tree(g, x, baseY, h, kind, color, opacity) {
    const g1 = el('g', { opacity: opacity === undefined ? 1 : opacity });
    g1.appendChild(el('rect', { x: x - h * 0.016, y: baseY - h * 0.44, width: h * 0.032, height: h * 0.44, fill: color }));
    if (kind === 'pine') {
      for (let i = 0; i < 4; i++) {
        const cw = h * (0.40 - i * 0.064);
        const cy = baseY - h * (0.34 + i * 0.145);
        g1.appendChild(el('path', {
          d: 'M ' + (x - cw / 2) + ' ' + (cy + h * 0.055) + ' Q ' + x + ' ' + (cy - h * 0.11) + ' ' + (x + cw / 2) + ' ' + (cy + h * 0.055)
            + ' Q ' + x + ' ' + (cy + h * 0.135) + ' ' + (x - cw / 2) + ' ' + (cy + h * 0.055) + ' Z',
          fill: color
        }));
      }
    } else if (kind === 'ginkgo') {
      g1.appendChild(el('ellipse', { cx: x, cy: baseY - h * 0.64, rx: h * 0.19, ry: h * 0.23, fill: color }));
      g1.appendChild(el('ellipse', { cx: x - h * 0.13, cy: baseY - h * 0.50, rx: h * 0.13, ry: h * 0.15, fill: color }));
      g1.appendChild(el('ellipse', { cx: x + h * 0.13, cy: baseY - h * 0.53, rx: h * 0.14, ry: h * 0.16, fill: color }));
    } else {
      g1.appendChild(el('ellipse', { cx: x, cy: baseY - h * 0.66, rx: h * 0.22, ry: h * 0.20, fill: color }));
      g1.appendChild(el('ellipse', { cx: x - h * 0.15, cy: baseY - h * 0.54, rx: h * 0.15, ry: h * 0.14, fill: color }));
      g1.appendChild(el('ellipse', { cx: x + h * 0.16, cy: baseY - h * 0.56, rx: h * 0.16, ry: h * 0.15, fill: color }));
    }
    g.appendChild(g1);
  }

  /* 归雁 */
  function birds(g, x, y, scale, color, cls) {
    const grp = el('g', { class: cls || '', opacity: 0.7 });
    for (let i = 0; i < 5; i++) {
      const bx = x + i * 26 * scale + (i % 2) * 8;
      const by = y + Math.abs(i - 2) * 13 * scale;
      grp.appendChild(el('path', {
        d: 'M ' + bx + ' ' + by + ' q ' + (7 * scale) + ' ' + (-6 * scale) + ' ' + (14 * scale) + ' 0'
          + ' M ' + (bx + 14 * scale) + ' ' + by + ' q ' + (7 * scale) + ' ' + (-6 * scale) + ' ' + (14 * scale) + ' 0',
        stroke: color, 'stroke-width': 1.6 * scale, fill: 'none', 'stroke-linecap': 'round'
      }));
    }
    g.appendChild(grp);
  }

  /* ---------------- 首页主场景 ---------------- */

  function hero(container, opts) {
    opts = opts || {};
    const pal = opts.palette || { sky: ['#120c0a', '#4a2a1c', '#d99a55'], ink: '#0f0a07', accent: '#d9b062' };
    const root = svg('0 0 1600 900', 'scene-svg hero-scene');
    const I = pal.ink, R = pal.accent;

    const defs = el('defs');
    defs.appendChild(defsGradient('skyH', [[0, pal.sky[0]], [0.48, pal.sky[1]], [0.78, pal.sky[2]], [1, '#3a2216']]));
    const glow = el('radialGradient', { id: 'sunH' });
    glow.appendChild(el('stop', { offset: '0', 'stop-color': '#ffe9bb', 'stop-opacity': 0.85 }));
    glow.appendChild(el('stop', { offset: '0.28', 'stop-color': '#f2b464', 'stop-opacity': 0.42 }));
    glow.appendChild(el('stop', { offset: '1', 'stop-color': '#e08a3c', 'stop-opacity': 0 }));
    defs.appendChild(glow);
    const vig = el('radialGradient', { id: 'vigH', cx: '0.5', cy: '0.55', r: '0.8' });
    vig.appendChild(el('stop', { offset: '0.4', 'stop-color': '#000', 'stop-opacity': 0 }));
    vig.appendChild(el('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': 0.52 }));
    defs.appendChild(vig);
    const haze = el('linearGradient', { id: 'hazeH', x1: '0', y1: '0', x2: '0', y2: '1' });
    haze.appendChild(el('stop', { offset: '0', 'stop-color': '#ffd9a0', 'stop-opacity': 0 }));
    haze.appendChild(el('stop', { offset: '1', 'stop-color': '#ffd9a0', 'stop-opacity': 0.20 }));
    defs.appendChild(haze);
    root.appendChild(defs);

    root.appendChild(el('rect', { x: 0, y: 0, width: 1600, height: 900, fill: 'url(#skyH)' }));

    // 日轮
    root.appendChild(el('circle', { cx: 600, cy: 646, r: 290, fill: 'url(#sunH)' }));
    root.appendChild(el('circle', { cx: 600, cy: 648, r: 44, fill: '#ffeec6', opacity: 0.74 }));

    // 云
    const clouds = el('g', { class: 'hero-clouds', opacity: 0.55 });
    for (let i = 0; i < 4; i++) {
      clouds.appendChild(el('ellipse', {
        cx: 240 + i * 330, cy: 230 + i * 62, rx: 300 + i * 60, ry: 12 + i * 3,
        fill: '#f0c894', opacity: 0.07 + i * 0.022, class: 'cloud-band',
        style: 'animation-delay:' + (i * -5) + 's'
      }));
    }
    root.appendChild(clouds);

    // 远山（景山）
    root.appendChild(el('path', {
      d: 'M 0 690 Q 210 636 380 662 Q 540 686 700 654 Q 880 616 1050 650 Q 1240 688 1420 652 Q 1520 632 1600 656 L 1600 900 L 0 900 Z',
      fill: I, opacity: 0.30
    }));

    // 远景庑房
    const far = el('g', { opacity: 0.5 });
    colonnade(far, { x: 20, count: 7, step: 92, w: 78, baseY: 738, bodyH: 20, roofH: 18, fill: I, rim: R, opacity: 0.85 });
    colonnade(far, { x: 1180, count: 6, step: 88, w: 74, baseY: 738, bodyH: 20, roofH: 18, fill: I, rim: R, opacity: 0.85 });
    root.appendChild(far);

    // 宫墙
    palaceWall(root, -20, 736, 1640, 190, I, R);

    // 近景配殿
    building(root, { x: 300, w: 300, baseY: 812, bodyH: 52, roofH: 52, tiers: 1, fill: I, rim: R, opacity: 0.95 });

    // 角楼（左）
    cornerTower(root, 620, 740, 110, I, R);

    // 太和殿（主景，偏右）
    building(root, { x: 878, w: 452, baseY: 818, bodyH: 74, roofH: 82, tiers: 2, fill: I, rim: R });
    // 中和殿
    building(root, { x: 1348, w: 142, baseY: 800, bodyH: 50, roofH: 44, tiers: 1, fill: I, rim: R, opacity: 0.92 });

    // 树
    tree(root, 240, 812, 150, 'pine', I, 0.95);
    tree(root, 880, 812, 120, 'ginkgo', '#c99a4e', 0.75);
    tree(root, 1560, 812, 170, 'pine', I, 0.95);

    birds(root, 260, 210, 1, '#f5dcae', 'hero-birds');

    // 地平雾
    root.appendChild(el('rect', { x: 0, y: 600, width: 1600, height: 180, fill: 'url(#hazeH)', opacity: 0.55 }));
    // 暗角
    root.appendChild(el('rect', { x: 0, y: 0, width: 1600, height: 900, fill: 'url(#vigH)' }));

    container.appendChild(root);
    return root;
  }

  /* ---------------- 场景卡片 ---------------- */

  let sceneUid = 0;

  function card(container, scene) {
    const pal = scene.palette;
    const key = scene.id + '_' + (++sceneUid);
    const root = svg('0 0 600 420', 'scene-svg card-scene');
    const I = pal.ink, R = pal.accent;

    const defs = el('defs');
    defs.appendChild(defsGradient('sky' + key, [[0, pal.sky[0]], [0.58, pal.sky[1]], [1, pal.sky[2]]]));
    const gid = 'sun' + key;
    const gl = el('radialGradient', { id: gid });
    gl.appendChild(el('stop', { offset: '0', 'stop-color': '#fff2cc', 'stop-opacity': 0.85 }));
    gl.appendChild(el('stop', { offset: '1', 'stop-color': pal.accent, 'stop-opacity': 0 }));
    defs.appendChild(gl);
    const v = el('radialGradient', { id: 'v' + key, cx: '0.5', cy: '0.58', r: '0.82' });
    v.appendChild(el('stop', { offset: '0.45', 'stop-color': '#000', 'stop-opacity': 0 }));
    v.appendChild(el('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': 0.42 }));
    defs.appendChild(v);
    root.appendChild(defs);

    root.appendChild(el('rect', { x: 0, y: 0, width: 600, height: 420, fill: 'url(#sky' + key + ')' }));

    if (scene.type === 'taihe') {
      root.appendChild(el('circle', { cx: 150, cy: 150, r: 130, fill: 'url(#' + gid + ')' }));
      root.appendChild(el('circle', { cx: 150, cy: 152, r: 20, fill: '#ffefc6', opacity: 0.88 }));
      colonnade(root, { x: -14, count: 5, step: 58, w: 50, baseY: 306, bodyH: 12, roofH: 13, fill: I, rim: R, opacity: 0.5 });
      colonnade(root, { x: 424, count: 4, step: 56, w: 48, baseY: 306, bodyH: 12, roofH: 13, fill: I, rim: R, opacity: 0.5 });
      building(root, { x: 200, w: 208, baseY: 350, bodyH: 32, roofH: 40, tiers: 2, fill: I, rim: R });
      root.appendChild(el('rect', { x: 0, y: 356, width: 600, height: 64, fill: I }));
      for (let i = 0; i < 6; i++) {
        root.appendChild(el('rect', { x: 214 + i * 32, y: 358, width: 18, height: 1.6, fill: R, opacity: 0.3 }));
      }
      tree(root, 86, 358, 104, 'pine', I, 0.85);
      tree(root, 516, 358, 88, 'broad', '#a9803f', 0.6);
      birds(root, 400, 106, 0.65, '#f7e2bb');

    } else if (scene.type === 'garden') {
      root.appendChild(el('circle', { cx: 470, cy: 112, r: 110, fill: 'url(#' + gid + ')' }));
      palaceWall(root, -10, 286, 620, 134, I, R);
      cornerTower(root, 512, 286, 70, I, R);
      tree(root, 84, 348, 210, 'pine', I, 0.95);
      tree(root, 168, 348, 186, 'ginkgo', '#c9a86a', 0.9);
      tree(root, 252, 348, 150, 'broad', '#a9803f', 0.85);
      tree(root, 344, 348, 118, 'broad', '#b98a3c', 0.72);
      // 亭
      root.appendChild(el('rect', { x: 258, y: 300, width: 3.4, height: 34, fill: I }));
      root.appendChild(el('rect', { x: 290, y: 300, width: 3.4, height: 34, fill: I }));
      tentRoof(root, 276, 248, 78, 42, I, R);
      root.appendChild(el('rect', { x: 0, y: 340, width: 600, height: 80, fill: I }));
      for (let i = 0; i < 15; i++) {
        root.appendChild(el('circle', { cx: 34 + i * 38, cy: 350 + (i % 3) * 4, r: 2.2, fill: '#e8c05a', opacity: 0.5 }));
      }

    } else if (scene.type === 'corner') {
      root.appendChild(el('circle', { cx: 300, cy: 318, r: 200, fill: 'url(#' + gid + ')' }));
      root.appendChild(el('circle', { cx: 300, cy: 322, r: 22, fill: '#ffdca0', opacity: 0.8 }));
      palaceWall(root, -10, 268, 620, 96, I, R);
      cornerTower(root, 300, 268, 168, I, R);
      const water = el('g', { opacity: 0.6 });
      water.appendChild(el('rect', { x: 0, y: 356, width: 600, height: 64, fill: pal.sky[2], opacity: 0.45 }));
      for (let i = 0; i < 3; i++) {
        water.appendChild(el('path', {
          d: 'M ' + (190 - i * 26) + ' ' + (372 + i * 12) + ' q 60 9 120 0 q 44 -7 84 0',
          stroke: R, 'stroke-width': 1.1, fill: 'none', opacity: 0.32 - i * 0.08,
          class: 'water-line', style: 'animation-delay:' + (i * -2.5) + 's'
        }));
      }
      root.appendChild(water);
      birds(root, 400, 92, 0.65, '#f7e2bb');

    } else if (scene.type === 'river') {
      root.appendChild(el('circle', { cx: 430, cy: 96, r: 140, fill: 'url(#' + gid + ')' }));
      root.appendChild(el('circle', { cx: 430, cy: 98, r: 22, fill: '#f2f6f4', opacity: 0.9 }));
      palaceWall(root, -10, 244, 620, 58, I, R);
      cornerTower(root, 110, 244, 84, I, R);
      colonnade(root, { x: 196, count: 5, step: 64, w: 54, baseY: 244, bodyH: 12, roofH: 12, fill: I, rim: R, opacity: 0.55 });
      // 玉带桥
      root.appendChild(el('path', { d: 'M 208 306 Q 300 262 392 306 L 392 318 Q 300 276 208 318 Z', fill: I }));
      root.appendChild(el('path', { d: 'M 238 306 Q 300 278 362 306', stroke: R, 'stroke-width': 1, fill: 'none', opacity: 0.3 }));
      // 水面
      root.appendChild(el('rect', { x: 0, y: 306, width: 600, height: 114, fill: pal.sky[1], opacity: 0.7 }));
      root.appendChild(el('rect', { x: 0, y: 306, width: 600, height: 114, fill: pal.sky[2], opacity: 0.16 }));
      for (let i = 0; i < 5; i++) {
        root.appendChild(el('path', {
          d: 'M ' + (56 + i * 96) + ' ' + (326 + i * 14) + ' q 34 5 68 0',
          stroke: '#dfeaea', 'stroke-width': 1, fill: 'none', opacity: 0.16,
          class: 'water-line', style: 'animation-delay:' + (i * -1.8) + 's'
        }));
      }
      root.appendChild(el('ellipse', { cx: 430, cy: 356, rx: 26, ry: 8, fill: '#eaf2f0', opacity: 0.2 }));
    }

    root.appendChild(el('rect', { x: 0, y: 0, width: 600, height: 420, fill: 'url(#v' + key + ')' }));
    container.appendChild(root);
    return root;
  }

  window.Scene = { hero: hero, card: card, el: el };
})();
