// 〈綻放 BLOOM〉遊戲引擎。文字內容在 cards.js。
(() => {
  'use strict';

  const D = window.BLOOM_DATA;
  const KEYS = ['mood', 'baby', 'family', 'bmi'];
  const SWIPE_COMMIT = 90; // 拖超過幾 px 才算選擇
  const SWIPE_PREVIEW = 36;

  const $ = (s) => document.querySelector(s);
  const el = {
    phone: $('#phone'),
    day: $('#day'),
    bmiValue: $('#bmiValue'),
    bmiTarget: $('#bmiTarget'),
    card: $('#card'),
    reply: $('#reply'),
    btnL: $('#btnLeft'),
    btnR: $('#btnRight'),
    overlay: $('#overlay'),
    cracks: $('#cracks'),
    push: $('#push'),
  };

  let S; // 遊戲狀態
  let shownBmi = null;
  let replyTimer = 0;
  let presenter = false; // 報告者模式（網址加 ?menu）
  let runId = 0;         // 每次重新開始就 +1，讓還在跑的 Boss 停下來
  let full = true;       // 完整版（預設）：顯示標了 extra 的卡片、Boss 的每一張理論卡；網址加 ?short 變成約 8 分鐘的精簡版
  let stage = 0;         // 可愛逐漸崩壞：0～3 是第幾章，4 是 App 當機
  let paintSound = () => {}; // 啟動時才接上頂欄的音效按鈕

  // ---------- 音效（用 Web Audio 即時合成，不需要音檔） ----------
  const Sound = (() => {
    let ctx = null;
    let on = false; // 預設關閉：全班一起玩時才不會此起彼落
    try { on = localStorage.getItem('bloom-sound') === 'on'; } catch { /* 無痕模式讀不到就用預設 */ }
    const ready = () => {
      if (!on) return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    function tone(freq, dur, { type = 'sine', vol = 0.06, at = 0, slide = 0 } = {}) {
      const c = ready();
      if (!c) return;
      const t = c.currentTime + at;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    function noise(dur, { vol = 0.04, at = 0, cutoff = 1500 } = {}) {
      const c = ready();
      if (!c) return;
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf;
      f.type = 'lowpass';
      f.frequency.value = cutoff;
      g.gain.value = vol;
      src.connect(f).connect(g).connect(c.destination);
      src.start(c.currentTime + at);
    }
    const sfx = {
      tap: () => tone(660, 0.06, { type: 'triangle', vol: 0.04 }),
      swipe: () => noise(0.14, { vol: 0.04, cutoff: 1800 }),
      push: () => { tone(880, 0.12); tone(1320, 0.18, { at: 0.11 }); },
      coin: () => { tone(988, 0.07, { type: 'square', vol: 0.03 }); tone(1319, 0.22, { type: 'square', vol: 0.03, at: 0.07 }); },
      cry: () => tone(620, 0.32, { type: 'triangle', vol: 0.045, slide: 180 }),
      good: () => { tone(784, 0.1); tone(1047, 0.16, { at: 0.09 }); },
      bad: () => tone(196, 0.18, { type: 'sawtooth', vol: 0.035, slide: -60 }),
      flip: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { vol: 0.04, at: i * 0.06 })),
      crash: () => { tone(330, 0.5, { type: 'sawtooth', vol: 0.04, slide: -250 }); noise(0.45, { vol: 0.05, cutoff: 900 }); },
      glitch: () => {
        for (let i = 0; i < 6; i++) tone(200 + Math.random() * 900, 0.05, { type: 'square', vol: 0.025, at: i * 0.06 });
        noise(0.4, { vol: 0.04, cutoff: 3000, at: 0.1 });
      },
    };
    // 手機震動：只有 Android 的瀏覽器支援（iPhone／iPad 沒有），沒有聲音時也會震，所以只用在重要的時刻
    const haptics = { good: 14, bad: 30, coin: [18, 40, 18], cry: 24, crash: [60, 40, 140], glitch: [30, 20, 30, 20, 70], flip: 12 };
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const buzz = (name) => { if (!reduce && haptics[name] && navigator.vibrate) navigator.vibrate(haptics[name]); };
    return {
      play(name) {
        try { sfx[name]?.(); } catch { /* 不支援 Web Audio 的瀏覽器就安靜 */ }
        try { buzz(name); } catch { /* 不支援震動就略過 */ }
      },
      get on() { return on; },
      toggle() {
        on = !on;
        try { localStorage.setItem('bloom-sound', on ? 'on' : 'off'); } catch { /* 略過 */ }
        if (on) ready();
        return on;
      },
    };
  })();

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ''));
  const bmiOf = (v) => D.settings.bmiMin + (D.settings.bmiMax - D.settings.bmiMin) * v / 100;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function newState() {
    return {
      stats: { ...D.settings.start },
      ch: 0, i: 0, day: 1, busy: true, pushes: 0,
      flags: {},                        // 記下的事＋「拒絕／接受了誰幾次」
      hours: { me: 0, partner: 0, mil: 0 },
      crashes: [],                      // { stat, side, day }
      theories: [],                     // 拿到的理論卡 id
      last: {},                         // 最近一次 Boss 的結果，給理論卡填字
      record: {},                       // 每個 Boss 的結果，結局和分享卡用
      ending: null,                     // 結局 id
      metrics: [],                      // 重寫 App 選的新指標
      demo: false,                      // 報告者的結局示範（不送全班數據）
    };
  }

  // 重新開始（可以指定從第幾章開始，報告者模式用）
  function resetGame(ch = 0) {
    runId++;
    S = newState();
    S.ch = ch;
    el.cracks.innerHTML = '';
    el.push.classList.remove('show');
    hideReply();
    setStage(ch);
    renderStats();
  }

  // ---------- 小綻：表情隨章節崩壞 ----------
  const FACES = [
    { eye: 2.8, mouth: 'M43 55 Q50 62 57 55', blush: true },  // 第 1 章：開心
    { eye: 2.8, mouth: 'M44 56 Q50 60 56 56', blush: true },  // 第 2 章：笑容變小
    { eye: 2.6, mouth: 'M44 57 L56 57' },                     // 第 3 章：笑不出來
    { eye: 3.8, mouth: 'M40 53 Q50 66 60 53 Z', grin: true }, // 第 4 章：僵硬的大笑
    { dead: true, mouth: 'M41 58 L45.5 54.5 L50 58 L54.5 54.5 L59 58' }, // App 當機
  ];
  function flowerSVG(face = stage) {
    const f = FACES[clamp(face, 0, FACES.length - 1)];
    const petals = [0, 72, 144, 216, 288]
      .map((a) => `<ellipse cx="50" cy="23" rx="17" ry="22" transform="rotate(${a} 50 50)"/>`).join('');
    const eyes = f.dead
      ? '<path d="M39 44 L45 50 M45 44 L39 50 M55 44 L61 50 M61 44 L55 50" class="mouth"/>'
      : `<circle cx="42" cy="47" r="${f.eye}" class="eye"/><circle cx="58" cy="47" r="${f.eye}" class="eye"/>
        ${f.grin ? '<circle cx="42.8" cy="46.2" r="1" class="pupil"/><circle cx="58.8" cy="46.2" r="1" class="pupil"/>' : ''}`;
    return `<svg viewBox="0 0 100 100" class="flower" aria-hidden="true">
      <g class="petals">${petals}</g>
      <circle cx="50" cy="50" r="21" class="core"/>
      ${eyes}
      ${f.blush ? '<circle cx="37" cy="55" r="3.5" class="blush"/><circle cx="63" cy="55" r="3.5" class="blush"/>' : ''}
      <path d="${f.mouth}" class="mouth${f.grin ? ' grin' : ''}"/>
      ${f.grin ? '<path d="M43 58.5 L57 58.5" class="mouth thin"/>' : ''}
    </svg>`;
  }

  // 換章節時：畫面越來越飽和、越來越不對勁，小綻的表情也跟著變
  function setStage(n) {
    stage = n;
    el.phone.dataset.stage = n;
    $('#brandFlower').innerHTML = flowerSVG();
  }
  const avatarHTML = (who) => (who.avatar === 'flower' ? flowerSVG() : esc(who.avatar));

  // ---------- 數值 ----------
  function renderStats(changed = {}) {
    for (const k of ['mood', 'baby', 'family']) {
      const node = document.querySelector(`.stat[data-stat="${k}"]`);
      const locked = k === 'mood' && moodHidden();
      node.classList.toggle('locked', locked);
      node.querySelector('i').style.width = S.stats[k] + '%';
      node.classList.toggle('danger', !locked && (S.stats[k] <= 20 || S.stats[k] >= 80));
      if (!locked) flash(node, changed[k]);
    }
    const bmi = bmiOf(S.stats.bmi);
    const diff = bmi - D.settings.bmiGoal;
    el.bmiTarget.textContent = diff > 0.05
      ? `目標 ${D.settings.bmiGoal.toFixed(1)}・還差 ${diff.toFixed(1)}`
      : '已達標 🎉 繼續保持！';
    tweenBmi(bmi);
    flash(document.querySelector('.bmi-panel'), changed.bmi);
  }

  function flash(node, d) {
    if (!d) return;
    node.classList.remove('up', 'down');
    void node.offsetWidth; // 重新觸發動畫
    node.classList.add(d > 0 ? 'up' : 'down');
    setTimeout(() => node.classList.remove('up', 'down'), 800);
  }

  function tweenBmi(target) {
    const from = shownBmi ?? target;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / 500);
      shownBmi = from + (target - from) * (1 - (1 - p) ** 3);
      el.bmiValue.textContent = shownBmi.toFixed(1);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function applyEffects(fx) {
    for (const k of KEYS) if (fx[k]) S.stats[k] = clamp(S.stats[k] + fx[k], 0, 100);
    renderStats(fx);
  }

  function addHours(h = {}) {
    for (const [who, n] of Object.entries(h)) S.hours[who] = (S.hours[who] || 0) + n;
  }

  // App 3.0 更新後，精神條被藏起來（還是會歸零崩潰，只是看不到）
  const moodHidden = () => !!S.flags.hideMood;

  // 有沒有在分擔夜奶（協商過，而且沒有中途喊停）
  const sharing = () => !!S.flags.negotiate && !S.flags.negotiateStop;

  // 卡片文字裡可以用的變數：{bmiStatus}、{left}（距離 180 天還有幾天）
  function cardVars() {
    const gap = bmiOf(S.stats.bmi) - D.settings.bmiGoal;
    return {
      bmiStatus: gap > 0.05 ? `BMI 還差 ${gap.toFixed(1)}` : 'BMI 達標了，接下來要「維持」',
      left: D.settings.totalDays - S.day,
    };
  }

  function preview(side) {
    document.querySelectorAll('[data-stat]').forEach((n) => n.classList.remove('pv', 'pv-big'));
    if (!side) return;
    const fx = currentCard()[side].effects || {};
    for (const [k, v] of Object.entries(fx)) {
      if (!v || (k === 'mood' && moodHidden())) continue;
      document.querySelector(`[data-stat="${k}"]`).classList.add(Math.abs(v) >= 8 ? 'pv-big' : 'pv');
    }
  }

  // ---------- 崩潰：媽媽不能 Game Over ----------
  async function resolveCrashes() {
    for (;;) {
      const k = KEYS.find((key) => S.stats[key] <= 0 || S.stats[key] >= 100);
      if (!k) return;
      const side = S.stats[k] <= 0 ? 'low' : 'high';
      S.crashes.push({ stat: k, side, day: S.day });
      await crashScreen(D.crashes[k][side]);
      S.stats[k] = D.settings.crashReset[side];
      addCrack();
      renderStats({ [k]: side === 'low' ? 1 : -1 });
    }
  }

  function crashScreen(c) {
    hideReply();
    Sound.play('crash');
    return new Promise((resolve) => {
      actions.crashGoOn = () => { hideScreen(); resolve(); };
      screen(`
        <div class="chapter-no">崩潰・產後第 ${S.day} 天</div>
        <div class="end-title">${esc(c.title)}</div>
        <p class="end-text">${esc(c.text)}</p>
        <div class="app-push">${flowerSVG()}<div><b>BLOOM</b><br>${esc(c.app)}</div></div>
        <p class="go-on">${esc(D.crashes.goOn)}</p>
        ${c.help ? `<p class="help-line">${esc(c.help)}</p>` : ''}
        <button class="btn" data-act="crashGoOn">繼續</button>`, 'dark crash');
    });
  }

  // 每崩潰一次，畫面多一道永久裂痕
  function addCrack() {
    const n = S.crashes.length;
    const x0 = 20 + ((n * 37) % 60);
    let x = x0, y = 0;
    const pts = [`${x},${y}`];
    while (y < 100) {
      y += 6 + Math.random() * 10;
      x += (Math.random() - 0.5) * 16;
      pts.push(`${x.toFixed(1)},${Math.min(y, 100).toFixed(1)}`);
    }
    el.cracks.insertAdjacentHTML('beforeend',
      `<polyline points="${pts.join(' ')}" /><polyline class="glint" points="${pts.join(' ')}" />`);
  }

  // ---------- 卡片 ----------
  const chapter = () => D.chapters[S.ch];
  const currentCard = () => chapter().cards[S.i];

  function eligible(c) {
    if (c.extra && !full) return false;
    const has = ([k, n]) => (S.flags[k] || 0) >= n;
    return Object.entries(c.when || {}).every(has) && !Object.entries(c.unless || {}).some(has);
  }

  // 從 S.i 開始找下一張可以出現的卡；沒有就回傳 false
  function seekCard() {
    const cards = chapter().cards;
    while (S.i < cards.length && !eligible(cards[S.i])) S.i++;
    return S.i < cards.length;
  }

  function quipHTML(q) {
    const who = D.characters[q.who];
    return `<div class="quip"><div class="avatar" style="--c:${who.color}">${avatarHTML(who)}</div>
      <div><b>${esc(who.name)}</b>${esc(q.text)}</div></div>`;
  }

  function showCard() {
    const c = currentCard();
    if (c.day) S.day = c.day;
    el.day.textContent = `產後第 ${S.day} 天`;

    const labels = `
      <div class="choice-label left">${esc(c.left.label)}</div>
      <div class="choice-label right">${esc(c.right.label)}</div>
      <div class="card-day">第 ${S.day} 天</div>`;
    const hint = '<div class="hint">← 左滑拒絕・右滑接受 →</div>';
    if (c.type === 'article') {
      // App 推薦文章（台灣案例）
      const a = c.article;
      el.card.innerHTML = `${labels}
        <div class="article">
          <div class="article-tag">🌸 BLOOM 推薦文章</div>
          <h3 class="article-title">${esc(a.title)}</h3>
          <div class="article-src">${esc(a.source)}</div>
          <p class="article-sum">${esc(a.summary)}</p>
          ${a.cite ? `<div class="article-cite">${esc(a.cite)}</div>` : ''}
        </div>
        ${c.quip ? quipHTML(c.quip) : ''}
        ${hint}`;
      el.card.setAttribute('aria-label', `BLOOM 推薦文章：${a.title}。${a.summary}`);
    } else {
      const who = D.characters[c.who];
      const text = fill(c.text, cardVars());
      el.card.innerHTML = `${labels}
        <div class="speaker" style="--c:${who.color}">
          <div class="avatar">${avatarHTML(who)}</div>
          <div class="name">${esc(who.name)}</div>
          <div class="role">${esc(who.role || '')}</div>
        </div>
        <p class="text">${esc(text)}</p>
        ${hint}`;
      el.card.setAttribute('aria-label', `${who.name}：${text}`);
    }
    el.card.classList.toggle('article-card', c.type === 'article');
    el.btnL.querySelector('span').textContent = c.left.label;
    el.btnR.querySelector('span').textContent = c.right.label;

    el.card.style.transition = 'none';
    el.card.style.transform = '';
    el.card.style.opacity = '';
    el.card.dataset.side = '';
    el.card.classList.remove('enter');
    void el.card.offsetWidth;
    el.card.style.transition = '';
    el.card.classList.add('enter');
    S.busy = false;
  }

  function setOffset(dx) {
    el.card.style.transform = `translateX(${dx}px) rotate(${dx / 16}deg)`;
    const side = dx < -SWIPE_PREVIEW ? 'left' : dx > SWIPE_PREVIEW ? 'right' : '';
    if (side !== el.card.dataset.side) {
      el.card.dataset.side = side;
      preview(side);
    }
  }

  async function choose(side) {
    if (S.busy) return;
    S.busy = true;
    preview(null);
    Sound.play('swipe');
    const c = currentCard();
    const opt = c[side];
    el.card.dataset.side = side;
    el.card.classList.remove('dragging');
    el.card.style.transform = `translateX(${side === 'left' ? -150 : 150}%) rotate(${side === 'left' ? -24 : 24}deg)`;
    el.card.style.opacity = '0';
    await wait(260);

    // 記錄
    const tally = `${side}:${c.who}`;
    S.flags[tally] = (S.flags[tally] || 0) + 1;
    for (const [k, n] of Object.entries(opt.flags || {})) S.flags[k] = (S.flags[k] || 0) + n;
    addHours(sharing() ? D.settings.baseHoursShared : D.settings.baseHours);
    addHours(opt.hours);

    const fx = { ...(opt.effects || {}) };
    fx.mood = (fx.mood || 0) - D.settings.fatiguePerCard;
    applyEffects(fx);
    if (opt.reply) showReply(opt.reply);

    if (KEYS.some((k) => S.stats[k] <= 0 || S.stats[k] >= 100)) {
      await wait(900);
      await resolveCrashes();
    }
    S.i++;
    if (!seekCard()) {
      await wait(opt.reply ? 1600 : 700);
      return afterCards();
    }
    showCard();
    maybePush();
  }

  // 推播干擾：有設定 pushes 的章節，偶爾跳出推播蓋住卡片，要先關掉才能繼續滑
  function maybePush() {
    const cfg = chapter().pushes;
    if (!cfg) return;
    const hourly = !!S.flags.hourly; // 被開了「每小時提醒」之後推播更多
    if (S.pushes >= cfg.max + (hourly ? 2 : 0) || Math.random() > cfg.chance * (hourly ? 1.8 : 1)) return;
    S.pushes++;
    S.busy = true;
    const text = D.pushes[Math.floor(Math.random() * D.pushes.length)];
    el.push.innerHTML = `
      <button class="push-body" data-push="open">${flowerSVG()}<span><b>BLOOM・現在</b>${esc(text)}</span></button>
      <button class="push-close" data-push="close" aria-label="關閉推播">✕</button>`;
    el.push.classList.add('show');
    Sound.play('push');
  }
  el.push.addEventListener('click', (e) => {
    const b = e.target.closest('[data-push]');
    if (!b) return;
    if (b.dataset.push === 'open') {
      applyEffects({ bmi: -1, mood: -1 });
      showReply({ who: 'mascot', text: D.pushOpened });
    }
    Sound.play('tap');
    el.push.classList.remove('show');
    S.busy = false;
  });

  function showReply(r) {
    const who = D.characters[r.who];
    el.reply.innerHTML = `<div class="avatar" style="--c:${who.color}">${avatarHTML(who)}</div>
      <div><b>${esc(who.name)}</b>${esc(r.text)}</div>`;
    el.reply.classList.add('show');
    clearTimeout(replyTimer);
    replyTimer = setTimeout(hideReply, 2400);
  }
  function hideReply() { el.reply.classList.remove('show'); }

  // 拖曳
  let drag = null;
  el.card.addEventListener('pointerdown', (e) => {
    if (S.busy) return;
    drag = { x: e.clientX, dx: 0, id: e.pointerId };
    el.card.classList.add('dragging');
    try { el.card.setPointerCapture(e.pointerId); } catch { /* 沒有實體指標時（測試）略過 */ }
  });
  el.card.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x;
    setOffset(drag.dx);
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = drag.dx;
    drag = null;
    el.card.classList.remove('dragging');
    if (Math.abs(dx) >= SWIPE_COMMIT) return choose(dx < 0 ? 'left' : 'right');
    el.card.style.transform = '';
    el.card.dataset.side = '';
    preview(null);
  };
  el.card.addEventListener('pointerup', endDrag);
  el.card.addEventListener('pointercancel', endDrag);

  el.btnL.addEventListener('click', () => choose('left'));
  el.btnR.addEventListener('click', () => choose('right'));
  document.addEventListener('keydown', (e) => {
    if (el.overlay.classList.contains('show')) return;
    if (e.key === 'ArrowLeft') choose('left');
    if (e.key === 'ArrowRight') choose('right');
  });

  // ---------- 全螢幕畫面 ----------
  const actions = {};
  function screen(html, cls = '') {
    el.overlay.className = `overlay show ${cls}`;
    el.overlay.innerHTML = html;
    el.overlay.scrollTop = 0;
    const first = el.overlay.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }
  function hideScreen() {
    el.overlay.className = 'overlay';
    el.overlay.innerHTML = '';
  }
  el.overlay.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b && actions[b.dataset.act]) {
      if (b.dataset.act !== 'flipTheory') Sound.play('tap');
      actions[b.dataset.act](b.dataset);
    }
  });

  actions.splash = () => screen(`
    <div class="splash">${flowerSVG()}</div>
    <div class="title-big">綻放 <b>BLOOM</b></div>
    <div class="slogan">${esc(D.intro.appSlogan)}</div>
    <button class="btn" data-act="register">開始使用</button>
    <button class="btn ghost sound-toggle" data-act="toggleSound">${esc(Sound.on ? D.intro.soundOff : D.intro.soundOn)}</button>
    <p class="content-note">${esc(D.intro.contentNote)}</p>
    <p class="content-note">${esc(D.intro.fictionNote)}</p>
    ${classForm() ? `<p class="content-note">${esc(D.intro.privacyNote)}</p>` : ''}`);

  actions.toggleSound = () => {
    Sound.toggle();
    paintSound();
    Sound.play('good');
    const b = document.querySelector('.sound-toggle');
    if (b) b.textContent = Sound.on ? D.intro.soundOff : D.intro.soundOn;
  };

  actions.register = () => screen(`
    <div class="mini-flower">${flowerSVG()}</div>
    <div class="bubble">${esc(D.intro.greeting)}<strong>${esc(D.intro.ask)}</strong></div>
    <button class="btn" data-act="question">${esc(D.intro.yes)}</button>
    <button class="btn ghost" data-act="notReady">${esc(D.intro.no)}</button>`);

  actions.notReady = () => screen(`
    <div class="mini-flower">${flowerSVG()}</div>
    <div class="bubble">${esc(D.intro.noReply)}</div>
    <button class="btn" data-act="question">好……</button>`);

  // 黑底打字：「誰訂的 180 天？」
  actions.question = () => {
    screen(`<p class="type" id="type"></p>
      <div class="tap-hint" id="tapHint">點一下繼續</div>
      <button class="tap-layer" data-act="chapterTitle" aria-label="繼續"></button>`, 'dark');
    const text = D.intro.question;
    const node = $('#type');
    let n = 0;
    const timer = setInterval(() => {
      if (!node.isConnected) return clearInterval(timer);
      node.textContent = text.slice(0, ++n);
      if (n >= text.length) {
        clearInterval(timer);
        $('#tapHint').classList.add('show');
      }
    }, 160);
  };

  actions.chapterTitle = () => {
    setStage(S.ch);
    const ch = chapter();
    screen(`
      <div class="chapter-no">${esc(ch.no)}</div>
      <div class="chapter-title">${esc(ch.title)}</div>
      <ul class="bg-list">${ch.background.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <button class="btn" data-act="startChapter">開始</button>`);
  };

  actions.startChapter = () => {
    hideScreen();
    S.i = 0;
    S.pushes = 0;
    if (seekCard()) showCard();
    else afterCards();
  };

  // 一章的卡片滑完 → Boss → 章節結束
  async function afterCards() {
    hideReply();
    S.busy = true;
    const bossId = chapter().boss;
    if (bossId && BOSSES[bossId]) {
      const cfg = D.bosses[bossId];
      const result = await BOSSES[bossId](cfg);
      S.last = result.vars;
      S.record[bossId] = result.vars;
      addHours(result.hours);
      applyEffects(result.effects);
      // 結算和第一張理論卡放在同一個畫面（省時間）。精簡版的其他理論卡直接收進圖鑑，完整版再一張一張翻
      const ids = [].concat(cfg.theory || []);
      if (!ids.length) await resultScreen(cfg, result);
      else {
        await theoryScreen(ids[0], full ? [] : ids.slice(1), { cfg, result });
        if (full) for (const id of ids.slice(1)) await theoryScreen(id);
      }
      await resolveCrashes();
    }
    if (S.ch + 1 >= D.chapters.length) return finale(); // 最後一章打完 → 結局
    chapterEnd();
  }

  const fxTextOf = (fx) => KEYS.filter((k) => fx[k])
    .map((k) => (k === 'mood' && moodHidden() ? `${ICON[k]} 🔒` : `${ICON[k]} ${fx[k] > 0 ? '+' : ''}${fx[k]}`))
    .join('　');

  // Boss 結算的內容（單獨一個畫面，或放在理論卡上方）
  const bossResultHTML = (cfg, result, compact) => `
    <div class="chapter-no">${esc(cfg.no)} 結束${compact ? `・${esc(cfg.title)}` : ''}</div>
    ${compact ? '' : `<div class="chapter-title">${esc(cfg.title)}</div>`}
    <p class="end-text${compact ? ' small' : ''}">${esc(result.text)}</p>
    <div class="summary">${fxTextOf(result.effects)}</div>
    ${result.app ? `<div class="app-push">${flowerSVG()}<div><b>BLOOM</b><br>${esc(result.app)}</div></div>` : ''}`;

  function resultScreen(cfg, result) {
    return new Promise((resolve) => {
      actions.resultGoOn = () => resolve();
      screen(`${bossResultHTML(cfg, result, false)}
        <button class="btn" data-act="resultGoOn">繼續</button>`, cfg.theme || 'night');
    });
  }

  // 理論卡正面：三層（概念＋出處／你剛剛經歷的／一句話白話）
  function theoryFrontHTML(t, vars = {}) {
    return `
      <span class="tc-author">${esc(t.author)}</span>
      <span class="tc-concept">${esc(t.concept)}</span>
      <span class="tc-source">${esc(t.source)}</span>
      <span class="tc-quote">${esc(t.quote)}</span>
      <span class="tc-exp"><b>你剛剛經歷的</b>${esc(fill(t.experienced, { ...(t.demo || {}), ...vars }))}</span>
      <span class="tc-plain"><b>一句話</b>${esc(t.plain)}</span>`;
  }

  function theoryScreen(id, also = [], boss = null) {
    const t = D.theories[id];
    for (const x of [id, ...also]) if (!S.theories.includes(x)) S.theories.push(x);
    const alsoHTML = also.length
      ? `<p class="note">也收進圖鑑：${also.map((x) => esc(`${D.theories[x].author}〈${D.theories[x].concept}〉`)).join('、')}</p>`
      : '';
    return new Promise((resolve) => {
      actions.theoryGoOn = () => { hideScreen(); resolve(); };
      actions.flipTheory = () => {
        $('#theoryCard').classList.add('flipped');
        Sound.play('flip');
      };
      screen(`
        ${boss ? bossResultHTML(boss.cfg, boss.result, true) : ''}
        <div class="chapter-no">獲得理論卡</div>
        <button class="theory-card" id="theoryCard" data-act="flipTheory" aria-label="翻開理論卡">
          <span class="tc-face tc-back">${flowerSVG()}<span>點一下翻開</span></span>
          <span class="tc-face tc-front">${theoryFrontHTML(t, S.last)}</span>
        </button>
        ${alsoHTML}
        <button class="btn" data-act="theoryGoOn">收進圖鑑</button>`, boss ? `${boss.cfg.theme || 'night'} scroll` : '');
    });
  }

  const ICON = { mood: '🌙', baby: '👶', family: '💞', bmi: '⚖️' };

  function summaryHTML() {
    const h = S.hours;
    return `<div class="summary">
      <span>⚖️ BMI ${bmiOf(S.stats.bmi).toFixed(1)}</span>
      <span>🌙 ${moodHidden() ? '🔒' : S.stats.mood}</span><span>👶 ${S.stats.baby}</span><span>💞 ${S.stats.family}</span>
    </div>
    <div class="summary small">
      <span>照顧時數：你 ${Math.round(h.me)} 小時・伴侶 ${Math.round(h.partner)} 小時・婆婆 ${Math.round(h.mil)} 小時</span>
      <span>崩潰 ${S.crashes.length} 次</span>
    </div>`;
  }

  function chapterEnd() {
    hideReply();
    S.busy = true;
    const ch = chapter();
    const hasNext = S.ch + 1 < D.chapters.length;
    const sent = !hasNext && finishGame();
    screen(`
      <div class="chapter-no">${esc(ch.no)} 完成</div>
      <div class="chapter-title">撐過了${esc(ch.title.split('・').pop())}</div>
      ${summaryHTML()}
      ${hasNext
        ? '<button class="btn" data-act="nextChapter">下一章</button>'
        : `<p class="note">${esc(D.settings.comingSoon)}</p>
           ${sent ? `<p class="note">${esc(D.intro.sentNote)}</p>` : ''}
           <button class="btn" data-act="restart">重新開始</button>`}
      ${backToMenu()}`);
  }

  actions.nextChapter = () => {
    S.ch++;
    actions.chapterTitle();
  };

  actions.restart = () => {
    resetGame(0);
    actions.chapterTitle();
  };

  // ---------- 結局：App 當機 → 後台 → 結局 → 重寫 App → 結局分享卡 ----------
  function pickEnding() {
    const f = S.flags;
    if (f.talk && (sharing() || f.shareLeave) && (f['left:mascot'] || 0) >= D.finale.hiddenRefuse) return 'hidden';
    if (bmiOf(S.stats.bmi) <= D.settings.bmiGoal) return 'reach';
    if (S.crashes.length >= D.finale.crashThreshold) return 'crash';
    return 'fail';
  }

  const metricLabel = (id) => D.rewrite.metrics.find((m) => m.id === id)?.label || '';

  // 結局各畫面裡可以用的變數
  function finaleVars() {
    const r = S.record;
    return {
      bmi: bmiOf(S.stats.bmi).toFixed(1),
      gap: Math.max(0, bmiOf(S.stats.bmi) - D.settings.bmiGoal).toFixed(1),
      mood: S.stats.mood,
      crashes: S.crashes.length,
      hoursMe: Math.round(S.hours.me),
      hoursPartner: Math.round(S.hours.partner),
      money: r.whack?.money ?? '0',
      sleep: r.tetris?.sleep ?? 0,
      help: r.whack?.help ?? 0,
      covered: r.gaze?.covered ?? 0,
      refused: S.flags['left:mascot'] || 0,
      metrics: S.metrics.map(metricLabel).join('、'),
    };
  }

  // 顯示一個畫面，按下 data-act="finaleNext" 的按鈕就往下走
  function step(html, cls) {
    return new Promise((resolve) => {
      actions.finaleNext = () => resolve();
      screen(html, cls);
    });
  }

  const sceneHTML = (lines) => lines.map((s) => {
    const who = D.characters[s.who];
    return `<div class="scene-line"><div class="avatar" style="--c:${who.color}">${avatarHTML(who)}</div>
      <div><b>${esc(who.name)}</b>${esc(s.text)}</div></div>`;
  }).join('');

  async function finale(forced) {
    hideReply();
    S.busy = true;
    const myRun = runId;
    const alive = () => myRun === runId; // 報告者跳去別的地方就停
    const id = forced || pickEnding();
    const e = D.endings[id];
    S.ending = id;
    S.day = D.settings.totalDays;
    el.day.textContent = `產後第 ${S.day} 天`;

    // 1. App 當機
    setStage(4);
    Sound.play('glitch');
    const c = D.finale.crash;
    await step(`
      <div class="glitch-flower">${flowerSVG()}</div>
      <div class="end-title glitch">${esc(c.title)}</div>
      <p class="end-text">${esc(c.text)}</p>
      <div class="crash-btns">${c.buttons.map((b) => `<button class="btn ghost" data-act="finaleNext">${esc(b)}</button>`).join('')}</div>`,
    'dark crashed');
    if (!alive()) return;

    // 2. 後台
    const b = D.finale.backend;
    const vars = finaleVars();
    await step(`
      <div class="term">
        <div class="term-title">${esc(b.title)}</div>
        ${b.lines.map((l, i) => `<p class="term-line" style="animation-delay:${(0.3 + i * 0.45).toFixed(2)}s">&gt; ${esc(fill(l, vars))}</p>`).join('')}
        <p class="term-note" style="animation-delay:${(0.3 + b.lines.length * 0.45).toFixed(2)}s">${esc(b.note)}</p>
      </div>
      <button class="btn term-btn" data-act="finaleNext">${esc(b.button)}</button>`, 'terminal scroll');
    if (!alive()) return;

    // 3. 結局（達標、隱藏結局時精神條解鎖）
    if (id === 'reach' || id === 'hidden') { S.flags.hideMood = 0; renderStats(); }
    const ev = finaleVars();
    await step(`
      <div class="chapter-no">${esc(e.label)}</div>
      <div class="end-title">${esc(fill(e.title, ev))}</div>
      <p class="end-text">${esc(fill(e.text, ev))}</p>
      ${e.scene ? sceneHTML(e.scene) : ''}
      ${e.screening ? `<div class="screening"><b>${esc(e.screening.title)}</b><p>${esc(e.screening.text)}</p>
        <p class="help-line">${esc(e.screening.help)}</p></div>` : ''}
      <div class="app-push">${flowerSVG()}<div><b>BLOOM</b><br>${esc(e.app)}</div></div>
      <button class="btn" data-act="finaleNext">繼續</button>`, `ending ending-${id} scroll`);
    if (!alive()) return;
    if (e.theory) await theoryScreen(e.theory);
    if (!alive()) return;

    // 4. 重寫 App（每個人都會玩到：我們的觀點）
    S.metrics = await rewritePick();
    if (!alive()) return;
    S.flags.hideMood = 0;
    const R = D.rewrite;
    // 過場：App 被重寫了，畫面恢復正常（粉色回來、掃描線消失、小綻的笑容回來）
    hideScreen();
    setStage(0);
    renderStats();
    Sound.play('good');
    el.push.innerHTML = `<div class="push-body restored">${flowerSVG(0)}<span><b>BLOOM 2.0</b>${esc(R.restored.text)}</span></div>`;
    el.push.classList.add('show');
    await wait(2200);
    if (!alive()) return;
    el.push.classList.remove('show');
    const nv = finaleVars();
    await step(`
      <div class="chapter-no">BLOOM 2.0</div>
      <div class="chapter-title">你設計的新指標</div>
      <div class="v2-cards">${S.metrics.map((mid) => {
        const m = R.metrics.find((x) => x.id === mid);
        return `<div class="v2-card"><div class="v2-head"><span>${m.icon}</span><b>${esc(m.label)}</b></div>
          <p>${esc(fill(m.value, nv))}</p><small>${esc(m.basis)}</small></div>`;
      }).join('')}</div>
      <div class="viewpoint"><b>${esc(R.viewpointTitle)}</b>${R.viewpoint.map((v) => `<p>${esc(v)}</p>`).join('')}
        <blockquote>${esc(R.quote)}<cite>${esc(R.quoteSource)}</cite></blockquote></div>
      ${R.theory && !full ? `<p class="note">也收進圖鑑：${esc(`${D.theories[R.theory].author}〈${D.theories[R.theory].concept}〉`)}</p>` : ''}
      <button class="btn" data-act="finaleNext">繼續</button>`, 'scroll');
    if (!alive()) return;
    // 精簡版直接收進圖鑑（引文已經在上面的觀點裡）；完整版再翻一張
    S.last = nv;
    if (R.theory && !S.theories.includes(R.theory)) S.theories.push(R.theory);
    if (R.theory && full) await theoryScreen(R.theory);
    if (!alive()) return;

    // 5. 結局分享卡（全班數據在這裡送出，才包含新指標）
    const sent = finishGame();
    shareScreen(sent);
  }

  // 重寫 App：選 3 個新指標
  function rewritePick() {
    const R = D.rewrite;
    const picked = [];
    return new Promise((resolve) => {
      actions.pickMetric = (ds) => {
        const i = picked.indexOf(ds.id);
        if (i >= 0) picked.splice(i, 1);
        else if (picked.length < R.pick) picked.push(ds.id);
        document.querySelectorAll('.metric').forEach((m) => {
          const on = picked.includes(m.dataset.id);
          m.classList.toggle('on', on);
          m.setAttribute('aria-pressed', on);
        });
        $('#pickCount').textContent = `已選 ${picked.length}／${R.pick}`;
        $('#publishBtn').disabled = picked.length !== R.pick;
      };
      actions.publishRewrite = () => { if (picked.length === R.pick) resolve([...picked]); };
      screen(`
        <div class="chapter-no">${esc(R.title)}</div>
        <div class="old-metrics"><span>${esc(R.oldLabel)}</span>${R.old.map((o) => `<s>${esc(o)}</s>`).join('')}</div>
        <div class="chapter-title small">${esc(R.ask)}</div>
        <div class="metric-grid">${R.metrics.map((m) => `
          <button class="metric" data-act="pickMetric" data-id="${m.id}" aria-pressed="false"><span>${m.icon}</span>${esc(m.label)}</button>`).join('')}
        </div>
        <p class="note" id="pickCount">已選 0／${R.pick}</p>
        <button class="btn" id="publishBtn" data-act="publishRewrite" disabled>${esc(R.done)}</button>`, 'scroll');
    });
  }

  function pickTitle() {
    const ratio = S.hours.partner ? S.hours.me / S.hours.partner : (S.hours.me ? Infinity : 0);
    const ok = (w) => (!w.ending || w.ending === S.ending)
      && (!w.crashes || S.crashes.length >= w.crashes)
      && (!w.hoursRatio || ratio >= w.hoursRatio)
      && Object.entries(w.flags || {}).every(([k, n]) => (S.flags[k] || 0) >= n);
    return D.titles.find((t) => ok(t.when)) || D.titles[D.titles.length - 1];
  }

  let lastSent = false;
  function shareScreen(sent = lastSent) {
    lastSent = sent;
    const v = finaleVars();
    const t = pickTitle();
    const accepted = Object.entries(S.flags).filter(([k]) => k.startsWith('right:')).reduce((s, [, n]) => s + n, 0);
    const rows = [
      `答應了 ${accepted} 個要求（${S.flags['right:mascot'] || 0} 個來自 App）`,
      `照顧時數：你 ${v.hoursMe} 小時・伴侶 ${v.hoursPartner} 小時`,
      `崩潰 ${v.crashes} 次`,
      S.record.whack ? `被扣款 NT$${v.money}` : '',
      S.record.gaze ? `擋掉 ${v.covered} 道視線` : '',
      v.metrics ? `新指標：${v.metrics}` : '',
    ].filter(Boolean);
    screen(`
      <div class="share-card">
        <div class="share-top">${flowerSVG()}<span>${esc(D.share.heading)}</span><em>${esc(D.endings[S.ending].label)}</em></div>
        <div class="share-title">${esc(t.title)}</div>
        <p class="share-desc">${esc(t.desc)}</p>
        <ul class="share-stats">${rows.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      </div>
      <p class="note">${esc(D.share.note)}</p>
      ${sent ? `<p class="note">${esc(D.intro.sentNote)}</p>` : ''}
      <button class="btn" data-act="deck">${esc(D.share.deck)}</button>
      <button class="btn ghost" data-act="restart">${esc(D.share.again)}</button>
      ${backToMenu()}`, 'scroll');
  }
  actions.shareBack = () => shareScreen();

  // 報告者示範結局用：沒有實際玩，也給一組像樣的數字
  function seedDemo(id) {
    resetGame(D.chapters.length - 1);
    S.demo = true;
    S.day = 180;
    S.hours = { me: 128, partner: 22, mil: 14 };
    S.flags = { hideMood: 1, 'right:mascot': 6, 'right:mil': 2, 'left:mascot': 7, talk: 1, negotiate: 1 };
    S.record = { tetris: { sleep: 3 }, whack: { money: '8,960', help: 1 }, gaze: { covered: 7 } };
    S.crashes = Array.from({ length: id === 'crash' ? 3 : 1 }, () => ({ stat: 'mood', side: 'low', day: 0 }));
    S.stats = { mood: 12, baby: 48, family: 52, bmi: id === 'reach' ? 40 : 58 };
    S.theories = Object.keys(D.theories).filter((t) => t !== 'uenoMaterial');
    renderStats();
  }
  actions.menuFinale = (ds) => { seedDemo(ds.e); finale(ds.e); };

  // ---------- 報告者模式（網址加 ?menu） ----------
  const QR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  const backToMenu = () => (presenter ? '<button class="btn ghost" data-act="menu">回報告者選單</button>' : '');

  actions.menu = () => {
    runId++; // 停掉還在跑的 Boss
    hideReply();
    S.busy = true;
    screen(`
      <div class="chapter-no">報告者模式</div>
      <div class="chapter-title">要跳到哪裡？</div>
      <div class="menu">
        <button data-act="menuIntro">開場：「誰訂的 180 天？」</button>
        ${D.chapters.map((ch, n) => `
          <button data-act="menuChapter" data-n="${n}">${esc(ch.no)}・${esc(ch.title)}</button>
          ${ch.boss ? `<button class="sub" data-act="menuBoss" data-n="${n}">Boss：${esc(D.bosses[ch.boss].title)}</button>` : ''}`).join('')}
        <div class="menu-label">結局示範（App 當機 → 後台 → 結局 → 重寫 App）</div>
        ${['hidden', 'reach', 'crash', 'fail'].map((e) => `
          <button class="sub" data-act="menuFinale" data-e="${e}">${esc(D.endings[e].label)}：${esc(D.endings[e].title.replace('{crashes}', '3'))}</button>`).join('')}
        <button data-act="deck">理論卡圖鑑（文獻討論）</button>
        <button data-act="results">全班結果（即時）</button>
        <button data-act="share">分享給同學（QR code）</button>
      </div>
      <p class="note">遊戲中隨時可以按左上角「報告者選單」或鍵盤 M 回到這裡。</p>`);
  };
  actions.menuIntro = () => { resetGame(0); actions.splash(); };
  actions.menuChapter = (ds) => { resetGame(+ds.n); actions.chapterTitle(); };
  actions.menuBoss = (ds) => { resetGame(+ds.n); afterCards(); };

  // 理論卡圖鑑：報告時直接投影當文獻討論。玩家玩完後只看得到自己收集到的卡
  actions.deck = () => {
    const list = Object.entries(D.theories);
    const mine = !presenter && S.theories.length > 0;
    const have = (id) => !mine || S.theories.includes(id);
    // 依作者分組，順序照作者第一次出現
    const groups = [];
    for (const [id, t] of list) {
      let g = groups.find((x) => x.author === t.author);
      if (!g) groups.push((g = { author: t.author, cards: [] }));
      g.cards.push([id, t]);
    }
    const cardHTML = ([id, t]) => (have(id) ? `
        <button class="deck-card" data-act="theoryDetail" data-id="${esc(id)}">
          <span class="deck-concept">${esc(t.concept)}</span>
          <span class="tc-source">${esc(t.source)}</span>
        </button>` : `
        <div class="deck-card locked" aria-label="還沒收集的理論卡">
          <span class="deck-concept">還沒收集</span>
        </div>`);
    screen(`
      <div class="chapter-no">理論卡圖鑑</div>
      <div class="chapter-title">文獻討論</div>
      ${groups.map((g) => `
        <div class="deck-group">
          <div class="deck-author">${esc(g.author)}<span>${g.cards.filter(([id]) => have(id)).length}／${g.cards.length} 張</span></div>
          <div class="deck">${g.cards.map(cardHTML).join('')}</div>
        </div>`).join('')}
      <p class="note">${mine ? `你收集了 ${S.theories.length}／${list.length} 張。` : `一共 ${list.length} 張。每打完一個 Boss 會拿到一張。`}</p>
      ${presenter ? backToMenu()
        : S.ending ? '<button class="btn" data-act="shareBack">回到我的結局</button>'
        : '<button class="btn" data-act="splash">開始遊戲</button>'}`, 'scroll');
  };
  actions.theoryDetail = (ds) => {
    screen(`
      <div class="chapter-no">理論卡</div>
      <div class="theory-static">${theoryFrontHTML(D.theories[ds.id])}</div>
      <button class="btn" data-act="deck">回圖鑑</button>`);
  };

  // QR code：網址自動用目前的網站，發布到網路後就是正式網址
  actions.share = async () => {
    const url = location.origin + location.pathname;
    const local = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
    screen(`
      <div class="chapter-no">分享給同學</div>
      <div class="chapter-title">掃 QR code 一起玩</div>
      <div class="qr" id="qr" role="img" aria-label="遊戲網址的 QR code"></div>
      <p class="share-url">${esc(url)}</p>
      ${local ? '<p class="note">現在是本機網址，同學連不到。發布到網路之後，這裡會自動換成正式網址。</p>' : ''}
      ${backToMenu()}`);
    try {
      if (!window.QRCode) await loadScript(QR_LIB);
      const box = $('#qr');
      if (box) new window.QRCode(box, { text: url, width: 240, height: 240, correctLevel: window.QRCode.CorrectLevel.M });
    } catch {
      const box = $('#qr');
      if (box) box.textContent = 'QR code 載入失敗，請直接分享上面的網址。';
    }
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function addPresenterButton() {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'presenter-btn';
    b.textContent = '☰ 報告者選單';
    b.addEventListener('click', () => actions.menu());
    document.body.appendChild(b);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') actions.menu();
    });
  }

  // ---------- Boss 小遊戲 ----------
  // 每個 Boss 是一個 async 函式，回傳 { effects, hours, text, vars }
  const BOSSES = {};

  // Boss 開始前的說明畫面：一句情境＋「怎麼玩」步驟，按「開始」才跑 run
  function bossIntro(cfg, run, { no = cfg.no, time = '' } = {}) {
    actions.bossStart = () => run();
    screen(`
      <div class="chapter-no">${esc(no)}</div>
      <div class="chapter-title">${esc(cfg.title)}</div>
      ${cfg.intro ? `<p class="boss-intro">${esc(cfg.intro)}</p>` : ''}
      <div class="howto">
        <div class="howto-head"><b>怎麼玩</b>${time ? `<span>⏱ ${esc(time)}</span>` : ''}</div>
        <ol>${cfg.howto.map((s) => `<li><span class="howto-icon" aria-hidden="true">${esc(s.icon)}</span><span>${esc(s.text)}</span></li>`).join('')}</ol>
      </div>
      <button class="btn" data-act="bossStart">開始</button>`, cfg.theme);
  }

  // 夜奶節奏戰：寶寶一哭就點，睡眠條往下掉（上野：無償勞動沒有下班時間）
  BOSSES.nightFeed = (cfg) => new Promise((resolve) => {
    bossIntro(cfg, () => run(), { time: `約 ${cfg.seconds} 秒` });

    function run() {
      const DURATION = (cfg.seconds || 30) * 1000; // 整段時間＝晚上 11 點到早上 6 點
      const CRY = 1800;        // 每次哭多久
      const PERFECT = 550;     // 最後這段時間點下去算完美
      const partnerOn = sharing();
      const myRun = runId;

      // 星空：固定亂數，每次一樣
      let seed = 11;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const stars = Array.from({ length: 40 }, () => `<i style="left:${(rnd() * 100).toFixed(1)}%;top:${(rnd() * 55).toFixed(1)}%;--d:${(1.5 + rnd() * 3).toFixed(1)}s;--s:${(1 + rnd() * 2).toFixed(1)}px"></i>`).join('');
      screen(`
        <div class="nf">
          <div class="nf-sky">${stars}<span class="nf-moon" id="nfMoon">🌙</span></div>
          <div class="nf-top"><span class="nf-clock" id="nfClock">23:00</span><span>${esc(cfg.title)}</span></div>
          <div class="nf-night"><span>23:00</span><div class="bar"><i id="nfNight"></i></div><span>06:00</span></div>
          <div class="nf-sleep"><span>💤 睡眠</span><div class="bar"><i id="nfSleep"></i></div></div>
          <div class="nf-room">
            <div class="nf-crib">
              <button class="nf-baby" id="nfBaby" aria-label="安撫寶寶">
                <span class="nf-ring" id="nfRing"></span><span class="nf-face" id="nfFace">😴</span>
              </button>
              <div class="nf-crib-rail"></div>
            </div>
            <div class="nf-msg" id="nfMsg" aria-live="polite"></div>
          </div>
          <div class="nf-partner ${partnerOn ? 'near' : 'away'}" id="nfPartner"><b>🚪</b><span>🧑 ${esc(partnerOn ? cfg.partnerNear : cfg.partnerAway)} 💤</span></div>
          <div class="nf-push" id="nfPush">${esc(cfg.appPush)}</div>
        </div>`, 'night boss');

      const baby = $('#nfBaby'), ring = $('#nfRing'), face = $('#nfFace'), msg = $('#nfMsg');
      const sleepBar = $('#nfSleep'), clock = $('#nfClock'), push = $('#nfPush'), partner = $('#nfPartner');
      const nightBar = $('#nfNight'), moon = $('#nfMoon');

      // 排好哭的時間
      const cries = [];
      for (let t = 1400; t < DURATION - CRY; t += 2300 + Math.random() * 1300) cries.push({ t, done: false });

      let sleep = 100, me = 0, partnerN = 0, perfect = 0, missed = 0, streak = 0;
      let active = null;
      let pushShown = false;
      const t0 = performance.now();
      let last = t0;

      const say = (s) => { msg.textContent = s; msg.classList.remove('pop'); void msg.offsetWidth; msg.classList.add('pop'); };
      const hourAt = (ms) => 23 + 7 * ms / DURATION;
      const fmt = (h) => { const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };

      baby.addEventListener('pointerdown', () => {
        if (!active || active.by) return;
        const elapsed = performance.now() - t0 - active.t;
        const isPerfect = CRY - elapsed <= PERFECT;
        active.by = 'me';
        me++;
        if (isPerfect) { perfect++; streak++; } else streak = 0;
        sleep -= isPerfect ? 7 : 12;
        face.textContent = '🍼';
        Sound.play(isPerfect ? 'good' : 'tap');
        say(isPerfect ? (streak >= 2 ? `完美安撫 ×${streak}！` : '完美安撫！') : '安撫中……');
      });

      function tick(now) {
        if (myRun !== runId) return; // 已經重新開始或跳去別章
        const t = now - t0;
        const dt = now - last;
        last = now;
        clock.textContent = fmt(hourAt(Math.min(t, DURATION)));
        const night = Math.min(1, t / DURATION);
        nightBar.style.width = `${night * 100}%`;
        moon.style.left = `${8 + night * 84}%`;

        // 開始哭
        const next = cries.find((c) => !c.started && t >= c.t && t < c.t + CRY);
        if (next && !active) {
          next.started = true;
          active = next;
          const h = hourAt(next.t) % 24; // 用排定的時間，不用現在時間，畫面卡頓也不會算錯
          if (partnerOn && h >= 1.5 && h < 2.75) {
            active.by = 'partner';
            partnerN++;
            face.textContent = '🍼';
            partner.querySelector('span').textContent = `🧑 ${cfg.partnerLine}`;
            partner.classList.add('up');
            say('伴侶起來了');
          } else {
            face.textContent = '😭';
            baby.classList.add('crying');
            Sound.play('cry');
          }
        }

        // 畫面卡頓（切到背景、螢幕暗掉）時，已經過去的哭聲直接算沒接到
        if (!active) {
          for (const c of cries) {
            if (!c.started && t >= c.t + CRY) { c.started = c.done = true; missed++; streak = 0; sleep -= 6; }
          }
        }

        if (active) {
          const p = clamp((t - active.t) / CRY, 0, 1);
          ring.style.transform = `scale(${2.2 - 1.2 * p})`;
          ring.style.opacity = active.by ? 0 : 1;
          if (p >= 1) {
            if (!active.by) {
              missed++; streak = 0;
              sleep -= 6;
              say('寶寶哭得更大聲了');
            }
            active.done = true;
            active = null;
            baby.classList.remove('crying');
            face.textContent = '😴';
            ring.style.opacity = 0;
            if (partnerOn) { partner.querySelector('span').textContent = `🧑 ${cfg.partnerNear} 💤`; partner.classList.remove('up'); }
          }
        } else {
          sleep += dt * 0.0022; // 沒人哭的時候慢慢睡回來一點
        }
        sleep = clamp(sleep, 0, 100);
        sleepBar.style.width = sleep + '%';

        // 凌晨三點的推播
        if (!pushShown && hourAt(t) >= 27) { pushShown = true; push.classList.add('show'); setTimeout(() => push.classList.remove('show'), 2600); }

        if (t < DURATION) requestAnimationFrame(tick);
        else finish();
      }
      requestAnimationFrame(tick);

      function finish() {
        const sleepPct = Math.round(sleep);
        const effects = {
          mood: clamp(Math.round((sleepPct - 50) / 4), -12, 4),
          baby: clamp(me + partnerN - missed * 4, -12, 8),
        };
        const vars = { me, partner: partnerN, sleep: sleepPct, perfect, missed };
        vars.partnerPart = partnerN ? fill(cfg.resultPartner, vars) : '';
        resolve({
          effects,
          hours: { me: me * 0.5, partner: partnerN * 0.5 },
          text: fill(cfg.result, vars),
          vars,
        });
      }
    }
  });

  // 24 小時俄羅斯方塊：照顧的方塊塞滿一天，運動怎麼轉都塞不進去（上野：第二次妥協）
  BOSSES.tetris = (cfg) => new Promise((resolve) => {
    bossIntro(cfg, () => run(), { time: `每個方塊 ${cfg.pieceSeconds} 秒` });

    function run() {
      const myRun = runId;
      const { cols, rows, kinds } = cfg;
      const shared = sharing();
      const isPartner = (i) => shared && cfg.partnerCells.includes(i);
      const board = Array(cols * rows).fill(null); // null 或 'feed' / 'care' / 'sleep' / 'exercise'
      for (const i of cfg.feedCells) board[i] = isPartner(i) ? null : 'feed';
      const queue = cfg.pieces.map((p) => ({ ...p, shape: p.shape.map((r) => [...r]) }));
      const PIECE_MS = cfg.pieceSeconds * 1000;
      let cur = null, curStart = 0, idx = -1, done = false;
      let overflow = 0, exercised = false;

      screen(`
        <div class="tt">
          <div class="tt-top"><b>${esc(cfg.title)}</b><span id="ttCount"></span></div>
          <div class="tt-board" id="ttBoard" style="--cols:${cols}">
            ${board.map((_, i) => `<button class="tt-cell" data-i="${i}" aria-label="第 ${i + 1} 格"></button>`).join('')}
          </div>
          <div class="tt-legend">
            ${Object.entries(kinds).map(([k, v]) => `<span class="tk-${k}">${v.icon} ${esc(v.name)}</span>`).join('')}
            ${shared ? `<span class="tk-partner">🧑 ${esc(cfg.partnerName)}</span>` : ''}
          </div>
          <div class="tt-tray" id="ttTray">
            <div id="ttPiece"></div>
            <div class="tt-info"><b id="ttLabel"></b><span id="ttSub"></span><div class="bar tt-timer"><i id="ttTimer"></i></div></div>
            <div class="tt-btns">
              <button class="tt-btn" id="ttRotate" aria-label="旋轉方塊">⟳</button>
              <button class="tt-btn ghost" id="ttSkip">略過</button>
            </div>
          </div>
          <div class="tt-msg" id="ttMsg" aria-live="polite"></div>
        </div>`, 'day boss');

      const cells = [...document.querySelectorAll('.tt-cell')];
      const tray = $('#ttTray'), timerBar = $('#ttTimer'), msg = $('#ttMsg'), skipBtn = $('#ttSkip');

      const say = (s) => { msg.textContent = s; msg.classList.remove('pop'); void msg.offsetWidth; msg.classList.add('pop'); };
      const rot = (s) => s[0].map((_, c) => s.map((row) => row[c]).reverse()); // 順時針轉 90 度
      // 點下去的格子＝方塊左上第一個方格
      const anchorOf = (s) => {
        for (let r = 0; r < s.length; r++) for (let c = 0; c < s[0].length; c++) if (s[r][c]) return [r, c];
        return [0, 0];
      };

      // 把方塊放在第 i 格會佔哪些格子；超出邊界或撞到就回傳 null
      function cellsFor(s, i) {
        const [ar, ac] = anchorOf(s);
        const r0 = Math.floor(i / cols) - ar, c0 = (i % cols) - ac;
        const out = [];
        for (let r = 0; r < s.length; r++) {
          for (let c = 0; c < s[0].length; c++) {
            if (!s[r][c]) continue;
            const rr = r0 + r, cc = c0 + c;
            if (rr < 0 || rr >= rows || cc < 0 || cc >= cols || board[rr * cols + cc]) return null;
            out.push(rr * cols + cc);
          }
        }
        return out;
      }

      // 時間到：照顧的事自動找第一個放得下的位置（四個方向都試）
      function autoFit(s) {
        for (let t = 0; t < 4; t++, s = rot(s)) {
          for (let i = 0; i < board.length; i++) {
            const list = cellsFor(s, i);
            if (list) return list;
          }
        }
        return null;
      }

      function draw(fresh = []) {
        cells.forEach((node, i) => {
          const k = board[i] || (isPartner(i) ? 'partner' : '');
          node.className = `tt-cell${k ? ` tk-${k}` : ''}${fresh.includes(i) ? ' pop' : ''}`;
          node.textContent = board[i] ? kinds[board[i]].icon : (isPartner(i) ? '🧑' : '');
        });
        $('#ttCount').textContent = `空格 ${board.filter((k) => !k).length}／${board.length}`;
      }

      function place(list, kind) {
        for (const i of list) board[i] = kind;
        draw(list);
      }

      function showPiece() {
        tray.classList.remove('drop');
        void tray.offsetWidth;
        tray.classList.add('drop');
        const s = cur.shape;
        $('#ttPiece').innerHTML = `<div class="tt-mini" style="--w:${s[0].length}">${s.flat().map((v) => `<i class="${v ? `tk-${cur.kind}` : ''}"></i>`).join('')}</div>`;
        $('#ttLabel').textContent = `${kinds[cur.kind].icon} ${cur.label}`;
        $('#ttSub').textContent = cur.sub || (cur.optional ? '可以略過' : '一定要做');
        skipBtn.hidden = !cur.optional;
      }

      function next() {
        if (myRun !== runId) return;
        idx++;
        if (idx >= queue.length) return finish();
        cur = queue[idx];
        curStart = performance.now();
        showPiece();
      }

      function settle(text) {
        cur = null;
        if (text) say(text);
        setTimeout(next, 350);
      }

      $('#ttBoard').addEventListener('click', (e) => {
        const b = e.target.closest('.tt-cell');
        if (!b || !cur) return;
        const list = cellsFor(cur.shape, +b.dataset.i);
        if (!list) {
          b.classList.remove('bad');
          void b.offsetWidth;
          b.classList.add('bad');
          Sound.play('bad');
          return say(cur.kind === 'exercise' ? cfg.noFit : '這裡放不下');
        }
        const kind = cur.kind;
        place(list, kind);
        Sound.play(kind === 'care' ? 'tap' : 'good');
        if (kind === 'exercise') exercised = true;
        settle(cfg.placed[kind] || '');
      });
      $('#ttRotate').addEventListener('click', () => {
        if (!cur) return;
        cur.shape = rot(cur.shape);
        showPiece();
      });
      skipBtn.addEventListener('click', () => {
        if (cur && cur.optional) settle(cur.kind === 'sleep' ? cfg.sleepMiss : cfg.exerciseMiss);
      });

      function timeout() {
        const p = cur;
        if (p.kind !== 'care') return settle(p.kind === 'sleep' ? cfg.sleepMiss : cfg.exerciseMiss);
        const list = autoFit(p.shape);
        if (list) {
          place(list, 'care');
          return settle(`${p.label}：時間到，自動塞進去了`);
        }
        overflow++;
        Sound.play('bad');
        settle(`${p.label}：塞不下，變成「做不完」`);
      }

      function tick(now) {
        if (myRun !== runId || done) return;
        if (cur) {
          const p = (now - curStart) / PIECE_MS;
          timerBar.style.width = `${Math.max(0, 1 - p) * 100}%`;
          if (p >= 1) timeout();
        }
        requestAnimationFrame(tick);
      }

      function finish() {
        done = true;
        const care = board.filter((k) => k === 'feed' || k === 'care').length;
        const sleep = board.filter((k) => k === 'sleep').length;
        const partnerN = shared ? cfg.partnerCells.length : 0;
        say(cfg.dayOver);
        const vars = {
          care, sleep, overflow, partner: partnerN,
          partnerTxt: partnerN ? fill(cfg.partnerYes, { partner: partnerN }) : cfg.partnerNo,
        };
        vars.exPart = exercised ? cfg.resultExercise : cfg.resultNoExercise;
        vars.overPart = overflow ? fill(cfg.resultOverflow, vars) : '';
        setTimeout(() => {
          if (myRun !== runId) return;
          resolve({
            effects: {
              mood: clamp((sleep ? 4 : -8) - overflow * 3 - (exercised ? 2 : 0), -14, 6),
              baby: -3 * overflow,
              bmi: exercised ? -3 : 1,
            },
            hours: { me: care, partner: partnerN },
            text: fill(cfg.result, vars),
            vars,
            app: exercised ? cfg.appYes : cfg.appNo,
          });
        }, 1500); // 讓玩家看一下自己塞滿的一天
      }

      draw();
      next();
      requestAnimationFrame(tick);
    }
  });

  // 聚餐視線閃躲：視線一亮就選一種方式擋，擋越多呼吸越少（高夫曼：可見性、掩飾）
  BOSSES.gaze = (cfg) => new Promise((resolve) => {
    const scene = S.flags.backToWork ? cfg.work : cfg.family;
    bossIntro(cfg, () => run(), { no: `${cfg.no}・${scene.title}`, time: `約 ${cfg.seconds} 秒` });

    function run() {
      const myRun = runId;
      const DURATION = cfg.seconds * 1000, WINDOW = cfg.window;
      screen(`
        <div class="gz">
          <div class="gz-top"><b>${esc(scene.title)}</b><span id="gzTime"></span></div>
          <div class="gz-breath"><span>😮‍💨 呼吸</span><div class="bar"><i id="gzBreath"></i></div></div>
          <div class="gz-table">
            <div class="gz-guests">${scene.guests.map((g) => `
              <div class="gz-guest"><span class="gz-say"></span><span class="gz-face">${g}</span><span class="gz-beam"></span></div>`).join('')}
            </div>
            <div class="gz-cloth" aria-hidden="true">
              <div class="gz-dishes"><span>🍲</span><span>🥟</span><span>🍗</span><span>🥗</span><span>🍚</span></div>
              <div class="gz-plates"><span></span><span></span><span></span><span></span></div>
            </div>
            <div class="gz-me" id="gzMe">🙂</div>
          </div>
          <div class="gz-msg" id="gzMsg" aria-live="polite"></div>
          <div class="gz-covers">${cfg.covers.map((c, i) => `
            <button class="gz-btn" data-c="${i}">${c.icon}<span>${esc(c.label)}</span></button>`).join('')}
          </div>
        </div>`, 'dusk boss');

      const guests = [...document.querySelectorAll('.gz-guest')];
      const me = $('#gzMe'), msg = $('#gzMsg'), breathBar = $('#gzBreath'), timeEl = $('#gzTime');
      const btns = [...document.querySelectorAll('.gz-btn')];

      // 排好每一次視線：誰看、說什麼
      const events = [];
      let ci = 0;
      for (let t = 900; t < DURATION - WINDOW; t += 2000 + Math.random() * 900) {
        events.push({ t, g: Math.floor(Math.random() * guests.length), say: scene.comments[ci++ % scene.comments.length] });
      }

      let breath = 100, covered = 0, seen = 0, active = null, done = false;
      const t0 = performance.now();
      const say = (s) => { msg.textContent = s; msg.classList.remove('pop'); void msg.offsetWidth; msg.classList.add('pop'); };

      btns.forEach((b) => b.addEventListener('click', () => {
        if (!active || active.by || breath <= 0) return;
        const c = cfg.covers[+b.dataset.c];
        active.by = c;
        covered++;
        breath = Math.max(0, breath - c.cost);
        me.textContent = c.icon;
        guests[active.g].classList.add('blocked');
        Sound.play('tap');
        say(`${c.label}，${cfg.blocked}`);
        if (breath <= 0) {
          btns.forEach((x) => { x.disabled = true; });
          say(cfg.breathOut);
        }
      }));

      function endEvent(ev) {
        const g = guests[ev.g];
        if (!ev.by) {
          seen++;
          me.textContent = '😣';
          Sound.play('bad');
          say(`${cfg.seenMsg}：「${ev.say}」`);
        }
        setTimeout(() => {
          g.classList.remove('gazing', 'blocked');
          g.querySelector('.gz-say').textContent = '';
          if (!active) me.textContent = '🙂';
        }, 600);
        active = null;
      }

      function tick(now) {
        if (myRun !== runId || done) return;
        const t = now - t0;
        timeEl.textContent = `${Math.max(0, Math.ceil((DURATION - t) / 1000))} 秒`;
        breathBar.style.width = `${breath}%`;

        if (active && t >= active.t + WINDOW) endEvent(active);
        // 畫面卡頓時，已經過去的視線直接算被看見
        for (const ev of events) {
          if (!ev.started && t >= ev.t + WINDOW) { ev.started = true; seen++; }
        }
        const next = events.find((ev) => !ev.started && t >= ev.t && t < ev.t + WINDOW);
        if (next && !active) {
          next.started = true;
          active = next;
          const g = guests[next.g];
          g.querySelector('.gz-say').textContent = next.say;
          g.classList.add('gazing');
          me.textContent = '😳';
        }

        if (t < DURATION) return requestAnimationFrame(tick);
        done = true;
        if (active) endEvent(active);
        const vars = { covered, seen, breath: Math.round(breath) };
        setTimeout(() => {
          if (myRun !== runId) return;
          resolve({
            effects: {
              mood: clamp(Math.round(-(100 - breath) / 8 - seen * 1.5), -14, 2),
              family: clamp(covered - seen * 2, -8, 6),
            },
            hours: {},
            text: fill(cfg.result, vars),
            vars,
            app: cfg.app,
          });
        }, 900);
      }
      requestAnimationFrame(tick);
    }
  });

  // 推播打地鼠：要點小小的 ✕ 才關得掉，點到廣告就是購買（鄭斐文：健康工業集團；上野：市場吃掉外部）
  BOSSES.whack = (cfg) => new Promise((resolve) => {
    bossIntro(cfg, () => run(), { time: `約 ${cfg.seconds} 秒` });

    function run() {
      const myRun = runId;
      const DURATION = cfg.seconds * 1000;
      const lerp = (a, b, p) => a + (b - a) * p;
      const fmt = (n) => n.toLocaleString('en-US');
      screen(`
        <div class="wk">
          <div class="wk-top"><b>${esc(cfg.title)}</b><span id="wkTime"></span></div>
          <div class="wk-money" id="wkMoney">已扣款 <b>NT$0</b></div>
          <div class="wk-grid" id="wkGrid">${Array.from({ length: cfg.slots }, (_, i) => `<div class="wk-slot" data-s="${i}"></div>`).join('')}</div>
          <div class="wk-msg" id="wkMsg" aria-live="polite"></div>
        </div>`, 'neon boss');

      const slots = [...document.querySelectorAll('.wk-slot')];
      const moneyEl = $('#wkMoney'), timeEl = $('#wkTime'), msg = $('#wkMsg');
      const live = new Map(); // 格子編號 → { kind: 'ad' | 'friend', item, until }
      let closed = 0, charged = 0, money = 0, help = 0, friendIdx = 0, nextAt = 600, done = false;
      const t0 = performance.now();
      const say = (s) => { msg.textContent = s; msg.classList.remove('pop'); void msg.offsetWidth; msg.classList.add('pop'); };

      function charge(item) {
        charged++;
        Sound.play('coin');
        money += item.price;
        moneyEl.innerHTML = `已扣款 <b>NT$${fmt(money)}</b>`;
        moneyEl.classList.remove('pop');
        void moneyEl.offsetWidth;
        moneyEl.classList.add('pop');
      }

      function clear(i) {
        live.delete(i);
        slots[i].innerHTML = '';
      }

      function spawn(t, p) {
        const free = slots.map((_, i) => i).filter((i) => !live.has(i));
        if (!free.length) return;
        const i = free[Math.floor(Math.random() * free.length)];
        const life = lerp(cfg.life[0], cfg.life[1], p);
        if (friendIdx < cfg.friends.length && p >= cfg.friendAt[friendIdx]) {
          const f = cfg.friends[friendIdx++];
          live.set(i, { kind: 'friend', item: f, until: t + life * 1.6 });
          slots[i].innerHTML = `<button class="wk-pop friend" data-k="body"><span class="wk-who">💬 ${esc(D.characters[f.who].name)}</span>${esc(f.text)}</button>`;
          return;
        }
        const item = cfg.ads[Math.floor(Math.random() * cfg.ads.length)];
        live.set(i, { kind: 'ad', item, until: t + life });
        slots[i].innerHTML = `<div class="wk-pop ad">
          <button class="wk-buy" data-k="body"><span>${esc(item.text)}</span><b>立即購買 NT$${fmt(item.price)}</b></button>
          <button class="wk-x" data-k="x" aria-label="關閉推播">✕</button>
        </div>`;
      }

      $('#wkGrid').addEventListener('click', (e) => {
        const b = e.target.closest('[data-k]');
        if (!b || done) return;
        const i = +b.closest('.wk-slot').dataset.s;
        const pop = live.get(i);
        if (!pop) return;
        if (pop.kind === 'friend') {
          help++;
          Sound.play('good');
          say(cfg.friendYes);
        } else if (b.dataset.k === 'x') {
          closed++;
          Sound.play('tap');
        } else {
          charge(pop.item);
          say(cfg.boughtMsg);
        }
        clear(i);
      });

      function tick(now) {
        if (myRun !== runId || done) return;
        const t = now - t0, p = Math.min(1, t / DURATION);
        timeEl.textContent = `${Math.max(0, Math.ceil((DURATION - t) / 1000))} 秒`;
        for (const [i, pop] of live) {
          if (t < pop.until) continue;
          if (pop.kind === 'ad') {
            charge(pop.item);
            say(cfg.expiredMsg);
          }
          clear(i);
        }
        if (t >= nextAt && t < DURATION - 400) {
          spawn(t, p);
          nextAt = t + lerp(cfg.gap[0], cfg.gap[1], p);
        }
        if (t < DURATION) return requestAnimationFrame(tick);

        done = true;
        for (const [i, pop] of live) {
          if (pop.kind === 'ad') charge(pop.item);
          clear(i);
        }
        say(cfg.overload);
        const vars = { closed, charged, money: fmt(money), help };
        vars.helpPart = help ? fill(cfg.helpYes, vars) : cfg.helpNo;
        setTimeout(() => {
          if (myRun !== runId) return;
          resolve({
            effects: {
              mood: clamp(-charged + help * 3, -12, 4),
              bmi: clamp(-Math.round(charged / 2), -6, 0),
              family: help ? 3 : -2,
            },
            hours: {},
            text: fill(cfg.result, vars),
            vars,
            app: cfg.app,
          });
        }, 1200);
      }
      requestAnimationFrame(tick);
    }
  });

  // ---------- 全班數據（設定在 config.js，步驟見〈全班數據與發布步驟.md〉） ----------
  const CFG = window.BLOOM_CONFIG || {};
  // 表單每一題標題後面的英文代號；遊戲靠它對應題目
  const CLASS_KEYS = ['ending', 'crashes', 'hoursMe', 'hoursPartner', 'diet1200', 'negotiate', 'covered', 'leave', 'metrics'];

  // 從「預先填入的連結」找出表單 ID 和每一題的 entry 編號
  function classForm() {
    const url = CFG.formPrefillUrl || '';
    const m = url.match(/\/forms\/d\/e\/([\w-]+)\//);
    if (!m) return null;
    const entries = {};
    try {
      for (const [k, v] of new URL(url).searchParams) {
        if (k.startsWith('entry.') && CLASS_KEYS.includes(v.trim())) entries[v.trim()] = k;
      }
    } catch {
      return null;
    }
    return { action: `https://docs.google.com/forms/d/e/${m[1]}/formResponse`, entries };
  }

  function classRecord() {
    const yes = (k) => (S.flags[k] ? '是' : '否');
    return {
      ending: S.ending ? D.endings[S.ending].label : `第 ${S.ch + 1} 章完成`,
      metrics: S.metrics.map(metricLabel).join(','),
      crashes: S.crashes.length,
      hoursMe: Math.round(S.hours.me),
      hoursPartner: Math.round(S.hours.partner),
      diet1200: yes('diet1200'),
      negotiate: yes('negotiate'),
      covered: yes('covered'),
      leave: S.flags.leave ? '育嬰留停' : S.flags.backToWork ? '回去上班' : '未決定',
    };
  }

  // 玩完最後一章：匿名送出選擇。報告者模式不送，示範時才不會灌票。
  function finishGame() {
    const form = classForm();
    if (!form || presenter || S.demo || S.sent || q.has('nosend')) return false;
    S.sent = true;
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(classRecord())) if (form.entries[k]) body.append(form.entries[k], String(v));
    fetch(form.action, { method: 'POST', mode: 'no-cors', body, keepalive: true }).catch(() => {});
    return true;
  }

  function sheetId() {
    const m = (CFG.sheetUrl || '').match(/\/spreadsheets\/d\/([\w-]+)/);
    return m ? m[1] : null;
  }

  // 用 JSONP 讀 Google 試算表，不受跨網域限制
  function loadSheet(id) {
    return new Promise((resolve, reject) => {
      const cb = `__bloomSheet${Date.now()}`;
      const s = document.createElement('script');
      const cleanup = () => { clearTimeout(timer); delete window[cb]; s.remove(); };
      const timer = setTimeout(() => { cleanup(); reject(new Error('逾時')); }, 8000);
      window[cb] = (resp) => { cleanup(); resolve(resp); };
      s.onerror = () => { cleanup(); reject(new Error('連線失敗')); };
      s.src = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?headers=1&tqx=responseHandler:${cb}&t=${Date.now()}`;
      document.head.appendChild(s);
    });
  }

  function parseSheet(resp) {
    if (!resp || !resp.table) throw new Error('試算表格式不對');
    const labels = resp.table.cols.map((c) => String(c.label || ''));
    const col = Object.fromEntries(CLASS_KEYS.map((k) => [k, labels.findIndex((l) => l.includes(k))]));
    return resp.table.rows.map((r) => Object.fromEntries(CLASS_KEYS.map((k) => {
      const cell = col[k] >= 0 ? r.c[col[k]] : null;
      return [k, cell ? String(cell.v ?? cell.f ?? '').trim() : ''];
    })));
  }

  // 還沒接上試算表時的示範資料（固定亂數，每次一樣）
  function demoRows() {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const labels = D.rewrite.metrics.map((m) => m.label);
    const endingLabels = ['達標結局', '失敗結局', '崩潰結局', '隱藏結局'];
    return Array.from({ length: 24 }, () => ({
      ending: endingLabels[Math.min(3, Math.floor(rnd() * rnd() * 5))],
      metrics: [...labels].sort(() => rnd() - 0.5).slice(0, 3).join(','),
      crashes: String(Math.floor(rnd() * 3)),
      hoursMe: String(Math.round(90 + rnd() * 40)),
      hoursPartner: String(Math.round(10 + rnd() * 25)),
      diet1200: rnd() < 0.55 ? '是' : '否',
      negotiate: rnd() < 0.35 ? '是' : '否',
      covered: rnd() < 0.7 ? '是' : '否',
      leave: rnd() < 0.5 ? '回去上班' : rnd() < 0.8 ? '育嬰留停' : '未決定',
    }));
  }

  let resultsTable = false; // 「看數字表」切換
  let lastResults = null;

  function resultsHTML(rows, meta) {
    const n = rows.length;
    const count = (pred) => rows.filter(pred).length;
    const pct = (pred) => (n ? Math.round((count(pred) / n) * 100) : 0);
    const avg = (k) => (n ? rows.reduce((s, r) => s + (Number(r[k]) || 0), 0) / n : 0);
    const yes = (k) => (r) => r[k] === '是';
    const items = [
      { label: '答應 App 開啟 1200 大卡', pred: yes('diet1200'), tag: '鄭斐文：產後「六個月黃金期」（p.61）' },
      { label: '見親戚前把肚子遮起來', pred: yes('covered'), tag: '高夫曼：掩飾（p.121）' },
      { label: '要求伴侶夜奶輪流', pred: yes('negotiate'), tag: '上野：無償的再生產勞動' },
      { label: '至少崩潰一次', pred: (r) => Number(r.crashes) > 0, tag: `平均 ${avg('crashes').toFixed(1)} 次・媽媽不能 Game Over` },
      { label: '產假後回去上班', pred: (r) => r.leave === '回去上班', tag: '上野：雙重負擔（10.5）' },
      { label: '產假後請育嬰留停', pred: (r) => r.leave === '育嬰留停', tag: '對照：2025 年申請育嬰留停的人約 72% 是女性' },
      { label: '找到隱藏結局（解除安裝）', pred: (r) => r.ending === '隱藏結局', tag: '上野：要改變的是物質基礎（4.1）' },
    ];
    const me = avg('hoursMe'), pt = avg('hoursPartner'), top = Math.max(me, pt, 1);
    // 重寫 App：全班最常選的新指標（前 3 名）
    const picks = {};
    for (const r of rows) for (const m of r.metrics.split(',').map((s) => s.trim()).filter(Boolean)) picks[m] = (picks[m] || 0) + 1;
    const topPicks = Object.entries(picks).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const pickPct = (c) => (n ? Math.round((c / n) * 100) : 0);
    const time = meta.time.toLocaleTimeString('zh-TW', { hour12: false });

    const body = resultsTable
      ? `<table class="res-table">
          <thead><tr><th>項目</th><th>比例</th><th>人數</th></tr></thead>
          <tbody>
            ${items.map((it) => `<tr><td>${esc(it.label)}</td><td>${pct(it.pred)}%</td><td>${count(it.pred)}／${n}</td></tr>`).join('')}
            <tr><td>平均照顧時數：你</td><td colspan="2">${Math.round(me)} 小時</td></tr>
            <tr><td>平均照顧時數：伴侶</td><td colspan="2">${Math.round(pt)} 小時</td></tr>
            ${topPicks.map(([label, c], i) => `<tr><td>新指標第 ${i + 1} 名：${esc(label)}</td><td>${pickPct(c)}%</td><td>${c}／${n}</td></tr>`).join('')}
          </tbody>
        </table>`
      : `${items.map((it) => {
          const p = pct(it.pred);
          return `<div class="res-row" title="${n} 人中 ${count(it.pred)} 人（${p}%）">
            <div class="res-head"><span>${esc(it.label)}</span><b>${p}%</b></div>
            <div class="meter"><i style="width:${p}%"></i></div>
            <div class="res-tag">${esc(it.tag)}</div>
          </div>`;
        }).join('')}
        <div class="res-row" title="你平均 ${Math.round(me)} 小時，伴侶平均 ${Math.round(pt)} 小時">
          <div class="res-head"><span>平均照顧時數</span></div>
          <div class="cmp"><span>你</span><div class="cmp-bar"><i class="me" style="width:${(me / top) * 100}%"></i></div><b>${Math.round(me)} 小時</b></div>
          <div class="cmp"><span>伴侶</span><div class="cmp-bar"><i class="pt" style="width:${(pt / top) * 100}%"></i></div><b>${Math.round(pt)} 小時</b></div>
          <div class="res-tag">時數是遊戲依選擇累計的模型，不是真實調查</div>
        </div>
        ${topPicks.length ? `<div class="res-row" title="重寫 App 時，全班最常選的新指標">
          <div class="res-head"><span>全班最想換成的新指標</span></div>
          ${topPicks.map(([label, c]) => `
            <div class="res-head small"><span>${esc(label)}</span><b>${pickPct(c)}%</b></div>
            <div class="meter"><i style="width:${pickPct(c)}%"></i></div>`).join('')}
          <div class="res-tag">我們的觀點：要改的是指標、分工和制度</div>
        </div>` : ''}`;

    return `
      <div class="res-hero"><b>${n}</b><span>位同學玩完</span></div>
      <div class="res-meta">${meta.demo ? '<span class="res-demo">示範資料</span>' : ''}最後更新 ${time}・每 ${CFG.refreshSeconds || 10} 秒自動更新</div>
      ${body}
      <button class="btn ghost" data-act="toggleResultsTable">${resultsTable ? '看圖' : '看數字表'}</button>`;
  }

  // 全班結果：報告者選單裡，每 10 秒自動更新
  actions.results = () => {
    runId++;
    hideReply();
    S.busy = true;
    const id = sheetId();
    const demo = !id || q.has('demo');
    screen(`
      <div class="chapter-no">全班結果</div>
      <div class="chapter-title">我們的 180 天</div>
      <div class="results" id="results"><p class="note">載入中……</p></div>
      ${id ? '' : '<p class="note">還沒接上 Google 試算表，先顯示示範資料。設定方法見〈全班數據與發布步驟.md〉。</p>'}
      ${backToMenu()}`, 'scroll');
    const box = $('#results');
    const refresh = async () => {
      if (!box.isConnected) return clearInterval(timer);
      try {
        // 「結局」寫「測試」的是設定時的測試資料，不算進全班結果
        const rows = demo ? demoRows() : parseSheet(await loadSheet(id)).filter((r) => r.ending !== '測試');
        lastResults = [rows, { demo, time: new Date() }];
        if (box.isConnected) box.innerHTML = resultsHTML(...lastResults);
      } catch (err) {
        if (box.isConnected) box.innerHTML = `<p class="note">讀不到試算表（${esc(err.message)}）。請確認試算表已設成「知道連結的任何人」都能檢視。</p>`;
      }
    };
    const timer = setInterval(refresh, (CFG.refreshSeconds || 10) * 1000);
    refresh();
  };
  actions.toggleResultsTable = () => {
    resultsTable = !resultsTable;
    const box = $('#results');
    if (box && lastResults) box.innerHTML = resultsHTML(...lastResults);
  };

  // ---------- 啟動 ----------
  // 網址參數（報告、測試用）：
  //   ?menu     報告者模式：跳章、理論卡圖鑑、全班結果、QR code；左上角一直有「報告者選單」，按 M 也能叫出
  //   ?results  直接打開全班結果（也算報告者模式）；加 &demo 強制顯示示範資料
  //   ?deck     直接打開理論卡圖鑑
  //   ?ch=2     直接從第 2 章開始
  //   ?boss=1   直接玩第 1 章的 Boss
  //   ?skip     跳過開場
  //   ?nosend   玩完不送出全班數據（測試用）
  //   ?short    精簡版：跳過標了 extra 的卡片，約 8 分鐘（預設是完整版，時間不限）
  //   ?timer    右上角顯示碼表，彩排時計時用
  //   ?finale=hidden|reach|crash|fail  直接看某一種結局（用示範數字，不送全班數據）
  $('#brandFlower').innerHTML = flowerSVG();
  const soundBtn = $('#soundBtn');
  paintSound = () => {
    soundBtn.textContent = Sound.on ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-pressed', String(Sound.on));
  };
  soundBtn.addEventListener('click', () => {
    Sound.toggle();
    paintSound();
    Sound.play('tap');
  });
  paintSound();
  const q = new URLSearchParams(location.search);
  const chOf = (v) => clamp((parseInt(v, 10) || 1) - 1, 0, D.chapters.length - 1);
  full = !q.has('short');
  if (q.has('timer')) {
    const badge = document.createElement('div');
    badge.className = 'play-timer';
    document.body.appendChild(badge);
    const start = Date.now();
    setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      badge.textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }, 500);
  }
  presenter = q.has('menu') || q.has('results');
  resetGame(0);
  if (presenter) {
    addPresenterButton();
    if (q.has('results')) actions.results();
    else actions.menu();
  } else if (q.has('deck')) actions.deck();
  else if (q.has('ch')) { resetGame(chOf(q.get('ch'))); actions.chapterTitle(); }
  else if (q.has('boss')) { resetGame(chOf(q.get('boss'))); afterCards(); }
  else if (q.has('finale')) { const e = D.endings[q.get('finale')] ? q.get('finale') : 'fail'; seedDemo(e); finale(e); }
  else if (q.has('skip')) actions.chapterTitle();
  else actions.splash();
})();
