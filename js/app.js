/* ===========================================================
   故宫秋序 · 交互层
   =========================================================== */

(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

  /* =========================================================
     0. 全局：落叶粒子
     ========================================================= */

  const leafCanvas = $('#leafLayer');
  const lctx = leafCanvas.getContext('2d');
  let leaves = [];
  let wind = 0;
  let pointer = { x: -999, y: -999, vx: 0, vy: 0 };
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  const LEAF_COLORS = ['#c9873a', '#a8452c', '#d9a94e', '#8a5a33', '#b98a3c', '#9c6b39'];

  function resizeLeaves() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    leafCanvas.width = window.innerWidth * dpr;
    leafCanvas.height = window.innerHeight * dpr;
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildLeaves();
  }

  function buildLeaves() {
    const isSmall = window.innerWidth < 780;
    const count = isSmall ? 18 : 42;
    leaves = [];
    for (let i = 0; i < count; i++) leaves.push(newLeaf(true));
  }

  function newLeaf(spread) {
    const W = window.innerWidth, H = window.innerHeight;
    return {
      x: Math.random() * W,
      y: spread ? Math.random() * H : -30 - Math.random() * 120,
      s: 3 + Math.random() * 4.5,
      vy: 0.3 + Math.random() * 0.65,
      vx: (Math.random() - 0.5) * 0.5,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.02,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.006 + Math.random() * 0.012,
      color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      alpha: 0.16 + Math.random() * 0.3
    };
  }

  function drawLeafShape(c, s) {
    c.beginPath();
    c.moveTo(0, -s);
    c.bezierCurveTo(s * 0.9, -s * 0.42, s * 0.66, s * 0.58, 0, s);
    c.bezierCurveTo(-s * 0.66, s * 0.58, -s * 0.9, -s * 0.42, 0, -s);
    c.fill();
    c.beginPath();
    c.moveTo(0, -s * 0.86);
    c.lineTo(0, s * 0.9);
    c.stroke();
  }

  let lastT = 0;
  function tick(t) {
    const dt = Math.min(40, t - lastT || 16);
    lastT = t;
    const W = window.innerWidth, H = window.innerHeight;
    lctx.clearRect(0, 0, W, H);

    wind += 0.008;
    const windForce = Math.sin(wind) * 0.55 + Math.sin(wind * 2.3) * 0.22;

    for (let i = 0; i < leaves.length; i++) {
      const L = leaves[i];
      L.sway += L.swaySpeed * dt;
      L.x += (L.vx + windForce + Math.sin(L.sway) * 0.7) * (dt / 16);
      L.y += L.vy * (dt / 16);
      L.rot += L.vr * (dt / 16);

      // 鼠标推动
      const dx = L.x - pointer.x, dy = L.y - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 16000) {
        const f = (1 - d2 / 16000) * 0.9;
        L.x += (dx / (Math.sqrt(d2) + 1)) * f * 4;
        L.y += (dy / (Math.sqrt(d2) + 1)) * f * 4;
      }

      if (L.y > H + 40 || L.x > W + 60 || L.x < -60) {
        leaves[i] = newLeaf(false);
        continue;
      }

      lctx.save();
      lctx.translate(L.x, L.y);
      lctx.rotate(L.rot);
      lctx.fillStyle = L.color;
      lctx.strokeStyle = 'rgba(80,44,18,.45)';
      lctx.lineWidth = Math.max(0.6, L.s * 0.12);
      lctx.globalAlpha = L.alpha;
      drawLeafShape(lctx, L.s);
      lctx.restore();
    }
    requestAnimationFrame(tick);
  }

  /* =========================================================
     1. 鼠标秋风 + 导航
     ========================================================= */

  const windEl = $('#cursorWind');
  let windX = 0, windY = 0, windTX = 0, windTY = 0;

  window.addEventListener('mousemove', function (e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    windTX = e.clientX;
    windTY = e.clientY;
    if (!document.body.classList.contains('has-pointer')) document.body.classList.add('has-pointer');
  });

  (function windLoop() {
    windX += (windTX - windX) * 0.12;
    windY += (windTY - windY) * 0.12;
    windEl.style.transform = 'translate3d(' + windX + 'px,' + windY + 'px,0)';
    requestAnimationFrame(windLoop);
  })();

  const nav = $('#nav');
  const navTerm = $('#navTerm');
  const navClock = $('#navClock');

  window.addEventListener('scroll', function () {
    nav.classList.toggle('is-solid', window.scrollY > 60);
    spy();
  }, { passive: true });

  const navLinks = $$('#navLinks a');
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);

  function spy() {
    const pos = window.scrollY + window.innerHeight * 0.36;
    let idx = 0;
    sections.forEach((s, i) => { if (s.offsetTop <= pos) idx = i; });
    navLinks.forEach((a, i) => a.classList.toggle('is-on', i === idx));
  }

  const navToggle = $('#navToggle');
  const navPanel = $('#navLinks');

  function setMenu(open) {
    navPanel.classList.toggle('is-open', open);
    nav.classList.toggle('is-menu', open);
    document.body.classList.toggle('is-locked', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  navToggle.addEventListener('click', function () {
    setMenu(!navPanel.classList.contains('is-open'));
  });
  $$('#navLinks a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navPanel.classList.contains('is-open')) setMenu(false);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 780 && navPanel.classList.contains('is-open')) setMenu(false);
  });

  function clock() {
    const d = new Date();
    const pad = (n) => (n < 10 ? '0' + n : n);
    navClock.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  clock();
  setInterval(clock, 20000);

  /* =========================================================
     2. 入场揭示
     ========================================================= */

  const io = new IntersectionObserver(function (entries) {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  /* =========================================================
     3. 首页
     ========================================================= */

  const term = AI.currentTerm();
  const phase = AI.phaseOfTerm(term.name);

  Scene.hero($('#heroScene'), { palette: { sky: ['#150e0b', '#5a3320', '#c9873f'], ink: '#100b08', accent: '#d9b062' } });

  (function heroMeta() {
    const d = new Date();
    const cn = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
    const wk = ['日', '一', '二', '三', '四', '五', '六'];
    const mm = d.getMonth() + 1, dd = d.getDate();
    const dayCN = dd <= 10 ? '初' + cn[dd - 1] : dd < 20 ? '十' + cn[dd - 11] : dd === 20 ? '二十' : dd < 30 ? '廿' + cn[dd - 21] : '三十';
    $('#heroDate').textContent = cn[mm - 1] + '月' + dayCN + ' · 周' + wk[d.getDay()];
    $('#heroTerm').textContent = term.name + ' · ' + term.index.replace('秋 · ', '秋之');
    $('#heroLight').textContent = phase.light;
    navTerm.textContent = term.name;
  })();

  (function heroParallax() {
    const scene = $('#heroScene');
    let tx = 0, ty = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 18;
      ty = (e.clientY / window.innerHeight - 0.5) * 12;
    });
    (function loop() {
      cx += (tx - cx) * 0.05;
      cy += (ty - cy) * 0.05;
      scene.style.transform = 'translate3d(' + (-cx) + 'px,' + (-cy) + 'px,0) scale(1.05)';
      requestAnimationFrame(loop);
    })();
  })();

  /* =========================================================
     4. 秋序时间轴
     ========================================================= */

  const phaseTabs = $('#phaseTabs');
  const phaseDetail = $('#phaseDetail');
  let phaseOn = phase.id;

  DATA.phases.forEach(function (p) {
    const b = document.createElement('button');
    b.className = 'phase-tab' + (p.id === phaseOn ? ' is-on' : '');
    b.style.setProperty('--ph', p.palette[1]);
    b.dataset.phase = p.id;
    b.innerHTML = '<span class="pt-label">' + p.label + '</span>' +
      '<span class="pt-range">' + p.range + '　' + p.date + '</span>' +
      '<span class="pt-pal">' + p.palette.map((c) => '<i style="background:' + c + '"></i>').join('') + '</span>';
    b.addEventListener('click', function () {
      phaseOn = p.id;
      $$('.phase-tab').forEach((x) => x.classList.toggle('is-on', x.dataset.phase === p.id));
      renderPhase(p);
    });
    phaseTabs.appendChild(b);
  });

  function renderPhase(p) {
    phaseDetail.innerHTML =
      '<div class="pd-left">' +
      '<p class="pd-slogan">' + p.slogan + '</p>' +
      '<p class="pd-desc">' + p.desc + '</p>' +
      '<div class="pd-meta">' +
      '<div><em>节气区间</em>' + p.range + '</div>' +
      '<div><em>公历</em>' + p.date + '</div>' +
      '<div><em>推荐点位</em>' + p.points.length + ' 处</div>' +
      '</div></div>' +
      '<div class="pd-right">' +
      '<h4>这几处值得走一趟</h4>' +
      '<ul class="pd-points">' + p.points.map((x) => '<li>' + x + '</li>').join('') + '</ul>' +
      '<div class="pd-palette">' + p.palette.map((c) => '<span style="background:' + c + '"></span>').join('') + '</div>' +
      '</div>';
  }
  renderPhase(DATA.phases.find((x) => x.id === phaseOn) || DATA.phases[2]);

  /* =========================================================
     5. 秋景万象
     ========================================================= */

  (function compare() {
    const summer = {
      id: 'summer', type: 'taihe',
      palette: { sky: ['#243642', '#6d8b74', '#dadfb4'], ink: '#1a2620', accent: '#b9cf8a' }
    };
    const autumn = {
      id: 'autumn', type: 'taihe',
      palette: { sky: ['#2a1d18', '#8a4a2c', '#e8b06a'], ink: '#1a120e', accent: '#e0a45e' }
    };
    Scene.card($('#cmpSummer'), summer);
    Scene.card($('#cmpAutumn'), autumn);

    const wrap = $('#compare');
    const layer = $('#cmpAutumn');
    const bar = $('#cmpBar');
    let pos = 50, dragging = false;

    function apply(p) {
      pos = Math.max(2, Math.min(98, p));
      layer.style.clipPath = 'inset(0 0 0 ' + pos + '%)';
      bar.style.left = pos + '%';
    }
    function fromEvent(e) {
      const r = wrap.getBoundingClientRect();
      apply(((e.clientX - r.left) / r.width) * 100);
    }
    wrap.addEventListener('pointerdown', function (e) { dragging = true; wrap.setPointerCapture(e.pointerId); fromEvent(e); });
    wrap.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
    wrap.addEventListener('pointerup', function () { dragging = false; });
    wrap.addEventListener('pointercancel', function () { dragging = false; });
    apply(50);
  })();

  (function sceneGrid() {
    const grid = $('#sceneGrid');
    DATA.scenes.forEach(function (s) {
      const card = document.createElement('article');
      card.className = 'scene-card';
      const visual = document.createElement('div');
      visual.className = 'sc-card-visual';
      Scene.card(visual, s);

      const btn = document.createElement('button');
      btn.className = 'sc-toggle';
      btn.textContent = '绢本';
      btn.addEventListener('click', function () {
        card.classList.toggle('is-paint');
        btn.textContent = card.classList.contains('is-paint') ? '实景' : '绢本';
      });

      const body = document.createElement('div');
      body.className = 'sc-card-body';
      body.innerHTML = '<h3>' + s.name + '</h3>' +
        '<div class="sc-sub">' + s.sub + '</div>' +
        '<div class="sc-card-poem">' + s.poem + '</div>' +
        '<p>' + s.note + '</p>';

      visual.appendChild(btn);
      card.appendChild(visual);
      card.appendChild(body);
      grid.appendChild(card);
    });
  })();

  /* =========================================================
     6. 秋物藏珍
     ========================================================= */

  (function relics() {
    const grid = $('#relicGrid');
    DATA.relics.forEach(function (r) {
      const b = document.createElement('button');
      b.className = 'relic reveal';
      b.innerHTML =
        '<div class="relic-visual" style="background:linear-gradient(150deg,' + r.tone[0] + ',' + r.tone[1] + ')">' +
        '<span class="relic-glyph">' + r.glyph + '</span></div>' +
        '<div class="relic-body">' +
        '<h3>' + r.name + '</h3>' +
        '<div class="relic-era">' + r.era + '　·　' + r.kind + '</div>' +
        '<p class="relic-brief">' + r.brief + '</p>' +
        '<div class="relic-tags">' + r.tags.map((t) => '<span>' + t + '</span>').join('') + '</div>' +
        '<div class="relic-more">细看</div>' +
        '</div>';
      b.addEventListener('click', () => openRelic(r));
      grid.appendChild(b);
      io.observe(b);
    });
  })();

  const modal = $('#modal');
  const modalBody = $('#modalBody');

  function openRelic(r) {
    modalBody.innerHTML =
      '<div class="mb-head">' +
      '<div class="mb-glyph" style="background:linear-gradient(150deg,' + r.tone[0] + ',' + r.tone[1] + ')">' + r.glyph + '</div>' +
      '<div><h3>' + r.name + '</h3><p>' + r.era + '　·　' + r.kind + '</p></div>' +
      '</div>' +
      '<div class="mb-body">' +
      '<p><b>形制</b>　' + r.brief + '</p>' +
      '<p>' + r.story + '</p>' +
      '<div class="mb-meaning">' + r.meaning + '</div>' +
      '<div class="mb-tags">' + r.tags.map((t) => '<span>' + t + '</span>').join('') + '</div>' +
      '</div>';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  $$('[data-close]').forEach((x) => x.addEventListener('click', closeModal));
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  /* =========================================================
     7. 秋诗雅韵
     ========================================================= */

  (function poems() {
    const grid = $('#poemGrid');
    DATA.poems.forEach(function (p) {
      const card = document.createElement('article');
      card.className = 'poem-card reveal';
      card.innerHTML =
        '<div class="pc-lines">' + p.lines.map((l) => '<span>' + l + '</span>').join('') + '</div>' +
        '<div class="poem-foot">' +
        '<div><div class="pf-title">' + p.title + '</div><div class="pf-author">' + p.dynasty + ' · ' + p.author + '</div></div>' +
        '<div class="pf-seal">秋</div>' +
        '</div>' +
        '<div class="poem-note"><b>秋序按</b>' + p.note + '</div>';
      grid.appendChild(card);
      io.observe(card);
    });
  })();

  /* =========================================================
     8. 工坊 · 面板切换
     ========================================================= */

  $$('.st-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      $$('.st-tab').forEach((t) => t.classList.toggle('is-active', t === tab));
      $$('.st-panel').forEach((p) => p.classList.toggle('is-active', p.dataset.panel === tab.dataset.tab));
    });
  });

  /* =========================================================
     9. 工坊 一 · 秋景风格迁移
     ========================================================= */

  (function gen() {
    const drop = $('#genDrop');
    const input = $('#genInput');
    const preview = $('#genPreview');
    const empty = $('#genEmpty');
    const resetBtn = $('#genReset');
    const stylesBox = $('#genStyles');
    const runBtn = $('#genRun');
    const prog = $('#genProg').firstElementChild;
    const result = $('#genResult');
    const resultEmpty = $('#genResultEmpty');
    const meta = $('#genMeta');
    const dlBtn = $('#genDownload');
    const againBtn = $('#genAgain');

    let img = null;
    let style = 'gongbi';

    Object.keys(AI.STYLES).forEach(function (key, i) {
      const s = AI.STYLES[key];
      const b = document.createElement('button');
      b.className = 'style-btn' + (i === 0 ? ' is-on' : '');
      b.dataset.style = key;
      b.innerHTML = '<strong>' + s.name + '</strong><em>' + s.desc + '</em>';
      b.addEventListener('click', function () {
        style = key;
        $$('.style-btn').forEach((x) => x.classList.toggle('is-on', x === b));
      });
      stylesBox.appendChild(b);
    });

    function setImage(image) {
      img = image;
      const w = image.width, h = image.height;
      preview.width = w; preview.height = h;
      preview.getContext('2d').drawImage(image, 0, 0, w, h);
      preview.hidden = false;
      empty.hidden = true;
      resetBtn.hidden = false;
      runBtn.disabled = false;
      meta.textContent = '原图 ' + w + ' × ' + h + ' 像素 · 已就绪';
    }

    function clearImage() {
      img = null;
      preview.hidden = true;
      empty.hidden = false;
      resetBtn.hidden = true;
      runBtn.disabled = true;
      resultEmpty.style.display = '';
      result.getContext('2d').clearRect(0, 0, result.width, result.height);
      dlBtn.disabled = true;
      againBtn.disabled = true;
      meta.textContent = '四种画种 · 像素级重绘 · 约 1 秒完成';
    }

    $('#genPick').addEventListener('click', () => input.click());
    resetBtn.addEventListener('click', clearImage);

    input.addEventListener('change', function () {
      const f = input.files && input.files[0];
      if (!f) return;
      AI.loadImageFile(f).then(setImage).catch(() => { meta.textContent = '图片读取失败，请换一张试试'; });
    });

    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, function (e) {
      e.preventDefault(); drop.classList.add('is-over');
    }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, function (e) {
      e.preventDefault(); drop.classList.remove('is-over');
    }));
    drop.addEventListener('drop', function (e) {
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) AI.loadImageFile(f).then(setImage).catch(() => {});
    });

    // 示例图：把 SVG 场景序列化成位图，充当「实拍照片」
    $('#genDemo').addEventListener('click', function () {
      const holder = document.createElement('div');
      holder.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;height:620px';
      document.body.appendChild(holder);
      Scene.card(holder, {
        id: 'demo', type: 'corner',
        palette: { sky: ['#2a1e19', '#8a4a2c', '#e6a95f'], ink: '#1b1411', accent: '#e0a45e' }
      });
      const svgEl = holder.querySelector('svg');
      const clone = svgEl.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', '1200');
      clone.setAttribute('height', '800');
      const str = new XMLSerializer().serializeToString(clone);
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
      const im = new Image();
      im.onload = function () {
        const c = document.createElement('canvas');
        c.width = 900; c.height = 600;
        c.getContext('2d').drawImage(im, 0, 0, 900, 600);
        const final = new Image();
        final.onload = function () { setImage(final); document.body.removeChild(holder); };
        final.src = c.toDataURL('image/jpeg', 0.95);
      };
      im.onerror = function () { document.body.removeChild(holder); meta.textContent = '示例图加载失败'; };
      im.src = url;
    });

    let busy = false;
    function run() {
      if (!img || busy) return;
      busy = true;
      runBtn.disabled = true;
      runBtn.textContent = '迁移中⋯⋯';
      prog.style.width = '0%';
      const steps = [18, 42, 68, 86, 96];
      let i = 0;
      const timer = setInterval(function () {
        if (i < steps.length) { prog.style.width = steps[i] + '%'; i++; }
      }, 120);

      AI.stylize(img, style).then(function (canvas) {
        clearInterval(timer);
        prog.style.width = '100%';
        result.width = canvas.width;
        result.height = canvas.height;
        result.getContext('2d').drawImage(canvas, 0, 0);
        resultEmpty.style.display = 'none';
        const s = AI.STYLES[style];
        meta.textContent = '已生成 · ' + s.name + ' · ' + canvas.width + ' × ' + canvas.height + ' 像素';
        dlBtn.disabled = false;
        againBtn.disabled = false;
        busy = false;
        runBtn.disabled = false;
        runBtn.textContent = '开始迁移';
        setTimeout(() => { prog.style.width = '0%'; }, 800);
      }).catch(function () {
        clearInterval(timer);
        meta.textContent = '处理失败，请换一张尺寸更小的图片';
        busy = false;
        runBtn.disabled = false;
        runBtn.textContent = '开始迁移';
      });
    }

    runBtn.addEventListener('click', run);
    againBtn.addEventListener('click', run);

    dlBtn.addEventListener('click', function () {
      result.toBlob(function (blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '故宫秋序-' + AI.STYLES[style].name + '.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }, 'image/png');
    });
  })();

  /* =========================================================
     10. 工坊 二 · 古画修复与活化
     ========================================================= */

  (function restore() {
    const stage = $('#restoreStage');
    const base = $('#restoreBase');
    const dmg = $('#restoreDamage');
    const range = $('#restoreRange');
    const pct = $('#restorePct');
    const status = $('#restoreStatus');
    const steps = $$('#restoreSteps span');

    const W = 900, H = 675;
    base.width = W; base.height = H;
    dmg.width = W; dmg.height = H;

    // —— 画一张「暮秋绢本」 ——
    const b = base.getContext('2d');
    const g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#efe2c6');
    g.addColorStop(1, '#e3d2ae');
    b.fillStyle = g; b.fillRect(0, 0, W, H);

    // 远山
    b.fillStyle = 'rgba(110,131,120,.55)';
    b.beginPath();
    b.moveTo(0, 360);
    b.quadraticCurveTo(160, 250, 330, 340);
    b.quadraticCurveTo(470, 410, 620, 330);
    b.quadraticCurveTo(780, 250, W, 355);
    b.lineTo(W, H); b.lineTo(0, H); b.closePath(); b.fill();

    // 近山
    b.fillStyle = 'rgba(92,112,102,.42)';
    b.beginPath();
    b.moveTo(0, 394);
    b.quadraticCurveTo(140, 344, 300, 388);
    b.quadraticCurveTo(460, 430, 600, 380);
    b.quadraticCurveTo(760, 334, W, 386);
    b.lineTo(W, 402); b.lineTo(0, 402); b.closePath(); b.fill();

    // 中景宫墙
    b.fillStyle = '#9c2b23';
    b.fillRect(0, 402, W, 94);
    b.fillStyle = '#5c3a2a';
    b.fillRect(0, 390, W, 9);
    b.fillStyle = '#c9a86a';
    b.globalAlpha = 0.32;
    b.fillRect(0, 390, W, 1.6);
    b.globalAlpha = 1;
    // 门洞
    b.fillStyle = '#3a2418';
    b.beginPath();
    b.moveTo(112, 496); b.lineTo(112, 444);
    b.quadraticCurveTo(154, 410, 196, 444);
    b.lineTo(196, 496); b.closePath(); b.fill();

    // 角楼
    (function tower(cx, by, w) {
      const h = w * 0.34;
      b.fillStyle = '#2e2119';
      b.fillRect(cx - w * 0.34, by - h * 0.55, w * 0.68, h * 0.55);
      function roof(x, y, rw, rh) {
        b.beginPath();
        b.moveTo(x + rw * 0.3, y);
        b.lineTo(x + rw * 0.7, y);
        b.bezierCurveTo(x + rw * 0.78, y + rh * 0.3, x + rw * 0.94, y + rh * 0.65, x + rw, y + rh * 0.9);
        b.quadraticCurveTo(x + rw * 1.03, y + rh, x + rw, y + rh * 1.04);
        b.lineTo(x, y + rh * 1.04);
        b.quadraticCurveTo(x - rw * 0.03, y + rh, x, y + rh * 0.9);
        b.bezierCurveTo(x + rw * 0.06, y + rh * 0.65, x + rw * 0.22, y + rh * 0.3, x + rw * 0.3, y);
        b.closePath(); b.fill();
      }
      roof(cx - w * 0.5, by - h * 1.05, w, h * 0.5);
      b.fillRect(cx - w * 0.3, by - h * 1.45, w * 0.6, h * 0.42);
      roof(cx - w * 0.42, by - h * 1.95, w * 0.84, h * 0.52);
      b.fillRect(cx - w * 0.2, by - h * 2.25, w * 0.4, h * 0.32);
      roof(cx - w * 0.32, by - h * 2.68, w * 0.64, h * 0.48);
    })(620, 400, 190);

    // 坡岸
    b.fillStyle = '#8a6a44';
    b.beginPath();
    b.moveTo(0, 500);
    b.quadraticCurveTo(220, 470, 420, 512);
    b.quadraticCurveTo(640, 552, W, 505);
    b.lineTo(W, H); b.lineTo(0, H); b.closePath(); b.fill();

    // 秋树（点叶法）
    b.strokeStyle = '#5a3a22'; b.lineWidth = 5;
    b.beginPath(); b.moveTo(160, 520); b.quadraticCurveTo(168, 430, 150, 360); b.stroke();
    b.beginPath(); b.moveTo(160, 448); b.quadraticCurveTo(200, 420, 226, 392); b.stroke();
    b.beginPath(); b.moveTo(158, 470); b.quadraticCurveTo(118, 440, 96, 410); b.stroke();
    const dotColors = ['#c0563a', '#a8452c', '#d99a2b', '#b98a3c'];
    for (let i = 0; i < 130; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 82;
      const x = 158 + Math.cos(a) * r;
      const y = 382 + Math.sin(a) * r * 0.82;
      b.fillStyle = dotColors[Math.floor(Math.random() * dotColors.length)];
      b.globalAlpha = 0.72;
      b.beginPath(); b.ellipse(x, y, 4.5, 3.2, Math.random(), 0, Math.PI * 2); b.fill();
    }
    b.globalAlpha = 1;

    // 题款
    b.fillStyle = 'rgba(58,40,26,.46)';
    b.font = '19px "Kaiti SC","STKaiti","KaiTi",serif';
    b.textAlign = 'center';
    ['暮', '秋', '禁', '中'].forEach(function (ch, i) { b.fillText(ch, 842, 90 + i * 26); });

    // 落款印
    b.fillStyle = 'rgba(156,43,35,.85)';
    b.fillRect(760, 560, 46, 46);
    b.fillStyle = '#f6e8d4';
    b.font = '20px "Songti SC", serif';
    b.textAlign = 'center';
    b.fillText('秋', 783, 580);
    b.fillText('序', 783, 602);

    // 绢纹
    for (let y = 0; y < H; y += 4) {
      b.fillStyle = 'rgba(120,86,44,.045)';
      b.fillRect(0, y, W, 1);
    }

    // —— 破损层 ——
    const d = dmg.getContext('2d');
    const grad = d.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, 'rgba(196,158,96,.55)');
    grad.addColorStop(0.5, 'rgba(178,140,80,.42)');
    grad.addColorStop(1, 'rgba(150,112,60,.6)');
    d.fillStyle = grad; d.fillRect(0, 0, W, H);

    // 霉斑
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * W, y = Math.random() * H, r = 12 + Math.random() * 46;
      const rg = d.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(120,84,38,.34)');
      rg.addColorStop(1, 'rgba(120,84,38,0)');
      d.fillStyle = rg;
      d.beginPath(); d.arc(x, y, r, 0, Math.PI * 2); d.fill();
    }

    // 裂纹
    d.strokeStyle = 'rgba(92,62,30,.55)';
    for (let i = 0; i < 16; i++) {
      d.lineWidth = 0.8 + Math.random() * 1.4;
      d.beginPath();
      let x = Math.random() * W, y = Math.random() * H;
      d.moveTo(x, y);
      const seg = 4 + Math.floor(Math.random() * 6);
      for (let j = 0; j < seg; j++) {
        x += (Math.random() - 0.5) * 90;
        y += (Math.random() - 0.5) * 90;
        d.lineTo(x, y);
      }
      d.stroke();
    }

    // 剥落
    d.fillStyle = 'rgba(244,234,212,.75)';
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      d.beginPath();
      d.ellipse(x, y, 3 + Math.random() * 13, 2 + Math.random() * 9, Math.random() * 3, 0, Math.PI * 2);
      d.fill();
    }

    function setProgress(p) {
      pct.textContent = Math.round(p) + '%';
      range.value = p;
      dmg.style.opacity = (1 - p / 100).toFixed(3);
      base.style.filter = 'saturate(' + (0.45 + p * 0.0062).toFixed(3) + ') contrast(' + (0.9 + p * 0.0018).toFixed(3) + ') brightness(' + (0.94 + p * 0.0009).toFixed(3) + ')';
      steps.forEach(function (s) {
        s.classList.toggle('is-on', Math.abs(parseInt(s.dataset.at, 10) - p) < 26);
      });
      if (p >= 99) status.textContent = '状态：全幅复原 · 可活化';
      else if (p > 60) status.textContent = '状态：补色中 · 绢色渐正';
      else if (p > 20) status.textContent = '状态：去黄除霉 · 线痕消解';
      else status.textContent = '状态：待修复';
    }

    range.addEventListener('input', () => setProgress(+range.value));

    $('#restoreAuto').addEventListener('click', function () {
      let p = +range.value;
      const t = setInterval(function () {
        p += 3.2;
        if (p >= 100) { p = 100; clearInterval(t); }
        setProgress(p);
      }, 22);
    });

    $('#restoreReset').addEventListener('click', function () {
      stage.classList.remove('is-live');
      setProgress(0);
    });

    $('#restoreLive').addEventListener('click', function () {
      if (+range.value < 60) setProgress(100);
      stage.classList.toggle('is-live');
      const on = stage.classList.contains('is-live');
      if (on) {
        buildLiveLeaves();
        status.textContent = '状态：已活化 · 落叶流动 · 归雁掠空';
      } else {
        status.textContent = '状态：已静止';
      }
    });

    function buildLiveLeaves() {
      const box = $('#liveLeaves');
      box.innerHTML = '';
      for (let i = 0; i < 14; i++) {
        const el = document.createElement('i');
        el.className = 'live-leaf';
        const size = 7 + Math.random() * 8;
        el.style.left = (5 + Math.random() * 90) + '%';
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.animationDuration = (5 + Math.random() * 6) + 's';
        el.style.animationDelay = (-Math.random() * 8) + 's';
        el.style.opacity = 0.7;
        box.appendChild(el);
      }
    }

    setProgress(0);
  })();

  /* =========================================================
     11. 工坊 三 · 诗词创作
     ========================================================= */

  (function make() {
    const kwInput = $('#poemKeyword');
    const sheet = $('#poemSheet');
    const runBtn = $('#poemRun');
    const posterBtn = $('#posterRun');
    const posterCanvas = $('#posterCanvas');
    const posterDown = $('#posterDown');
    let form = 'jueju';
    let current = null;

    $$('#poemChips .chip').forEach(function (c) {
      c.addEventListener('click', function () { kwInput.value = c.textContent; });
    });

    $$('#poemForm button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#poemForm button').forEach((x) => x.classList.toggle('is-active', x === b));
        form = b.dataset.form;
      });
    });

    function render(p) {
      const vertical = p.form === '七言绝句';
      sheet.innerHTML =
        '<div class="ps-inner">' +
        '<div class="ps-title">' + p.title + '</div>' +
        '<div class="ps-lines' + (vertical ? '' : ' is-horizontal') + '">' +
        p.lines.map((l) => '<span>' + l + '</span>').join('') +
        '</div>' +
        '<div class="ps-meta">' + p.meta + '</div>' +
        (vertical ? '<div class="ps-note">' + p.note + '</div>' : '') +
        '</div>';
      sheet.style.alignItems = vertical ? 'center' : 'flex-start';
      posterBtn.disabled = false;
      posterCanvas.hidden = true;
      posterDown.hidden = true;
    }

    runBtn.addEventListener('click', function () {
      const kw = (kwInput.value || '').trim() || '故宫落枫';
      runBtn.textContent = '推敲中⋯';
      runBtn.disabled = true;
      setTimeout(function () {
        current = AI.generatePoem(kw, form);
        render(current);
        runBtn.textContent = '生成';
        runBtn.disabled = false;
      }, 420);
    });

    posterBtn.addEventListener('click', function () {
      if (!current) return;
      const c = AI.poster(current);
      posterCanvas.width = c.width;
      posterCanvas.height = c.height;
      posterCanvas.getContext('2d').drawImage(c, 0, 0);
      posterCanvas.hidden = false;
      posterDown.hidden = false;
      posterDown.href = c.toDataURL('image/png');
      posterDown.download = '故宫秋序-' + current.keyword + '.png';
      posterCanvas.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    current = AI.generatePoem('故宫落枫', 'jueju');
    render(current);
  })();

  /* =========================================================
     12. 工坊 四 · 节气问答
     ========================================================= */

  (function chat() {
    const log = $('#askLog');
    const input = $('#askInput');
    const form = $('#askForm');
    const voiceBtn = $('#askVoice');
    const micBtn = $('#askMic');
    let voiceOn = false;

    function add(role, text, tag) {
      const wrap = document.createElement('div');
      wrap.className = 'msg ' + (role === 'ai' ? 'msg-ai' : 'msg-me');
      wrap.innerHTML = '<span class="msg-tag">' + (tag || (role === 'ai' ? '秋序讲解员' : '我')) + '</span>' +
        '<div class="msg-bubble">' + escapeHTML(text) + '</div>';
      log.appendChild(wrap);
      log.scrollTop = log.scrollHeight;
      return wrap;
    }

    function escapeHTML(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function speak(text) {
      if (!voiceOn || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/\n/g, '，'));
      u.lang = 'zh-CN';
      u.rate = 0.92;
      const v = window.speechSynthesis.getVoices().filter((x) => /zh|Chinese/i.test(x.lang))[0];
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    }

    function send(text) {
      const q = (text || '').trim();
      if (!q) return;
      add('me', q, '我');
      input.value = '';
      const thinking = add('ai', '⋯', '检索中');
      setTimeout(function () {
        const res = AI.ask(q);
        thinking.remove();
        add('ai', res.text, res.tag);
        speak(res.text);
      }, 520);
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });

    $$('#askChips .chip').forEach(function (c) {
      c.addEventListener('click', function () { send(c.textContent); });
    });

    voiceBtn.addEventListener('click', function () {
      voiceOn = !voiceOn;
      voiceBtn.classList.toggle('is-on', voiceOn);
      if (!voiceOn && window.speechSynthesis) window.speechSynthesis.cancel();
      voiceBtn.textContent = voiceOn ? '声·开' : '声';
    });

    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = function () {};

    // 语音输入
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.lang = 'zh-CN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = function (e) {
        const t = e.results[0][0].transcript;
        input.value = t;
        send(t);
      };
      rec.onend = function () { micBtn.classList.remove('is-rec'); };
      rec.onerror = function () { micBtn.classList.remove('is-rec'); };
      micBtn.addEventListener('click', function () {
        micBtn.classList.add('is-rec');
        try { rec.start(); } catch (err) { micBtn.classList.remove('is-rec'); }
      });
    } else {
      micBtn.addEventListener('click', function () {
        add('ai', '当前浏览器不支持语音输入。请使用 Chrome 或 Edge 打开本页，即可用语音提问。', '提示');
      });
    }

    add('ai', '今日属「' + term.name + '」。\n想问节气、旧俗、哪处光好，或者要一条现在走得完的路线，都可以。', '讲解员');
  })();

  /* =========================================================
     13. 秋序课堂
     ========================================================= */

  (function classroom() {
    const lineBox = $('#termLine');
    const grid = $('#termGrid');
    const detail = $('#termDetail');

    DATA.terms.forEach(function (t, i) {
      const node = document.createElement('div');
      node.className = 'tl-node' + (t.name === term.name ? ' is-on' : '');
      node.innerHTML = '<i></i>' + t.name;
      lineBox.appendChild(node);

      const card = document.createElement('button');
      card.className = 'term-card reveal' + (t.name === term.name ? ' is-on' : '');
      card.style.setProperty('--tc', t.color);
      card.innerHTML =
        '<div class="tc-idx">' + t.index + '</div>' +
        '<div class="tc-name">' + t.name + '</div>' +
        '<div class="tc-pinyin">' + t.pinyin + '</div>' +
        '<div class="tc-date">' + t.date + '</div>' +
        '<div class="tc-hou">' + t.hou.map((h) => '<span>' + h + '</span>').join('') + '</div>';
      card.addEventListener('click', function () {
        $$('.term-card').forEach((x) => x.classList.toggle('is-on', x === card));
        $$('.tl-node').forEach((x, j) => x.classList.toggle('is-on', j === i));
        renderTerm(t);
      });
      grid.appendChild(card);
      io.observe(card);
    });

    function renderTerm(t) {
      detail.innerHTML =
        '<div class="td-main">' +
        '<div class="td-block"><h4>紫禁城的这一候</h4><p>' + t.palace + '</p></div>' +
        '<div class="td-block"><h4>宫中旧俗</h4><p>' + t.custom + '</p></div>' +
        '</div>' +
        '<div class="td-aside">' +
        '<div class="td-poem">' + t.poem + '</div>' +
        '<div class="td-relic">对应纹样 · ' + t.relic + '</div>' +
        '<div class="td-swatch"><i style="background:' + t.color + '"></i>' + t.name + ' · 代表色</div>' +
        '</div>';
    }
    renderTerm(term);

    // 高亮与今日对应的节点
    $$('.tl-node').forEach(function (n, j) {
      n.classList.toggle('is-on', DATA.terms[j].name === term.name);
    });
  })();

  /* =========================================================
     14. 秋日导览
     ========================================================= */

  (function guide() {
    const nowBox = $('#guideNow');
    const list = $('#routeList');
    const detail = $('#routeDetail');

    function hourLight() {
      const h = new Date().getHours() + new Date().getMinutes() / 60;
      if (h < 8.5) return { k: '晨光', d: '光线低平、影子长，适合拍中轴与丹陛' };
      if (h < 11) return { k: '上午', d: '色温偏冷，红墙饱和度上升，人少' };
      if (h < 14) return { k: '正午', d: '顶光偏硬，宜入殿看展、看纹样' };
      if (h < 16.5) return { k: '斜阳', d: '暖调最厚，落叶与宫墙对比最强' };
      if (h < 18) return { k: '暮色', d: '角楼与护城河倒影最佳，冷青显现' };
      return { k: '月夜', d: '月出后宜看角楼与水面，注意闭馆时间' };
    }

    const light = hourLight();
    const rec = DATA.routes.find((r) => (phase.id === 'early' ? r.id === 'r1' : phase.id === 'mid' ? r.id === 'r2' : r.id === 'r3'));

    nowBox.innerHTML =
      '<div class="gn-badge">' + term.name + '</div>' +
      '<div class="gn-text"><b>此刻推荐 · ' + rec.name + '</b>' +
      '<p>' + rec.intro + '</p></div>' +
      '<div class="gn-meta">' +
      '<div><em>当前光时</em>' + light.k + '</div>' +
      '<div><em>光线特征</em>' + light.d + '</div>' +
      '<div><em>建议时长</em>' + rec.duration + '</div>' +
      '</div>';

    let active = rec.id;
    DATA.routes.forEach(function (r) {
      const b = document.createElement('button');
      b.className = 'route-btn' + (r.id === active ? ' is-on' : '');
      b.style.setProperty('--rb', r.tone);
      b.innerHTML =
        '<div class="rb-name">' + r.name + '</div>' +
        '<div class="rb-meta"><span>' + r.phase + '</span><span>' + r.stops.length + ' 站</span></div>' +
        '<div class="rb-bar"></div>';
      b.addEventListener('click', function () {
        active = r.id;
        $$('.route-btn').forEach((x) => x.classList.toggle('is-on', x === b));
        renderRoute(r);
      });
      list.appendChild(b);
    });

    function renderRoute(r) {
      detail.innerHTML =
        '<div class="rd-head"><h3>' + r.name + '</h3><p>' + r.intro + '</p></div>' +
        '<div class="rd-meta">' +
        '<div><em>节气区间</em>' + r.phase + '</div>' +
        '<div><em>建议时长</em>' + r.duration + '</div>' +
        '<div><em>最佳光时</em>' + r.bestLight + '</div>' +
        '</div>' +
        '<div class="rd-stops">' + r.stops.map((s) =>
          '<div class="rd-stop"><b>' + s.name + '</b><time>' + s.time + '</time><p>' + s.note + '</p></div>'
        ).join('') + '</div>';
    }
    renderRoute(rec);
  })();

  /* =========================================================
     15. 关于作品
     ========================================================= */

  (function about() {
    const grid = $('#capGrid');
    DATA.capabilities.forEach(function (c) {
      const d = document.createElement('div');
      d.className = 'cap';
      d.innerHTML = '<div class="cap-icon">' + c.icon + '</div>' +
        '<div><h4>' + c.title + '</h4><p>' + c.desc + '</p></div>';
      grid.appendChild(d);
    });
  })();

  /* =========================================================
     16. 启动
     ========================================================= */

  resizeLeaves();
  window.addEventListener('resize', function () {
    clearTimeout(window.__rz);
    window.__rz = setTimeout(resizeLeaves, 260);
  });
  requestAnimationFrame(tick);
  spy();

})();
