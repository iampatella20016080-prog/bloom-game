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
  };

  let S; // 遊戲狀態
  let shownBmi = null;
  let replyTimer = 0;
  let presenter = false; // 報告者模式（網址加 ?menu）
  let runId = 0;         // 每次重新開始就 +1，讓還在跑的 Boss 停下來

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ''));
  const bmiOf = (v) => D.settings.bmiMin + (D.settings.bmiMax - D.settings.bmiMin) * v / 100;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function newState() {
    return {
      stats: { ...D.settings.start },
      ch: 0, i: 0, day: 1, busy: true,
      flags: {},                        // 記下的事＋「拒絕／接受了誰幾次」
      hours: { me: 0, partner: 0, mil: 0 },
      crashes: [],                      // { stat, side, day }
      theories: [],                     // 拿到的理論卡 id
      last: {},                         // 最近一次 Boss 的結果，給理論卡填字
    };
  }

  // 重新開始（可以指定從第幾章開始，報告者模式用）
  function resetGame(ch = 0) {
    runId++;
    S = newState();
    S.ch = ch;
    el.cracks.innerHTML = '';
    hideReply();
    renderStats();
  }

  // ---------- 小綻 ----------
  function flowerSVG() {
    const petals = [0, 72, 144, 216, 288]
      .map((a) => `<ellipse cx="50" cy="23" rx="17" ry="22" transform="rotate(${a} 50 50)"/>`).join('');
    return `<svg viewBox="0 0 100 100" class="flower" aria-hidden="true">
      <g class="petals">${petals}</g>
      <circle cx="50" cy="50" r="21" class="core"/>
      <circle cx="42" cy="47" r="2.8" class="eye"/><circle cx="58" cy="47" r="2.8" class="eye"/>
      <circle cx="37" cy="55" r="3.5" class="blush"/><circle cx="63" cy="55" r="3.5" class="blush"/>
      <path d="M43 55 Q50 62 57 55" class="mouth"/>
    </svg>`;
  }
  const avatarHTML = (who) => (who.avatar === 'flower' ? flowerSVG() : esc(who.avatar));

  // ---------- 數值 ----------
  function renderStats(changed = {}) {
    for (const k of ['mood', 'baby', 'family']) {
      const node = document.querySelector(`.stat[data-stat="${k}"]`);
      node.querySelector('i').style.width = S.stats[k] + '%';
      node.classList.toggle('danger', S.stats[k] <= 20 || S.stats[k] >= 80);
      flash(node, changed[k]);
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
      if (!v) continue;
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
      <div class="choice-label right">${esc(c.right.label)}</div>`;
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
  }

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
    if (b && actions[b.dataset.act]) actions[b.dataset.act](b.dataset);
  });

  actions.splash = () => screen(`
    <div class="splash">${flowerSVG()}</div>
    <div class="title-big">綻放 <b>BLOOM</b></div>
    <div class="slogan">${esc(D.intro.appSlogan)}</div>
    <button class="btn" data-act="register">開始使用</button>
    <p class="content-note">${esc(D.intro.contentNote)}</p>
    ${classForm() ? `<p class="content-note">${esc(D.intro.privacyNote)}</p>` : ''}`);

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
      addHours(result.hours);
      applyEffects(result.effects);
      await resultScreen(cfg, result);
      for (const id of [].concat(cfg.theory || [])) await theoryScreen(id);
      await resolveCrashes();
    }
    chapterEnd();
  }

  function resultScreen(cfg, result) {
    return new Promise((resolve) => {
      actions.resultGoOn = () => resolve();
      const fx = result.effects;
      const fxText = KEYS.filter((k) => fx[k]).map((k) => `${ICON[k]} ${fx[k] > 0 ? '+' : ''}${fx[k]}`).join('　');
      screen(`
        <div class="chapter-no">${esc(cfg.no)} 結束</div>
        <div class="chapter-title">${esc(cfg.title)}</div>
        <p class="end-text">${esc(result.text)}</p>
        <div class="summary">${fxText}</div>
        ${result.app ? `<div class="app-push">${flowerSVG()}<div><b>BLOOM</b><br>${esc(result.app)}</div></div>` : ''}
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

  function theoryScreen(id) {
    const t = D.theories[id];
    if (!S.theories.includes(id)) S.theories.push(id);
    return new Promise((resolve) => {
      actions.theoryGoOn = () => { hideScreen(); resolve(); };
      actions.flipTheory = () => $('#theoryCard').classList.add('flipped');
      screen(`
        <div class="chapter-no">獲得理論卡</div>
        <button class="theory-card" id="theoryCard" data-act="flipTheory" aria-label="翻開理論卡">
          <span class="tc-face tc-back">${flowerSVG()}<span>點一下翻開</span></span>
          <span class="tc-face tc-front">${theoryFrontHTML(t, S.last)}</span>
        </button>
        <button class="btn" data-act="theoryGoOn">收進圖鑑</button>`);
    });
  }

  const ICON = { mood: '🌙', baby: '👶', family: '💞', bmi: '⚖️' };

  function summaryHTML() {
    const h = S.hours;
    return `<div class="summary">
      <span>⚖️ BMI ${bmiOf(S.stats.bmi).toFixed(1)}</span>
      <span>🌙 ${S.stats.mood}</span><span>👶 ${S.stats.baby}</span><span>💞 ${S.stats.family}</span>
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
        : `<p class="note">第 ${S.ch + 2} 章製作中</p>
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
        <button data-act="deck">理論卡圖鑑（文獻討論）</button>
        <button data-act="results">全班結果（即時）</button>
        <button data-act="share">分享給同學（QR code）</button>
      </div>
      <p class="note">遊戲中隨時可以按左上角「報告者選單」或鍵盤 M 回到這裡。</p>`);
  };
  actions.menuIntro = () => { resetGame(0); actions.splash(); };
  actions.menuChapter = (ds) => { resetGame(+ds.n); actions.chapterTitle(); };
  actions.menuBoss = (ds) => { resetGame(+ds.n); afterCards(); };

  // 理論卡圖鑑：報告時直接投影當文獻討論
  actions.deck = () => {
    const list = Object.entries(D.theories);
    screen(`
      <div class="chapter-no">理論卡圖鑑</div>
      <div class="chapter-title">文獻討論</div>
      <div class="deck">${list.map(([id, t]) => `
        <button class="deck-card" data-act="theoryDetail" data-id="${esc(id)}">
          <span class="tc-author">${esc(t.author)}</span>
          <span class="deck-concept">${esc(t.concept)}</span>
          <span class="tc-source">${esc(t.source)}</span>
        </button>`).join('')}</div>
      <p class="note">目前有 ${list.length} 張。每打完一個 Boss 會拿到一張。</p>
      ${presenter ? backToMenu() : '<button class="btn" data-act="splash">開始遊戲</button>'}`);
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

  // 夜奶節奏戰：寶寶一哭就點，睡眠條往下掉（上野：無償勞動沒有下班時間）
  BOSSES.nightFeed = (cfg) => new Promise((resolve) => {
    actions.bossStart = () => run();
    screen(`
      <div class="chapter-no">${esc(cfg.no)}</div>
      <div class="chapter-title">${esc(cfg.title)}</div>
      <ul class="bg-list">${cfg.rules.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <button class="btn" data-act="bossStart">開始</button>`, 'night');

    function run() {
      const DURATION = 30000;  // 30 秒＝晚上 11 點到早上 6 點
      const CRY = 1800;        // 每次哭多久
      const PERFECT = 550;     // 最後這段時間點下去算完美
      const partnerOn = sharing();
      const myRun = runId;

      screen(`
        <div class="nf">
          <div class="nf-top"><span class="nf-clock" id="nfClock">23:00</span><span>${esc(cfg.title)}</span></div>
          <div class="nf-sleep"><span>💤 睡眠</span><div class="bar"><i id="nfSleep"></i></div></div>
          <div class="nf-room">
            <button class="nf-baby" id="nfBaby" aria-label="安撫寶寶">
              <span class="nf-ring" id="nfRing"></span><span class="nf-face" id="nfFace">😴</span>
            </button>
            <div class="nf-msg" id="nfMsg" aria-live="polite"></div>
          </div>
          <div class="nf-partner" id="nfPartner">🧑 ${partnerOn ? '在旁邊睡' : '在客房睡'} 💤</div>
          <div class="nf-push" id="nfPush">${esc(cfg.appPush)}</div>
        </div>`, 'night boss');

      const baby = $('#nfBaby'), ring = $('#nfRing'), face = $('#nfFace'), msg = $('#nfMsg');
      const sleepBar = $('#nfSleep'), clock = $('#nfClock'), push = $('#nfPush'), partner = $('#nfPartner');

      // 排好哭的時間
      const cries = [];
      for (let t = 1400; t < DURATION - CRY; t += 2300 + Math.random() * 1300) cries.push({ t, done: false });

      let sleep = 100, me = 0, partnerN = 0, perfect = 0, missed = 0;
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
        if (isPerfect) perfect++;
        sleep -= isPerfect ? 7 : 12;
        face.textContent = '🍼';
        say(isPerfect ? '完美安撫！' : '安撫中……');
      });

      function tick(now) {
        if (myRun !== runId) return; // 已經重新開始或跳去別章
        const t = now - t0;
        const dt = now - last;
        last = now;
        clock.textContent = fmt(hourAt(Math.min(t, DURATION)));

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
            partner.textContent = `🧑 ${cfg.partnerLine}`;
            say('伴侶起來了');
          } else {
            face.textContent = '😭';
            baby.classList.add('crying');
          }
        }

        // 畫面卡頓（切到背景、螢幕暗掉）時，已經過去的哭聲直接算沒接到
        if (!active) {
          for (const c of cries) {
            if (!c.started && t >= c.t + CRY) { c.started = c.done = true; missed++; sleep -= 6; }
          }
        }

        if (active) {
          const p = clamp((t - active.t) / CRY, 0, 1);
          ring.style.transform = `scale(${2.2 - 1.2 * p})`;
          ring.style.opacity = active.by ? 0 : 1;
          if (p >= 1) {
            if (!active.by) {
              missed++;
              sleep -= 6;
              say('寶寶哭得更大聲了');
            }
            active.done = true;
            active = null;
            baby.classList.remove('crying');
            face.textContent = '😴';
            ring.style.opacity = 0;
            if (partnerOn) partner.textContent = '🧑 在旁邊睡 💤';
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
    actions.bossStart = () => run();
    screen(`
      <div class="chapter-no">${esc(cfg.no)}</div>
      <div class="chapter-title">${esc(cfg.title)}</div>
      <ul class="bg-list">${cfg.rules.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <button class="btn" data-act="bossStart">開始</button>`, 'day');

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
          return say(cur.kind === 'exercise' ? cfg.noFit : '這裡放不下');
        }
        const kind = cur.kind;
        place(list, kind);
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

  // ---------- 全班數據（設定在 config.js，步驟見〈全班數據與發布步驟.md〉） ----------
  const CFG = window.BLOOM_CONFIG || {};
  // 表單每一題標題後面的英文代號；遊戲靠它對應題目
  const CLASS_KEYS = ['ending', 'crashes', 'hoursMe', 'hoursPartner', 'diet1200', 'negotiate', 'covered', 'leave'];

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
      ending: `第 ${S.ch + 1} 章完成`,
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
    if (!form || presenter || S.sent || q.has('nosend')) return false;
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
    return Array.from({ length: 24 }, () => ({
      ending: '第 2 章完成',
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
    ];
    const me = avg('hoursMe'), pt = avg('hoursPartner'), top = Math.max(me, pt, 1);
    const time = meta.time.toLocaleTimeString('zh-TW', { hour12: false });

    const body = resultsTable
      ? `<table class="res-table">
          <thead><tr><th>項目</th><th>比例</th><th>人數</th></tr></thead>
          <tbody>
            ${items.map((it) => `<tr><td>${esc(it.label)}</td><td>${pct(it.pred)}%</td><td>${count(it.pred)}／${n}</td></tr>`).join('')}
            <tr><td>平均照顧時數：你</td><td colspan="2">${Math.round(me)} 小時</td></tr>
            <tr><td>平均照顧時數：伴侶</td><td colspan="2">${Math.round(pt)} 小時</td></tr>
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
        </div>`;

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
        const rows = demo ? demoRows() : parseSheet(await loadSheet(id));
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
  $('#brandFlower').innerHTML = flowerSVG();
  const q = new URLSearchParams(location.search);
  const chOf = (v) => clamp((parseInt(v, 10) || 1) - 1, 0, D.chapters.length - 1);
  presenter = q.has('menu') || q.has('results');
  resetGame(0);
  if (presenter) {
    addPresenterButton();
    if (q.has('results')) actions.results();
    else actions.menu();
  } else if (q.has('deck')) actions.deck();
  else if (q.has('ch')) { resetGame(chOf(q.get('ch'))); actions.chapterTitle(); }
  else if (q.has('boss')) { resetGame(chOf(q.get('boss'))); afterCards(); }
  else if (q.has('skip')) actions.chapterTitle();
  else actions.splash();
})();
