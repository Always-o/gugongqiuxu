/* ===========================================================
   故宫秋序 · AI 引擎
   1. 图像风格迁移（工笔 / 古风摄影 / 水墨 / 落枫插画）—— 纯 Canvas 像素级实现
   2. 格律诗词生成 —— 四韵部 × 三类句式 + 起承转合约束
   3. 节气知识问答 —— 本地知识检索 + 结构化作答
   =========================================================== */

window.AI = (function () {

  /* =========================================================
     一、图像风格迁移
     ========================================================= */

  const PAPER = [244, 235, 216];

  function fitCanvas(img, max) {
    const r = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * r));
    c.height = Math.max(1, Math.round(img.height * r));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  function lumaMap(data, w, h) {
    const L = new Float32Array(w * h);
    for (let i = 0, p = 0; i < L.length; i++, p += 4) {
      L[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    }
    return L;
  }

  function sobel(L, w, h) {
    const E = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gx = -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] + L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1];
        const gy = -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] + L[i + w - 1] + 2 * L[i + w] + L[i + w + 1];
        E[i] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    return E;
  }

  const clamp = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

  // 工笔重彩：绢本色阶归纳 + 线稿提取（沿明度映射到绢本色谱，避免偏色）
  function styleGongbi(img) {
    const c = fitCanvas(img, 760);
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    const L = lumaMap(d, w, h);
    const E = sobel(L, w, h);
    // 素绢 → 藤黄 → 赭石 → 朱磦 → 墨
    const RAMP = [[250, 240, 219], [237, 215, 172], [207, 169, 110], [148, 101, 61], [58, 38, 26]];

    for (let i = 0, p = 0; i < L.length; i++, p += 4) {
      const q = (1 - L[i] / 255) * 4;
      const a = Math.min(3, Math.floor(q));
      const f = q - a;
      let r = RAMP[a][0] * (1 - f) + RAMP[a + 1][0] * f;
      let g = RAMP[a][1] * (1 - f) + RAMP[a + 1][1] * f;
      let b = RAMP[a][2] * (1 - f) + RAMP[a + 1][2] * f;
      // 保留少量原色相
      r += (d[p] - L[i]) * 0.18;
      g += (d[p + 1] - L[i]) * 0.18;
      b += (d[p + 2] - L[i]) * 0.18;
      // 线稿压深
      const m = 1 - smooth(26, 100, E[i]) * 0.70;
      d[p] = clamp(r * m);
      d[p + 1] = clamp(g * m);
      d[p + 2] = clamp(b * m);
    }
    ctx.putImageData(id, 0, 0);

    // 绢丝纹
    ctx.globalAlpha = 0.05;
    for (let x = 0; x < w; x += 3) {
      ctx.fillStyle = x % 6 === 0 ? '#8a6a3c' : '#fffaf0';
      ctx.fillRect(x, 0, 1, h);
    }
    ctx.globalAlpha = 1;
    return c;
  }

  // 古风摄影：暖调曲线 + 暗角 + 颗粒
  function stylePhoto(img) {
    const c = fitCanvas(img, 900);
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    const cx = w / 2, cy = h / 2, maxR = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        let r = d[p], g = d[p + 1], b = d[p + 2];
        // 暖调
        r = r * 1.10 + 8;
        g = g * 1.01 + 2;
        b = b * 0.84 - 4;
        // S 曲线
        const sc = (v) => {
          const t = v / 255;
          return clamp((t < 0.5 ? 1.04 * t * t * 2 * 0.5 + t * 0.02 : 1 - Math.pow(1 - t, 1.55) * 1.0 + t * 0.0) * 255 + (t - 0.5) * 8);
        };
        r = sc(r); g = sc(g); b = sc(b);
        // 暗角 + 颗粒
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxR;
        const vig = 1 - 0.42 * smooth(0.35, 1.05, dist);
        const grain = (((x * 731 + y * 197) % 23) - 11) * 0.55;
        d[p] = clamp(r * vig + grain);
        d[p + 1] = clamp(g * vig + grain);
        d[p + 2] = clamp(b * vig + grain * 0.8);
      }
    }
    ctx.putImageData(id, 0, 0);
    return c;
  }

  // 水墨长卷：去色 + 墨阶 + 宣纸 + 留白
  function styleInk(img) {
    const c = fitCanvas(img, 900);
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    const L = lumaMap(d, w, h);
    const E = sobel(L, w, h);

    for (let i = 0, p = 0; i < L.length; i++, p += 4) {
      const l = L[i] / 255;
      // 墨的浓淡：暗部浓墨，亮部留白
      let ink = smooth(0.78, 0.16, l) * 0.92;
      // 边缘加墨，模拟皴擦
      ink += smooth(40, 130, E[i]) * 0.30;
      ink = Math.min(0.96, ink);
      // 宣纸泛黄 + 一点点冷墨
      const paperR = 245 - 6 * Math.sin(i * 0.7), paperG = 237, paperB = 219;
      d[p] = clamp(paperR * (1 - ink) + 26 * ink);
      d[p + 1] = clamp(paperG * (1 - ink) + 28 * ink);
      d[p + 2] = clamp(paperB * (1 - ink) + 32 * ink);
    }
    ctx.putImageData(id, 0, 0);
    return c;
  }

  // 暮秋落枫插画：秋色谱映射 + 平面化
  function styleIllustration(img) {
    const c = fitCanvas(img, 820);
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    const L = lumaMap(d, w, h);
    const E = sobel(L, w, h);
    // 暮秋五色：纸白 → 杏黄 → 赭金 → 枫红 → 墨褐
    const PAL = [[248, 238, 218], [233, 199, 132], [201, 148, 66], [163, 78, 44], [72, 40, 28]];

    for (let i = 0, p = 0; i < L.length; i++, p += 4) {
      const l = L[i] / 255;
      const t = (1 - l) * (PAL.length - 1);
      const a = Math.floor(t), b = Math.min(PAL.length - 1, a + 1), f = t - a;
      let r = PAL[a][0] * (1 - f) + PAL[b][0] * f;
      let g = PAL[a][1] * (1 - f) + PAL[b][1] * f;
      let bl = PAL[a][2] * (1 - f) + PAL[b][2] * f;
      // 原图色相略微渗入，避免死板
      r = r * 0.86 + d[p] * 0.14;
      g = g * 0.86 + d[p + 1] * 0.14;
      bl = bl * 0.86 + d[p + 2] * 0.14;
      // 边缘压深，平面化描边感
      const k = 1 - smooth(45, 120, E[i]) * 0.55;
      d[p] = clamp(r * k);
      d[p + 1] = clamp(g * k);
      d[p + 2] = clamp(bl * k);
    }
    ctx.putImageData(id, 0, 0);
    return c;
  }

  const STYLES = {
    gongbi: { name: '故宫工笔', desc: '色阶压平，提线稿，偏绢本暖黄', fn: styleGongbi },
    photo: { name: '古风摄影', desc: '拉暖色曲线，压暗角，加点颗粒', fn: stylePhoto },
    ink: { name: '水墨长卷', desc: '按墨阶分染，边角补墨，留白', fn: styleInk },
    illustration: { name: '落枫插画', desc: '换成秋天那套色，压平，描深边', fn: styleIllustration }
  };

  function stylize(img, styleId) {
    const s = STYLES[styleId] || STYLES.gongbi;
    return new Promise(function (resolve, reject) {
      // 让 UI 有机会先绘制进度态
      setTimeout(function () {
        try { resolve(s.fn(img)); } catch (e) { reject(e); }
      }, 60);
    });
  }

  /* =========================================================
     二、格律诗词生成
     ========================================================= */

  const TAGS = {
    tree: ['梧桐', '银杏', '霜叶', '丹枫', '疏桐', '宫槐', '黄叶'],
    flower: ['黄花', '菊'],
    bird: ['归雁', '寒鸦'],
    light: ['晚照', '秋光', '残阳'],
    moon: ['冷月'],
    wind: ['西风'],
    water: ['残荷', '芦花'],
    dew: ['玉露'],
    sound: ['檐铃'],
    wall: ['朱垣'],
    path: ['丹陛', '玉阶']
  };

  const PLACE = [
    ['紫禁', 'any'], ['宫墙', 'wall'], ['御苑', 'any'], ['金水', 'water'], ['丹陛', 'path'],
    ['彤庭', 'any'], ['长街', 'path'], ['玉阶', 'path'], ['角楼', 'any'], ['太和', 'any'],
    ['东华', 'any'], ['神武', 'any'], ['文华', 'any'], ['内廷', 'any'], ['重门', 'any'], ['西苑', 'any']
  ];

  const THING = [
    ['梧桐', 'tree'], ['银杏', 'tree'], ['霜叶', 'tree'], ['丹枫', 'tree'], ['疏桐', 'tree'],
    ['宫槐', 'tree'], ['黄花', 'flower'], ['归雁', 'bird'], ['寒鸦', 'bird'], ['残荷', 'water'],
    ['芦花', 'water'], ['晚照', 'light'], ['秋光', 'light'], ['冷月', 'moon'], ['西风', 'wind'],
    ['玉露', 'dew'], ['檐铃', 'sound'], ['朱垣', 'wall']
  ];

  const MANNER = [
    ['一夜', 'any'], ['三更', 'moon'], ['向晚', 'light'], ['清晨', 'light'], ['霜后', 'any'],
    ['雨余', 'any'], ['风起', 'wind'], ['月明', 'moon'], ['露重', 'dew'], ['秋半', 'any'],
    ['暮色', 'light'], ['薄暮', 'light'], ['连宵', 'any']
  ];

  const CONJ = ['莫道', '谁怜', '独有', '犹记', '不知', '但见', '偏是', '最是', '休言', '只今', '借问', '却看'];

  // 仄收（句脚用上/去/入声，不押韵）：七绝的第三句必须仄收
  const ZE = [
    ['满宫阙', 'any'], ['掩朱户', 'wall'], ['入寒雾', 'any'], ['又几度', 'any'],
    ['冷画阁', 'any'], ['落残照', 'light'], ['尽染遍', 'tree'], ['半零落', 'tree'],
    ['满庭树', 'tree'], ['转空砌', 'any'], ['听夜雨', 'sound'], ['湿苔径', 'any'],
    ['锁深院', 'any'], ['压檐角', 'any']
  ];

  // 平收（押韵），按韵部组织
  const RHYMES = [
    {
      key: 'qiu', name: '尤韵',
      items: [
        ['满宫秋', 'any'], ['又报秋', 'any'], ['几度秋', 'any'], ['已半秋', 'any'],
        ['最宜秋', 'any'], ['不胜秋', 'any'], ['独倚楼', 'any'], ['月满楼', 'moon'],
        ['水自流', 'water'], ['一院秋', 'any'], ['影自悠', 'any'], ['未知秋', 'any']
      ]
    },
    {
      key: 'huang', name: '阳韵',
      items: [
        ['尽染黄', 'tree'], ['满院香', 'flower'], ['照短墙', 'light'], ['入画廊', 'wind'],
        ['共月长', 'light'], ['带露凉', 'dew'], ['半染霜', 'tree'], ['满地霜', 'any'], ['覆玉廊', 'any']
      ]
    },
    {
      key: 'han', name: '寒韵',
      items: [
        ['满庭寒', 'any'], ['叶半残', 'tree'], ['露未干', 'dew'], ['雁影寒', 'bird'],
        ['月正圆', 'moon'], ['影阑珊', 'light'], ['客未还', 'any'], ['又一年', 'any']
      ]
    },
    {
      key: 'qing', name: '庚青韵',
      items: [
        ['日渐清', 'light'], ['叶满庭', 'tree'], ['雁字明', 'bird'], ['露初凝', 'dew'],
        ['影自清', 'light'], ['月满亭', 'moon'], ['落叶零', 'tree'], ['起秋声', 'sound']
      ]
    }
  ];

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function compatible(item, tag) {
    if (!tag || item[1] === 'any' || tag === 'any') return true;
    return item[1] === tag;
  }

  const TITLE_TPL = ['{k}即景', '秋日{k}', '{k}秋望', '题{k}晚眺', '{k}'];
  const NOTE_TPL = [
    '第一句「{a}」先把地方和时间点出来，第二句「{b}」动了一下，是整首的转身。第三句「{c}」故意岔开，最后「{d}」收回来。{rhymeNote}',
    '从「{a}」的眼前景起，接「{b}」的时间推移，第三句「{c}」荡开，第四句「{d}」落定。{rhymeNote}',
    '「{a}」定调子，颜色偏{color}。「{b}」写声音，「{c}」留空，「{d}」把情绪收住。{rhymeNote}'
  ];

  function generatePoem(keyword, form) {
    const kw = (keyword || '故宫落枫').trim();
    const seedTag = /枫|叶|杏|槐|桐/.test(kw) ? 'tree'
      : /月|夜/.test(kw) ? 'moon'
        : /雁|鸦/.test(kw) ? 'bird'
          : /水|河|桥/.test(kw) ? 'water'
            : /风/.test(kw) ? 'wind'
              : /花|菊/.test(kw) ? 'flower' : 'any';

    if (form === 'duanju') return generateDuanju(kw, seedTag);
    if (form === 'copy') return generateCopy(kw, seedTag);

    // ---- 七言绝句 ----
    // 用词去重：整词不重复，且三字谓语不重复首字（避免"满…满…"）
    const usedText = new Set();
    const usedHead = new Set();
    const usedTail = new Set();

    function take(list, tag) {
      let c = list.filter((it) => compatible(it, tag) && !usedText.has(it[0]));
      if (!c.length) c = list.filter((it) => !usedText.has(it[0]));
      if (!c.length) c = list;
      const it = pick(c);
      usedText.add(it[0]);
      return it[0];
    }

    function takePred(list, tag) {
      let c = list.filter((it) => compatible(it, tag) && !usedText.has(it[0]) && !usedHead.has(it[0][0]));
      if (!c.length) c = list.filter((it) => !usedText.has(it[0]) && !usedHead.has(it[0][0]));
      if (!c.length) c = list.filter((it) => !usedText.has(it[0]));
      if (!c.length) c = list;
      const it = pick(c);
      usedText.add(it[0]);
      usedHead.add(it[0][0]);
      return it[0];
    }

    // 韵脚专用：同一首里不用同一个韵字收尾（避「重韵」）
    function takeRhyme(list, tag) {
      let c = list.filter((it) => compatible(it, tag) && !usedText.has(it[0]) &&
        !usedHead.has(it[0][0]) && !usedTail.has(it[0].slice(-1)));
      if (!c.length) c = list.filter((it) => !usedText.has(it[0]) && !usedTail.has(it[0].slice(-1)));
      if (!c.length) c = list.filter((it) => !usedText.has(it[0]));
      if (!c.length) c = list;
      const it = pick(c);
      usedText.add(it[0]);
      usedHead.add(it[0][0]);
      usedTail.add(it[0].slice(-1));
      return it[0];
    }

    const rg = pick(RHYMES);

    const OK_DUP = '一不无半又自如未独空渐已共最知谁莫但休只';
    function hasAwkwardDup(line) {
      const seen = {};
      for (const ch of line) {
        if (OK_DUP.indexOf(ch) >= 0) continue;
        seen[ch] = (seen[ch] || 0) + 1;
        if (seen[ch] > 1) return true;
      }
      return false;
    }

    // 跨句复字：二十八字里除虚词外不复用同一个字
    function dupAcross(lines) {
      const seen = {};
      for (const line of lines) {
        for (const ch of line) {
          if (OK_DUP.indexOf(ch) >= 0) continue;
          if (seen[ch]) return true;
          seen[ch] = 1;
        }
      }
      return false;
    }

    // 七绝两种起式：首句入韵 / 首句不入韵（不入韵时首句仄收）
    const firstRhymes = Math.random() < 0.5;

    function build(rgx) {
      usedText.clear();
      usedHead.clear();
      usedTail.clear();
      return [
        take(PLACE, 'any') + take(THING, seedTag) +
          (firstRhymes ? takeRhyme(rgx.items, 'any') : takePred(ZE, seedTag)),
        take(MANNER, 'any') + take(THING, 'any') + takeRhyme(rgx.items, 'any'),
        pick(CONJ) + take(THING, 'any') + takePred(ZE, 'any'),
        take(PLACE, 'any') + take(THING, 'any') + takeRhyme(rgx.items, 'any')
      ];
    }

    let lines = null, rhymeUsed = rg, clean = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      const r2 = attempt === 0 ? rg : pick(RHYMES);
      const cand = build(r2);
      if (!cand.some(hasAwkwardDup) && !dupAcross(cand)) { lines = cand; rhymeUsed = r2; clean = true; break; }
      if (!lines) { lines = cand; rhymeUsed = r2; }
      else if (!clean && !cand.some(hasAwkwardDup)) { lines = cand; rhymeUsed = r2; }
    }

    const cleanKw = kw.replace(/^故宫/, '') || '禁城';
    const isTerm = DATA.terms.some((t) => t.name === cleanKw);
    let titleTpl;
    if (isTerm) titleTpl = pick(['{k}日作', '{k}·禁中秋色', '{k}小记']);
    else if (cleanKw.length >= 4) titleTpl = pick(['{k}', '{k}即景', '题{k}']);
    else titleTpl = pick(TITLE_TPL);

    const rhymeNote = firstRhymes
      ? '首句入韵，第一、二、四句同押' + rhymeUsed.name + '，一韵到底；第三句仄收，不入韵。'
      : '首句不入韵，只押第二、四句，押' + rhymeUsed.name + '；第一、三句都以仄声收。';

    const note = NOTE_TPL[Math.floor(Math.random() * NOTE_TPL.length)]
      .replace('{a}', lines[0]).replace('{b}', lines[1])
      .replace('{c}', lines[2]).replace('{d}', lines[3])
      .replace('{rhymeNote}', rhymeNote)
      .replace('{color}', pick(['金棕', '朱红', '青灰', '赭褐']));

    return {
      form: '七言绝句',
      title: titleTpl.replace('{k}', cleanKw),
      keyword: kw,
      lines: lines,
      note: note,
      rhyme: rhymeUsed.name,
      meta: '七言绝句 · ' + rhymeUsed.name + ' · ' + (firstRhymes ? '首句入韵' : '首句不入韵')
    };
  }

  const DJ_A = ['宫墙以西', '丹陛之上', '金水之畔', '御苑深处', '长街尽头', '角楼之下', '桐荫之下', '玉阶之前'];
  const DJ_B = ['霜叶半落', '秋光渐薄', '黄花自开', '归雁南去', '月华如水', '西风初起', '露重衣寒', '暮色四合'];
  const DJ_C = ['一庭秋色', '半壁残阳', '满阶落叶', '数点寒鸦', '几声檐铃', '一水寒光'];
  const DJ_D = ['皆是故人', '不知归处', '自成诗行', '无人与共', '都入梦来', '各自天涯'];

  function generateDuanju(kw, tag) {
    const a = pick(DJ_A), b = pick(DJ_B), c = pick(DJ_C), d = pick(DJ_D);
    return {
      form: '古风短句',
      title: kw,
      keyword: kw,
      lines: [a + '，' + b + '。', c + '，' + d + '。'],
      note: '四字一句，按「景、动、聚、散」排下来。适合当海报题跋、视频字幕，或者展签上那两行字。',
      meta: '古风短句 · 四言对句'
    };
  }

  const COPY_TPL = [
    '秋天到{kw}，是悄悄来的。先是一阵风，再是一片叶，然后整面墙都变了色。',
    '{kw}的秋天不用去远处找。抬头是檐角，低头是叶子，走两步就撞上了。',
    '把{kw}的秋天折起来，只有巴掌大：一半朱红，一半杏黄。',
    '有人在{kw}等一场霜。霜不来，叶子就一直红着，替他等。',
    '如果只剩一个下午，去{kw}。三点半的光最好，别错过。'
  ];

  function generateCopy(kw, tag) {
    const body = kw.replace(/^故宫/, '') || kw;
    return {
      form: '秋日文案',
      title: kw,
      keyword: kw,
      lines: [pick(COPY_TPL).replace(/\{kw\}/g, body)],
      note: '写的时候尽量给具体的时间和颜色，不铺排形容词。可以直接当公众号配文、海报副标或短视频口播。',
      meta: '文案 · 短句结构'
    };
  }

  /* =========================================================
     三、节气与故宫知识问答
     ========================================================= */

  const PLACES = [
    {
      keys: ['太和殿', '金銮殿'],
      text: '太和殿等级最高：重檐庑殿顶，面阔十一间，底下三层汉白玉台基。秋天要看的是光。上午九点前后太阳还低，斜着扫过丹陛，三层台基变成三道金线，殿身的红也最饱和。'
    },
    {
      keys: ['角楼'],
      text: '角楼是宫里屋顶最复杂的，俗称九梁十八柱七十二条脊。四座各占城墙一角，傍晚最好看：斜阳把七十二道脊一道道点亮，护城河里的影子被水一晃就碎了。'
    },
    {
      keys: ['御花园', '堆秀山', '浮碧亭', '绛雪轩'],
      text: '御花园是内廷秋天颜色最多的地方。古柏墨绿，太湖石青灰，阶前那丛菊是唯一的暖色。堆秀山是园里最高处，明清帝后重阳前后登上去「辞青」。'
    },
    {
      keys: ['金水河', '金水桥', '玉带桥'],
      text: '内金水河从西北进、东南出，五座石桥横在上面，中间那道是御路桥。仲秋月圆时水面冷得发青，跟红墙撞在一起，是宫里最冲的配色。白居易写「半江瑟瑟半江红」，说的就是这个调子。'
    },
    {
      keys: ['十八槐', '断虹桥'],
      text: '十八槐在武英殿东边、断虹桥北边，十八株几百年的老槐，宫里少见的一片大荫。霜降前后槐和银杏一起变色，叶子铺满砖地，是暮秋最厚的一层颜色。'
    },
    {
      keys: ['慈宁宫'],
      text: '慈宁宫是太后住的地方。它的花园是故宫秋天最有名的一处：两株老银杏在红墙前撑开一片黄，午后光从叶隙漏下来，墙上全是碎光斑。'
    },
    {
      keys: ['午门'],
      text: '午门是正门，平面是个「凹」字。秋天穿门洞过去，风从广场直灌进来，宫里最早凉的就是这儿。处暑之后的凉，是从这道门开始的。'
    },
    {
      keys: ['神武门'],
      text: '神武门是北门，出去就是景山。暮秋要看逆光：下午四点后城楼只剩个剪影，天从橙红褪到墨青，这一张收尾最好。'
    },
    {
      keys: ['乾清宫'],
      text: '乾清宫是内廷正殿，前面有个大月台。秋分祭月在这儿最有意思：月从东边上来，正对月台，殿里不点灯也亮。'
    }
  ];

  const nowTermCache = {};

  function termTable() {
    return [
      { name: '处暑', from: [8, 23], to: [9, 6] },
      { name: '白露', from: [9, 7], to: [9, 21] },
      { name: '秋分', from: [9, 22], to: [10, 7] },
      { name: '寒露', from: [10, 8], to: [10, 22] },
      { name: '霜降', from: [10, 23], to: [11, 6] },
      { name: '立冬', from: [11, 7], to: [11, 22] }
    ];
  }

  function currentTerm(d) {
    d = d || new Date();
    const m = d.getMonth() + 1, day = d.getDate();
    const idx = m * 100 + day;
    const t = termTable().find((x) => idx >= x.from[0] * 100 + x.from[1] && idx <= x.to[0] * 100 + x.to[1]);
    if (t) return DATA.terms.find((x) => x.name === t.name);
    // 秋季之外：给出最近的一个
    return idx < 823 ? DATA.terms[0] : DATA.terms[5];
  }

  function phaseOfTerm(name) {
    if (['处暑', '白露'].indexOf(name) >= 0) return DATA.phases[0];
    if (['秋分', '寒露'].indexOf(name) >= 0) return DATA.phases[1];
    return DATA.phases[2];
  }

  function termAnswer(t) {
    return '「' + t.name + '」' + t.date + ' · ' + t.index + '\n' +
      '三候：' + t.hou.join('｜') + '\n' +
      '宫中：' + t.palace + '\n' +
      '旧俗：' + t.custom + '\n' +
      '纹样：' + t.relic + '　诗：' + t.poem;
  }

  function ask(q) {
    const s = (q || '').trim();
    if (!s) return { text: '想问什么直接说，比如「霜降那天宫里做什么」「角楼几点最好看」。', tag: '提示' };

    const now = currentTerm();

    // 时间/节令类
    if (/现在|今天|当下|最近|什么节气|哪个节气/.test(s) && !/文物/.test(s)) {
      const p = phaseOfTerm(now.name);
      return {
        text: '今日属「' + now.name + '」，在秋序里是' + p.label + '（' + p.range + '）。\n' +
          p.slogan + '。' + p.desc + '\n' +
          '此刻光影建议：' + p.light + '。',
        tag: '时令'
      };
    }

    // 路线类
    if (/路线|怎么逛|怎么走|导览|推荐.*(走|逛|看)|几小时/.test(s)) {
      const p = phaseOfTerm(now.name);
      const r = DATA.routes.find((x) => p.id === 'early' ? x.id === 'r1' : p.id === 'mid' ? x.id === 'r2' : x.id === 'r3');
      return {
        text: '按今日时令，建议走「' + r.name + '」（' + r.phase + '，' + r.duration + '）。\n' +
          r.intro + '\n' +
          '最佳光时：' + r.bestLight + '\n' +
          '路线：' + r.stops.map((x) => x.name + '（' + x.time + '）').join(' → '),
        tag: '导览'
      };
    }

    // 节气
    const term = DATA.terms.find((t) => s.indexOf(t.name) >= 0);
    if (term) return { text: termAnswer(term), tag: '节气·' + term.name };

    // 文物
    const relic = DATA.relics.find((r) => r.tags.some((k) => s.indexOf(k) >= 0) || s.indexOf(r.glyph) >= 0);
    if (relic) {
      return {
        text: '「' + relic.name + '」' + relic.era + ' · ' + relic.kind + '\n' +
          relic.brief + '\n' + relic.story + '\n' +
          '秋日寓意：' + relic.meaning,
        tag: '文物'
      };
    }

    // 地点
    let best = null, bestScore = 0;
    PLACES.forEach((p) => {
      let sc = 0;
      p.keys.forEach((k) => { if (s.indexOf(k) >= 0) sc += k.length; });
      if (sc > bestScore) { bestScore = sc; best = p; }
    });
    if (best) return { text: best.text, tag: '建筑' };

    // 色彩/美学类
    if (/颜色|配色|色系|色调|为什么.*红|审美/.test(s)) {
      return {
        text: '故宫秋色的结构是三组对比：朱红（宫墙）对青灰（琉璃瓦与石作）、杏黄（银杏）对墨绿（古柏）、暖光对冷影。\n' +
          '这三组关系在唐代已被写定——白居易「半江瑟瑟半江红」，「瑟瑟」就是青碧。本站主色即由此提取：朱红 #9c2b23、杏黄 #d9b062、青灰 #6e8378、棕橙 #8a5a33、月夜冷青 #3d5860。',
        tag: '美学'
      };
    }

    // 诗句
    if (/诗|诗里|哪首/.test(s)) {
      const p = DATA.poems[Math.floor(Math.random() * DATA.poems.length)];
      return { text: '《' + p.title + '》' + p.dynasty + '·' + p.author + '\n' + p.lines.join('，') + '。\n' + p.note, tag: '诗' };
    }

    // 问候
    if (/你好|您好|你是谁|介绍一下自己/.test(s)) {
      return {
        text: '我是这个站的讲解员。紫禁城的秋我大致都记着：六个节气、几处光最好的位置、每件秋物的讲究。\n可以问我「霜降宫里做什么」「角楼几点最好看」「推荐一条暮秋路线」。',
        tag: '讲解员'
      };
    }

    // 无法匹配：给出可用问题
    return {
      text: '这个问题我没收进册子里。\n能答的是：六个节气、宫里秋天的旧俗、几处建筑的光影、文物上的纹样，还有三条路线。\n换个问法试试。',
      tag: '未收录'
    };
  }

  /* =========================================================
     四、诗画海报合成
     ========================================================= */

  function poster(poem) {
    const W = 900, H = 1200;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    // 纸底
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#f7efe0');
    g.addColorStop(0.5, '#f1e5cf');
    g.addColorStop(1, '#eadcc2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 纸纤维
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      ctx.fillStyle = Math.random() > 0.5 ? '#8a6a3c' : '#fffdf6';
      ctx.fillRect(x, y, Math.random() * 26 + 4, 1);
    }
    ctx.globalAlpha = 1;

    // 双线框
    ctx.strokeStyle = 'rgba(160,120,60,0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(38, 38, W - 76, H - 76);
    ctx.strokeStyle = 'rgba(160,120,60,0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 50, W - 100, H - 100);

    // 底部远山剪影
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = '#5c3a22';
    ctx.beginPath();
    ctx.moveTo(60, 906);
    ctx.quadraticCurveTo(240, 848, 420, 880);
    ctx.quadraticCurveTo(600, 912, 780, 862);
    ctx.quadraticCurveTo(828, 850, 840, 902);
    ctx.lineTo(840, 948);
    ctx.lineTo(60, 948);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 顶部金线
    ctx.strokeStyle = 'rgba(160, 120, 60, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(90, 96);
    ctx.lineTo(270, 96);
    ctx.stroke();

    // 竖排标题
    const title = '故宫秋序';
    ctx.fillStyle = '#7d1f19';
    ctx.font = '600 62px "Songti SC","STSong","SimSun",serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < title.length; i++) {
      ctx.fillText(title[i], 786, 160 + i * 74);
    }

    // 诗题
    ctx.font = '400 26px "Songti SC","STSong",serif';
    ctx.fillStyle = 'rgba(60,42,26,0.85)';
    ctx.fillText(poem.title.slice(0, 8), 786, 452);

    // 诗句：竖排，自右向左；长句自动分栏
    const cols = [];
    poem.lines.forEach(function (line) {
      const clean = line.replace(/[，。、！？；：,.]/g, '');
      for (let i = 0; i < clean.length; i += 9) cols.push(clean.slice(i, i + 9));
    });
    const fs = cols.length > 7 ? 34 : cols.length > 5 ? 38 : 44;
    const colGap = cols.length > 7 ? 76 : 104;
    const startX = 690;
    ctx.font = '500 ' + fs + 'px "Kaiti SC","STKaiti","KaiTi","Songti SC",serif';
    ctx.fillStyle = '#2a1d14';
    cols.forEach(function (col, i) {
      const x = startX - i * colGap;
      if (x < 120) return;
      col.split('').forEach(function (ch, j) {
        ctx.fillText(ch, x, 520 + j * (fs + 16));
      });
    });

    // 落款
    ctx.textAlign = 'left';
    ctx.font = '300 22px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillStyle = 'rgba(60,42,26,0.6)';
    ctx.fillText('关键词 · ' + poem.keyword, 90, 1024);
    ctx.fillText(poem.meta, 90, 1054);
    ctx.fillText('故宫秋序 · AI 时序雅集', 90, 1084);

    // 朱印
    ctx.save();
    ctx.fillStyle = '#9c2b23';
    const sx = 90, sy = 804, sw = 76, sh = 76;
    ctx.globalAlpha = 0.94;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#faeee0';
    ctx.font = '600 30px "Songti SC","STSong",serif';
    ctx.textAlign = 'center';
    ctx.fillText('秋', sx + sw / 2, sy + 28);
    ctx.fillText('序', sx + sw / 2, sy + 62);
    ctx.restore();

    return c;
  }

  function loadImageFile(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('图片解码失败')); };
      img.src = url;
    });
  }

  return {
    STYLES: STYLES,
    stylize: stylize,
    generatePoem: generatePoem,
    ask: ask,
    poster: poster,
    loadImageFile: loadImageFile,
    currentTerm: currentTerm,
    phaseOfTerm: phaseOfTerm,
    PLACES: PLACES
  };
})();
