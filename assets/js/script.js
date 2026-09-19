const header = document.querySelector('[data-header]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');
const year = document.getElementById('year');

if (year) year.textContent = new Date().getFullYear();

const syncHeader = () => header?.classList.toggle('scrolled', window.scrollY > 12);
syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const canTilt = window.matchMedia('(hover:hover) and (pointer:fine)').matches &&
                !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canTilt) {
  document.querySelectorAll('.album-tilt').forEach(card => {
    const visual = card.querySelector('.album-visual');
    if (!visual) return;

    card.addEventListener('pointermove', event => {
      const rect = visual.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      const px = x / rect.width;
      const py = y / rect.height;

      const rotateY = (px - 0.5) * 10;
      const rotateX = (0.5 - py) * 10;

      visual.style.setProperty('--rx', `${rotateX.toFixed(2)}deg`);
      visual.style.setProperty('--ry', `${rotateY.toFixed(2)}deg`);
      visual.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      visual.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    });

    card.addEventListener('pointerleave', () => {
      visual.style.setProperty('--rx', '0deg');
      visual.style.setProperty('--ry', '0deg');
      visual.style.setProperty('--mx', '50%');
      visual.style.setProperty('--my', '50%');
    });
  });
}
