(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Video nel telefono ─────────────────────────── */
  var video = document.getElementById('heroVideo');
  var ctl = document.getElementById('videoCtl');
  var soundBtn = document.getElementById('soundBtn');
  function setPlaying(on) { ctl.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  function tryPlay() {
    var p = video.play();
    if (p && p.then) p.then(function () { setPlaying(true); }, function () { setPlaying(false); });
    else setPlaying(true);
  }
  if (!reduce) tryPlay();
  ctl.addEventListener('click', function () {
    if (video.paused) tryPlay(); else { video.pause(); setPlaying(false); }
  });
  soundBtn.addEventListener('click', function () {
    video.muted = !video.muted;
    soundBtn.setAttribute('aria-pressed', video.muted ? 'false' : 'true');
    if (!video.muted && video.paused) tryPlay();
  });
  // niente video in background quando non si vede
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting && !video.paused) { video.pause(); video.dataset.auto = '1'; setPlaying(false); }
        else if (e.isIntersecting && video.dataset.auto === '1') { video.dataset.auto = ''; tryPlay(); }
      });
    }, { threshold: 0.15 }).observe(video);
  }

  /* ── Hero a scorrimento: --e va da 0 a 1 mentre lo stage è bloccato ── */
  (function () {
    var hero = document.getElementById('hero');
    if (!hero || reduce) return;
    document.documentElement.classList.add('has-motion');
    var queued = false;
    function update() {
      queued = false;
      var range = hero.offsetHeight - window.innerHeight;
      var p = range > 0 ? Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / range)) : 1;
      hero.style.setProperty('--e', (p * p * (3 - 2 * p)).toFixed(4));
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    update();
  })();

  /* ── Navbar: evidenzia la sezione corrente ── */
  (function () {
    var links = [].slice.call(document.querySelectorAll('.nav-links a'));
    var map = links.map(function (a) { return { a: a, s: document.querySelector(a.getAttribute('href')) }; }).filter(function (x) { return x.s; });
    if (!map.length) return;
    function spy() {
      var cur = null, line = window.innerHeight * 0.35;
      map.forEach(function (x) { if (x.s.getBoundingClientRect().top <= line) cur = x.a; });
      links.forEach(function (a) { a.classList.toggle('is-here', a === cur); if (a === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    }
    addEventListener('scroll', spy, { passive: true }); spy();
  })();

  /* ── Reveal on scroll ─────────────────────────── */
  var rv = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    rv.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 80 + 'ms'; io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  /* ── Contatori ─────────────────────────── */
  var fmt = new Intl.NumberFormat('it-IT');
  document.querySelectorAll('[data-count]').forEach(function (el) {
    if (reduce || !('IntersectionObserver' in window)) return;
    var target = +el.dataset.count, suffix = el.dataset.suffix || '';
    var o = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      o.disconnect();
      var t0 = performance.now(), dur = 1200;
      (function tick(t) {
        var k = Math.min(1, (t - t0) / dur), v = Math.round(target * (1 - Math.pow(1 - k, 3)));
        el.textContent = fmt.format(v) + (k === 1 ? suffix : '');
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    }, { threshold: 0.6 });
    o.observe(el);
  });

  /* ── Demo giocabile ─────────────────────────── */
  var words = window.LEXI_WORDS || [];
  var $ = function (id) { return document.getElementById(id); };
  var elWord = $('word'), elScore = $('score'), elFb = $('feedback'), elHearts = $('hearts'),
      elStart = $('startOverlay'), elEnd = $('endOverlay'), elFinal = $('finalScore'), elMsg = $('finalMsg'),
      pads = document.querySelectorAll('.pad');
  var NAMES = { fs: 'femminile singolare', ms: 'maschile singolare', fp: 'femminile plurale', mp: 'maschile plurale' };
  var LIVES = 3, lives, score, current, deck, locked = true, best = 0;
  try { best = +localStorage.getItem('lexi-best') || 0; } catch (e) {}

  var heartSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.4 2.7 4.5 6.5 4.5c2 0 3.7 1.1 5.5 3.3 1.8-2.2 3.5-3.3 5.5-3.3 3.8 0 5.7 3.9 4.1 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  function drawHearts() {
    var h = '';
    for (var i = 0; i < LIVES; i++) h += heartSvg.replace('<svg', '<svg class="' + (i < lives ? 'full' : '') + '"');
    elHearts.innerHTML = h;
    elHearts.setAttribute('aria-label', 'Cuori rimasti: ' + lives);
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function nextWord() {
    if (!deck.length) deck = shuffle(words);
    current = deck.pop();
    elWord.textContent = current[0];
    elWord.className = 'word-box';
    elFb.textContent = 'Lancia la parola verso l’angolo giusto';
    resetWord(true);
    pads.forEach(function (p) { p.classList.remove('right', 'wrong', 'reveal-right'); });
    locked = false;
  }
  function padFor(g, n) { return document.querySelector('.pad[data-g="' + g + '"][data-n="' + n + '"]'); }
  function start() {
    lives = LIVES; score = 0; deck = shuffle(words);
    elScore.textContent = '0'; drawHearts();
    elStart.hidden = true; elEnd.hidden = true;
    nextWord();
  }
  function end() {
    locked = true;
    var record = score > best;
    if (record) { best = score; try { localStorage.setItem('lexi-best', String(best)); } catch (e) {} }
    elFinal.textContent = score;
    elMsg.textContent = record && score > 0 ? 'Nuovo record!' : 'Il tuo record: ' + best;
    setTimeout(function () { elEnd.hidden = false; $('againBtn').focus({ preventScroll: true }); }, reduce ? 0 : 900);
  }
  function answer(pad) {
    if (locked) return;
    locked = true;
    var ok = pad.dataset.g === current[1] && pad.dataset.n === current[2];
    var def = current[3].charAt(0).toUpperCase() + current[3].slice(1) + '.';
    var right = padFor(current[1], current[2]);
    if (ok) {
      score++; elScore.textContent = score;
      pad.classList.add('right'); elWord.classList.add('right');
      elFb.textContent = 'Giusto! ' + current[0] + ': ' + NAMES[current[1] + current[2]] + '. ' + def;
      setTimeout(nextWord, reduce ? 900 : 1300);
    } else {
      lives--; drawHearts();
      pad.classList.add('wrong'); elWord.classList.add('wrong');
      right.classList.add('reveal-right');
      elFb.textContent = 'Era ' + NAMES[current[1] + current[2]] + '. ' + def;
      if (lives <= 0) setTimeout(end, 1500); else setTimeout(nextWord, 2200);
    }
  }
  pads.forEach(function (p) { p.addEventListener('click', function () { answer(p); }); });

  /* Lancio: trascina la parola verso un angolo (sinistra ♀ / destra ♂, sopra plurale / sotto singolare) */
  var drag = null, game = $('game');
  function resetWord(instant) {
    elWord.style.transition = instant ? 'none' : 'transform .3s cubic-bezier(.2,.8,.2,1), background .2s';
    elWord.style.transform = '';
    elWord.style.opacity = '';
    if (instant) { void elWord.offsetWidth; elWord.style.transition = ''; }
  }
  function aimPad(dx, dy) {
    return padFor(dx < 0 ? 'f' : 'm', dy < 0 ? 'p' : 's');
  }
  function clearAim() { pads.forEach(function (p) { p.classList.remove('aim'); }); }
  elWord.addEventListener('pointerdown', function (e) {
    if (locked || e.button > 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
    elWord.setPointerCapture(e.pointerId);
    elWord.classList.add('dragging');
    elWord.style.transition = 'none';
  });
  elWord.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y;
    elWord.style.transform = 'translate(' + drag.dx + 'px,' + drag.dy + 'px) rotate(' + Math.max(-12, Math.min(12, drag.dx / 14)) + 'deg)';
    clearAim();
    if (Math.hypot(drag.dx, drag.dy) > 30) aimPad(drag.dx, drag.dy).classList.add('aim');
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    elWord.classList.remove('dragging'); clearAim();
    if (Math.hypot(d.dx, d.dy) < 50 || locked) { resetWord(false); return; }
    var pad = aimPad(d.dx, d.dy), pr = pad.getBoundingClientRect(), wr = elWord.getBoundingClientRect();
    var tx = pr.left + pr.width / 2 - (wr.left + wr.width / 2) + (parseFloat((elWord.style.transform.match(/translate\(([-\d.]+)px/) || [0, 0])[1]) || 0);
    var ty = pr.top + pr.height / 2 - (wr.top + wr.height / 2) + (parseFloat((elWord.style.transform.match(/,([-\d.]+)px\)/) || [0, 0])[1]) || 0);
    elWord.style.transition = 'transform .22s ease-in, opacity .22s';
    elWord.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(.45)';
    elWord.style.opacity = '.0';
    locked = true;
    setTimeout(function () {
      locked = false;
      elWord.style.transition = 'none'; elWord.style.transform = ''; elWord.style.opacity = '';
      void elWord.offsetWidth; elWord.style.transition = '';
      answer(pad);
    }, reduce ? 0 : 230);
  }
  elWord.addEventListener('pointerup', endDrag);
  elWord.addEventListener('pointercancel', endDrag);
  $('startBtn').addEventListener('click', start);
  $('againBtn').addEventListener('click', start);
  lives = LIVES; drawHearts();
  // scorciatoie da tastiera: Q W / A S = angoli (alto-sx, alto-dx, basso-sx, basso-dx)
  var keymap = { q: 'f-p', w: 'm-p', a: 'f-s', s: 'm-s', '7': 'f-p', '9': 'm-p', '1': 'f-s', '3': 'm-s' };
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || locked) return;
    var k = keymap[e.key.toLowerCase()];
    if (!k) return;
    var pad = padFor(k.charAt(0), k.charAt(2));
    if (pad && elStart.hidden && elEnd.hidden) answer(pad);
  });
})();
