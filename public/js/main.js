'use strict';

// --- Champ d'étoiles animé (effet hyperespace léger) ---
(function starfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stars = [];
  let w;
  let h;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round((w * h) / 5000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random() * 0.8 + 0.2,
      t: Math.random() * Math.PI * 2,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      s.t += 0.02 * s.z;
      if (!reduceMotion) {
        s.y += 0.06 * s.z;
        if (s.y > h) {
          s.y = 0;
          s.x = Math.random() * w;
        }
      }
      const alpha = 0.35 + 0.65 * Math.abs(Math.sin(s.t)) * s.z;
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      ctx.fillRect(s.x, s.y, s.z * 1.6, s.z * 1.6);
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => {
    resize();
    if (reduceMotion) draw();
  });
  resize();
  draw();
})();

// --- Menu mobile ---
(function nav() {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('main-nav');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
})();

// --- Confirmation avant les actions destructrices ---
document.addEventListener('submit', (e) => {
  const msg = e.target.getAttribute('data-confirm');
  if (msg && !window.confirm(msg)) e.preventDefault();
});

// --- Indicateur de robustesse du mot de passe ---
document.querySelectorAll('input[data-strength]').forEach((input) => {
  const bar = input.parentElement.querySelector('.strength span');
  if (!bar) return;
  const colors = ['#ff2b2b', '#ff8c1a', '#ffe81f', '#2ea8ff', '#3ddc84'];
  input.addEventListener('input', () => {
    const v = input.value;
    let score = 0;
    if (v.length >= 10) score++;
    if (v.length >= 14) score++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    bar.style.width = v ? `${Math.max(1, score) * 20}%` : '0';
    bar.style.background = colors[Math.max(0, score - 1)];
  });
});

// --- Aperçu Markdown dans l'éditeur ---
(function preview() {
  const tabs = document.querySelectorAll('.tab[data-tab]');
  const textarea = document.getElementById('content');
  const pane = document.querySelector('.preview');
  if (!tabs.length || !textarea || !pane) return;
  const csrf = textarea.form.querySelector('input[name="_csrf"]').value;

  tabs.forEach((tab) =>
    tab.addEventListener('click', async () => {
      tabs.forEach((t) => t.classList.toggle('active', t === tab));
      const showPreview = tab.dataset.tab === 'preview';
      textarea.hidden = showPreview;
      pane.hidden = !showPreview;
      if (!showPreview) return;
      pane.textContent = 'Transmission en cours…';
      try {
        const res = await fetch('/apercu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRF-Token': csrf },
          body: new URLSearchParams({ content: textarea.value }),
          credentials: 'same-origin',
        });
        if (!res.ok) throw new Error(res.statusText);
        // Le HTML renvoyé est déjà nettoyé côté serveur (sanitize-html).
        pane.innerHTML = (await res.text()) || '<p class="muted">Rien à afficher.</p>';
      } catch {
        pane.textContent = "Impossible de générer l'aperçu.";
      }
    })
  );
})();
