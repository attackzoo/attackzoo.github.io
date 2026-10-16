/* Interações e gráficos do site. Depende de caps.js (window.AZ_CAPS) e data.js (window.AZ_ATTACKS). */
(function () {
  'use strict';
  var CAPS = window.AZ_CAPS || { canvas: true, raf: true, observer: true, animate: true, fallback: function () {} };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return n.toLocaleString('pt-BR'); };
  function cssVar(n, d) { return (getComputedStyle(document.documentElement).getPropertyValue(n) || '').trim() || d; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* Executa fn quando o nó entra na tela; sem IntersectionObserver, executa já. */
  function onView(node, fn) {
    if (!node) return;
    if (!CAPS.observer) { fn(); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(); } });
    }, { threshold: 0.25 });
    io.observe(node);
  }
  function setupCanvas(cv) {
    var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c: c, w: r.width, h: r.height };
  }

  var FAMS = [
    null,
    { n: 'Reconhecimento e descoberta', v: '--f1' },
    { n: 'Interceptação e exploração de rede', v: '--f2' },
    { n: 'Ataques a aplicações Web', v: '--f3' },
    { n: 'Força bruta em acesso remoto', v: '--f4' },
    { n: 'Exfiltração e tunelamento', v: '--f5' },
    { n: 'Negação de serviço e impacto', v: '--f6' },
    { n: 'Ataques a protocolos de IoT', v: '--f7' }
  ];
  var TACTICS = { TA0001: 'Acesso inicial', TA0006: 'Acesso a credenciais', TA0007: 'Descoberta', TA0008: 'Movimento lateral', TA0009: 'Coleta', TA0010: 'Exfiltração', TA0011: 'Comando e controle', TA0040: 'Impacto', TA0043: 'Reconhecimento' };

  /* ---------- Tema ---------- */
  var themeBtn = $('#themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var root = document.documentElement;
    var cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('az-theme', next); } catch (e) {}
    redrawAll();
  });

  /* ---------- Navegação ativa ---------- */
  if (CAPS.observer) {
    var links = $$('.nav a');
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && map[e.target.id]) {
          links.forEach(function (a) { a.classList.remove('on'); });
          map[e.target.id].classList.add('on');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- Comparação de testbeds ---------- */
  var TB = [
    ['Kouril et al., 2014', 1], ['Bernieri et al., 2017', 4], ['Siboni et al., 2019', 5, 1],
    ['Dhanapal e N., 2021', 1], ['Wlazlo et al., 2021', 3], ['Prates Jr. et al., 2021', 4],
    ['Gotham, 2024', 19, 1], ['MQTT-VET, 2024', 4], ['Katuri et al., 2024', 2],
    ['Huang et al., 2024', 8, 1], ['HackInSDN, 2025', 5, 1], ['AttackZoo', 60, 0, 1]
  ];
  var bars = $('#testbedBars');
  if (bars) {
    var fills = [];
    TB.forEach(function (r) {
      var row = el('div', 'bar-row' + (r[3] ? ' me' : ''));
      row.appendChild(el('span', 'bar-name', r[0]));
      var tr = el('div', 'bar-track'), f = el('div', 'bar-fill'), v = el('span', 'bar-val', r[1] + (r[2] ? '*' : ''));
      tr.appendChild(f); tr.appendChild(v); row.appendChild(tr); bars.appendChild(row);
      fills.push([f, v, r[1]]);
    });
    var med = el('div', 'median', '<span>mediana = 4</span>');
    bars.appendChild(med);
    var placeMedian = function () {
      var tr = $('.bar-track', bars);
      med.style.left = (tr.offsetLeft + tr.offsetWidth * 4 / 60) + 'px';
    };
    placeMedian();
    window.addEventListener('resize', placeMedian);
    var grow = function () {
      fills.forEach(function (x) { var p = x[2] / 60 * 100; x[0].style.width = p + '%'; x[1].style.left = p + '%'; });
    };
    if (CAPS.animate) onView(bars, grow); else grow();
  }

  /* ---------- Catálogo ---------- */
  var A = window.AZ_ATTACKS || [];
  var catalog = $('#catalog'), detail = $('#detail'), filters = $('#famFilters');
  var activeFam = 0;
  if (catalog && filters) {
    var counts = {}; A.forEach(function (a) { counts[a[2]] = (counts[a[2]] || 0) + 1; });
    var mkChip = function (id, label, n, v) {
      var b = el('button', 'chip', (v ? '<i></i>' : '') + label + ' <small>' + n + '</small>');
      b.type = 'button'; b.setAttribute('aria-pressed', id === 0 ? 'true' : 'false');
      if (v) b.style.setProperty('--c', 'var(' + v + ')');
      b.addEventListener('click', function () {
        activeFam = id;
        $$('.chip', filters).forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        renderCatalog();
      });
      filters.appendChild(b);
    };
    mkChip(0, 'Todas', A.length);
    for (var f = 1; f <= 7; f++) mkChip(f, FAMS[f].n, counts[f] || 0, FAMS[f].v);
    renderCatalog();
  }
  function renderCatalog() {
    catalog.innerHTML = '';
    A.forEach(function (a) {
      if (activeFam && a[2] !== activeFam) return;
      var li = el('li'), b = el('button');
      b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.style.setProperty('--c', 'var(' + FAMS[a[2]].v + ')');
      var nm = el('span', 'nm'); nm.textContent = a[1];
      b.appendChild(nm); b.appendChild(document.createTextNode(a[0]));
      b.addEventListener('click', function () {
        $$('button', catalog).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        showDetail(a);
      });
      li.appendChild(b); catalog.appendChild(li);
    });
  }
  function showDetail(a) {
    detail.style.setProperty('--c', 'var(' + FAMS[a[2]].v + ')');
    detail.innerHTML = '';
    var h = el('h3'); h.textContent = a[1]; detail.appendChild(h);
    var fam = el('p', 'fam'); fam.textContent = FAMS[a[2]].n + ', ' + a[3].toLowerCase(); detail.appendChild(fam);
    var p = el('p'); p.textContent = a[4]; detail.appendChild(p);
    var dl = el('dl');
    var add = function (k, node) { var dt = el('dt'); dt.textContent = k; var dd = el('dd'); dd.appendChild(node); dl.appendChild(dt); dl.appendChild(dd); };
    var idc = el('code'); idc.textContent = a[0]; add('Identificador', idc);
    var tg = el('span'); tg.textContent = a[5]; add('Alvo', tg);
    var tac = el('div', 'tags');
    a[6].forEach(function (t) { var x = el('a'); x.href = 'https://attack.mitre.org/tactics/' + t + '/'; x.textContent = t + ' ' + (TACTICS[t] || ''); tac.appendChild(x); });
    add('Táticas MITRE ATT&CK', tac);
    var tec = el('div', 'tags');
    a[7].forEach(function (t) { var x = el('a'); x.href = 'https://attack.mitre.org/techniques/' + t.replace('.', '/') + '/'; x.textContent = t; tec.appendChild(x); });
    add('Técnicas e subtécnicas', tec);
    detail.appendChild(dl);
  }

  /* ---------- Gráfico do experimento (estático, valores publicados) ---------- */
  var simCv = $('#simCanvas'), simLevel = 'L0';
  var SIM = {
    L0: { ok: '100%', med: 'poucos ms', tail: 'poucos ms' },
    L3: { ok: '55,6%', med: '1.275,74 ms', tail: '≈ 2.002 ms' }
  };
  function prng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
  function drawSim() {
    if (!simCv) return;
    var g = setupCanvas(simCv), c = g.c, w = g.w, h = g.h;
    var ink = cssVar('--ink', '#14232D'), ink3 = cssVar('--ink-3', '#74848E'), rule = cssVar('--rule', '#CDD6DB');
    var okC = cssVar('--ok', '#2E9A5E'), badC = cssVar('--bad', '#D2463F'), sig = cssVar('--signal', '#E2A019');
    var L = 54, R = 12, T = 26, B = 34, pw = w - L - R, ph = h - T - B;
    var x = function (s) { return L + s / 240 * pw; };
    var y = function (ms) { return T + ph - Math.log10(Math.max(ms, 1)) / Math.log10(3000) * ph; };
    c.clearRect(0, 0, w, h);
    // faixas das fases
    c.fillStyle = sig; c.globalAlpha = .12; c.fillRect(x(60), T, x(180) - x(60), ph); c.globalAlpha = 1;
    c.font = '600 12px Archivo, sans-serif'; c.fillStyle = ink3; c.textAlign = 'center';
    c.fillText('aquecimento', x(30), T - 8); c.fillText('ataque (120 s)', x(120), T - 8); c.fillText('resfriamento', x(210), T - 8);
    // eixos
    c.strokeStyle = rule; c.lineWidth = 1; c.textAlign = 'right'; c.font = '11px Archivo, sans-serif';
    [1, 10, 100, 1000, 2000].forEach(function (ms) {
      c.beginPath(); c.moveTo(L, y(ms)); c.lineTo(L + pw, y(ms)); c.stroke();
      c.fillText(ms >= 1000 ? fmt(ms) + ' ms' : ms + ' ms', L - 6, y(ms) + 4);
    });
    c.textAlign = 'center';
    [0, 60, 120, 180, 240].forEach(function (s) { c.fillText(s + ' s', x(s), h - 12); });
    // amostras (série ilustrativa a partir dos valores publicados)
    var r = prng(simLevel === 'L0' ? 7 : 11);
    for (var i = 0; i < 480; i++) {
      var s = i * 0.5, inAtk = s >= 60 && s < 180, ms = 1.5 + r() * 3, fail = false;
      if (simLevel === 'L3' && inAtk) {
        fail = r() > 0.556;
        ms = fail ? 2000 : 600 + r() * 1300;
        if (!fail && r() < .5) ms = 1275 + (r() - .5) * 500;
      }
      c.fillStyle = fail ? badC : okC;
      c.globalAlpha = fail ? .85 : .7;
      c.beginPath(); c.arc(x(s), y(ms), fail ? 2.4 : 2, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    // limite de espera da sonda
    c.setLineDash([4, 4]); c.strokeStyle = ink; c.beginPath(); c.moveTo(L, y(2000)); c.lineTo(L + pw, y(2000)); c.stroke(); c.setLineDash([]);
    c.textAlign = 'left'; c.fillStyle = ink; c.fillText('limite de espera da sonda (2 s)', L + 6, y(2000) - 6);
    $('#simOk').textContent = SIM[simLevel].ok;
    $('#simMed').textContent = SIM[simLevel].med;
    $('#simTail').textContent = SIM[simLevel].tail;
  }
  if (simCv) {
    if (!CAPS.canvas) CAPS.fallback(simCv, 'O gráfico usa Canvas 2D. Os valores publicados estão no texto logo abaixo.');
    else {
      $$('[data-level]').forEach(function (b) {
        b.addEventListener('click', function () {
          simLevel = b.getAttribute('data-level');
          $$('[data-level]').forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
          drawSim();
        });
      });
      drawSim();
    }
  }

  /* ---------- Grade da campanha: 60 ataques x 20 execuções ---------- */
  var campCv = $('#campCanvas'), campDone = 0, campRaf = 0;
  function drawCamp(n) {
    var g = setupCanvas(campCv), c = g.c, w = g.w, h = g.h;
    var cols = 20, rows = 60, gapG = 6, cw = (w - gapG * 3) / cols, rh = h / rows;
    c.clearRect(0, 0, w, h);
    for (var i = 0; i < rows * cols; i++) {
      var r = Math.floor(i / cols), k = i % cols, lv = Math.floor(k / 5);
      var px = k * cw + lv * gapG, py = r * rh;
      var fam = A[r] ? A[r][2] : 1;
      if (i < n) {
        c.fillStyle = cssVar(FAMS[fam].v, '#888');
        c.globalAlpha = lv === 0 ? .35 : .55 + lv * .15;
      } else { c.fillStyle = '#ffffff'; c.globalAlpha = .06; }
      c.fillRect(px + .5, py + .5, Math.max(cw - 1.5, 1), Math.max(rh - 1.5, 1));
    }
    c.globalAlpha = 1;
    $('#campCount').textContent = fmt(n) + ' de 1.200 capturas';
    $('#campClock').textContent = Math.round(n / 1200 * 82) + ' h de 82 h';
  }
  function runCamp() {
    if (campRaf) cancelAnimationFrame(campRaf);
    var start = 0, DUR = 9000;
    var step = function (ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / DUR, 1);
      campDone = Math.round(p * 1200); drawCamp(campDone);
      if (p < 1) campRaf = requestAnimationFrame(step); else campRaf = 0;
    };
    campRaf = requestAnimationFrame(step);
  }
  if (campCv) {
    if (!CAPS.canvas) CAPS.fallback(campCv, 'A grade das 1.200 capturas usa Canvas 2D. Os totais da campanha estão ao lado.');
    else if (CAPS.animate) {
      drawCamp(0);
      onView(campCv, runCamp);
      $('#campRun').addEventListener('click', runCamp);
    } else {
      campDone = 1200; drawCamp(1200);
      var rb = $('#campRun'); if (rb) rb.hidden = true;
    }
  }

  /* ---------- Abas das frentes ---------- */
  var tabs = $$('.tabs [role=tab]');
  function selectTab(t) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute('aria-selected', on ? 'true' : 'false');
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    });
    if (t.id === 'tab-a') drawRtt();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); selectTab(n); e.preventDefault(); }
    });
  });

  /* ---------- Frente A: portabilidade e RTT ---------- */
  var K8S = [
    [30, 'Tráfego observado via Service', '--f7'],
    [13, 'Observado via endereço direto do pod', '--f5'],
    [6, 'Observado via pod observador (ponte L2)', '--f1'],
    [2, 'Não encaminhado pela ponte (802.1D, esperado)', '--f2'],
    [3, 'Descartado por ctstate INVALID', '--f3'],
    [2, 'Não observado no alvo, causa em aberto', '--f6'],
    [3, 'Inconclusivo (ferramenta ou contêiner)', '--ink-3'],
    [1, 'Não executado (política de segurança)', '--rule']
  ];
  var stack = $('#k8sStack'), legend = $('#k8sLegend');
  if (stack) K8S.forEach(function (k) {
    var d = el('div'); d.style.flexGrow = k[0]; d.style.background = 'var(' + k[2] + ')'; d.title = k[0] + ': ' + k[1];
    stack.appendChild(d);
    var li = el('li', null, '<i></i><b>' + k[0] + '</b>'); li.style.setProperty('--c', 'var(' + k[2] + ')');
    li.appendChild(document.createTextNode(k[1])); legend.appendChild(li);
  });

  var RTTS = [3, 30, 99, 173], rttCv = $('#rttCanvas'), rttRange = $('#rttRange'), rttRaf = 0, rttIdx = 1;
  function rttCmd(v) {
    var half = (v / 2).toString().replace('.', ',');
    $('#rttOut').textContent = v + ' ms';
    $('#rttCmd').textContent = '# metade do RTT em cada pod (' + half + ' ms)\ntc qdisc add dev eth0 root netem delay ' + (v / 2) + 'ms';
  }
  function drawRtt() {
    if (!rttCv || !CAPS.canvas || rttCv.offsetParent === null) return;
    if (rttRaf) cancelAnimationFrame(rttRaf);
    var v = RTTS[rttIdx];
    var ink = cssVar('--ink', '#14232D'), ink3 = cssVar('--ink-3', '#74848E'), sig = cssVar('--signal', '#E2A019');
    var frame = function (ts) {
      var g = setupCanvas(rttCv), c = g.c, w = g.w, h = g.h, m = h / 2;
      c.clearRect(0, 0, w, h);
      c.strokeStyle = ink3; c.lineWidth = 1.5; c.beginPath(); c.moveTo(70, m); c.lineTo(w - 70, m); c.stroke();
      c.font = '600 12px Archivo, sans-serif'; c.textAlign = 'center';
      [[40, 'pod A'], [w - 40, 'pod B']].forEach(function (p) {
        c.strokeStyle = ink; c.lineWidth = 2; c.strokeRect(p[0] - 30, m - 20, 60, 40);
        c.fillStyle = ink; c.fillText(p[1], p[0], m + 4);
      });
      // ida e volta: a duração visual cresce com o RTT emulado (escala 1 ms = 12 ms de animação)
      var dur = Math.max(v * 12, 220), ph = ((ts || 0) % (dur + 400)) / dur;
      if (ph <= 1) {
        var go = ph < .5, q = go ? ph * 2 : (1 - ph) * 2, px = 70 + q * (w - 140);
        c.fillStyle = sig; c.beginPath(); c.arc(px, m, 6, 0, Math.PI * 2); c.fill();
        c.fillStyle = ink3; c.fillText(go ? 'requisição' : 'resposta', px, m - 12);
      }
      if (CAPS.animate) rttRaf = requestAnimationFrame(frame);
    };
    if (CAPS.raf) rttRaf = requestAnimationFrame(frame); else frame(0);
  }
  if (rttRange) {
    rttCmd(RTTS[rttIdx]);
    rttRange.addEventListener('input', function () { rttIdx = +rttRange.value; rttCmd(RTTS[rttIdx]); drawRtt(); });
    if (!CAPS.canvas) CAPS.fallback(rttCv, 'A demonstração de ida e volta usa Canvas 2D; o comando equivalente aparece abaixo.');
    else drawRtt();
  }

  /* ---------- Frente B: funil e desfechos ---------- */
  var funnel = $('#funnel');
  if (funnel) {
    var FN = [[5399390, 'pacotes reproduzidos'], [7023313, 'eventos registrados pelos motores'], [671, 'candidatos a detecção'], [3, 'detecções (2 específicas, 1 genérica)']];
    var maxV = 7023313, fb = [];
    FN.forEach(function (f) {
      var row = el('div', 'fn-row'), bar = el('div', 'fn-bar'), tx = el('div', 'fn-txt', '<b>' + fmt(f[0]) + '</b> ' + f[1]);
      var pct = Math.max(f[0] / maxV * 100, 1.2);
      if (pct < 40) { row.classList.add('small'); tx.style.setProperty('--off', 'calc(' + pct + '% + 6px)'); }
      row.appendChild(bar); row.appendChild(tx); funnel.appendChild(row); fb.push([bar, pct]);
    });
    var growF = function () { fb.forEach(function (b) { b[0].style.width = b[1] + '%'; }); };
    if (CAPS.animate) onView(funnel, growF); else growF();
  }
  var outcomes = $('#outcomes');
  if (outcomes) {
    var OC = [[2, 'Detecção específica', '--ok'], [1, 'Detecção genérica relacionada', '--f1'], [3, 'Alerta não relacionado', '--signal'], [30, 'Somente visibilidade', '--rule'], [0, 'Ausência de evidência', '--ink']];
    OC.forEach(function (o) { for (var i = 0; i < o[0]; i++) { var d = el('div', 'cell'); d.style.background = 'var(' + o[2] + ')'; d.title = o[1]; outcomes.appendChild(d); } });
    var lg = el('ul', 'legend outcomes-legend');
    OC.forEach(function (o) { var li = el('li', null, '<i></i><b>' + o[0] + '</b>'); li.style.setProperty('--c', 'var(' + o[2] + ')'); li.appendChild(document.createTextNode(o[1])); lg.appendChild(li); });
    outcomes.appendChild(lg);
  }

  /* ---------- Frente C: cobertura por família ---------- */
  var cov = $('#coverage');
  if (cov) {
    var CV = [[1, 27, 21, 21], [2, 24, 0, 0], [3, 30, 0, 0], [4, 6, 6, 6], [5, 6, 0, 0], [6, 24, 22, 22], [7, 63, 14, 10]];
    var cb = [];
    CV.forEach(function (r) {
      var row = el('div', 'cov-row'), nm = el('span', 'cov-name'); nm.textContent = FAMS[r[0]].n;
      var bx = el('div', 'cov-bars'); bx.style.setProperty('--c', 'var(' + FAMS[r[0]].v + ')');
      var t = el('span', 't'), e = el('span', 'e'), a = el('span', 'a'), lab = el('em', null, r[3] + ' de ' + r[1]);
      bx.appendChild(t); bx.appendChild(e); bx.appendChild(a); bx.appendChild(lab);
      row.appendChild(nm); row.appendChild(bx); cov.appendChild(row);
      cb.push([t, r[1]], [e, r[2]], [a, r[3]]);
    });
    cov.appendChild(el('div', 'cov-key', '<span><i style="height:10px;background:var(--rule)"></i>possíveis</span><span><i style="height:6px"></i>elegíveis</span><span><i style="height:6px;background:var(--ink)"></i>analisáveis</span>'));
    var growC = function () { cb.forEach(function (x) { x[0].style.width = (x[1] / 63 * 88) + '%'; }); };
    if (CAPS.animate) onView(cov, growC); else growC();
  }

  /* ---------- Cronograma: marcador de hoje ---------- */
  var today = $('#tlToday');
  if (today) {
    var a0 = new Date(2026, 8, 30).getTime(), a1 = new Date(2026, 11, 31).getTime(), now = Date.now();
    var p = Math.min(Math.max((now - a0) / (a1 - a0), 0), 1);
    today.style.left = (p * 100) + '%';
    if (now < a0 || now > a1) today.hidden = true;
    var marks = [new Date(2026, 8, 30), new Date(2026, 9, 31), new Date(2026, 10, 30), new Date(2026, 11, 31)];
    $$('.tl-marks li').forEach(function (li, i) { if (marks[i] && now > marks[i].getTime() + 864e5) li.classList.add('past'); });
  }

  function redrawAll() {
    if (!CAPS.canvas) return;
    drawSim();
    if (campCv && !campRaf) drawCamp(campDone);
    drawRtt();
  }
  var rt = 0;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(redrawAll, 150); });
})();
