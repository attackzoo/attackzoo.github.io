/* Detecção dos recursos do navegador usados pelas animações e gráficos.
   Roda antes de qualquer animação; se faltar algo, avisa o visitante. */
(function () {
  'use strict';
  function supportsCss(prop, val) {
    try { return !!(window.CSS && CSS.supports && CSS.supports(prop, val)); } catch (e) { return false; }
  }
  function hasCanvas2d() {
    try { var c = document.createElement('canvas'); return !!(c.getContext && c.getContext('2d')); } catch (e) { return false; }
  }
  function prefersReduced() {
    try { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  var caps = {
    canvas: hasCanvas2d(),
    raf: typeof window.requestAnimationFrame === 'function',
    observer: typeof window.IntersectionObserver === 'function',
    cssVars: supportsCss('color', 'var(--x)'),
    colorMix: supportsCss('color', 'color-mix(in srgb, red 50%, blue)'),
    reducedMotion: prefersReduced()
  };
  // Animação só quando há canvas, quadro de animação e o visitante não pediu menos movimento
  caps.animate = caps.canvas && caps.raf && !caps.reducedMotion;
  window.AZ_CAPS = caps;

  var missing = [];
  if (!caps.canvas) missing.push('<strong>Canvas 2D</strong> indisponível: o gráfico do experimento, a grade da campanha e a demonstração de latência não serão desenhados.');
  if (!caps.raf) missing.push('<strong>requestAnimationFrame</strong> indisponível: as animações ficam desligadas e os gráficos aparecem já no estado final.');
  if (!caps.observer) missing.push('<strong>IntersectionObserver</strong> indisponível: as animações não esperam a rolagem e começam assim que a página carrega.');
  if (!caps.cssVars) missing.push('<strong>Variáveis CSS</strong> não suportadas: cores e tema escuro podem aparecer incorretos.');
  if (!caps.colorMix) missing.push('<strong>color-mix</strong> não suportado: alguns tons de destaque usam uma cor alternativa.');

  var notes = [];
  if (caps.reducedMotion) notes.push('Seu sistema pede <strong>movimento reduzido</strong>: as animações foram desligadas e os gráficos aparecem no estado final.');

  function show() {
    var el = document.getElementById('capsBanner');
    if (!el || (!missing.length && !notes.length)) return;
    var dismissed = false;
    try { dismissed = sessionStorage.getItem('az-caps-ok') === '1'; } catch (e) {}
    if (dismissed && !missing.length) return;
    var html = '<div class="wrap"><div class="caps-text">';
    if (missing.length) {
      html += '<strong>Seu navegador não tem todos os recursos usados neste site.</strong> O texto continua completo, mas:<ul><li>' + missing.join('</li><li>') + '</li></ul>';
      html += 'Para a experiência completa, use uma versão recente do Firefox, Chrome, Edge ou Safari.';
      if (notes.length) html += '<br>' + notes.join(' ');
    } else {
      html += notes.join(' ');
    }
    html += '</div><button type="button" id="capsClose">Entendi</button></div>';
    el.innerHTML = html;
    el.hidden = false;
    document.getElementById('capsClose').addEventListener('click', function () {
      el.hidden = true;
      try { sessionStorage.setItem('az-caps-ok', '1'); } catch (e) {}
    });
  }

  /* Substitui uma figura por uma explicação quando o recurso necessário falta. */
  caps.fallback = function (node, what) {
    if (!node) return;
    var box = document.createElement('div');
    box.className = 'caps-fallback';
    box.setAttribute('role', 'note');
    box.innerHTML = '<strong>Esta figura não pode ser exibida neste navegador.</strong> ' + what;
    node.replaceWith(box);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
})();
