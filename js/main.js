// TRGVC site interactions
(() => {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const mobileQuery = window.matchMedia('(max-width: 720px)');

  const setMenu = (open) => {
    if (!toggle || !links) return;
    links.classList.toggle('open', open);
    toggle.classList.toggle('active', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    document.body.classList.toggle('menu-open', open && mobileQuery.matches);
  };

  if (toggle && links) {
    toggle.addEventListener('click', () => setMenu(!links.classList.contains('open')));

    links.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenu(false));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && links.classList.contains('open')) {
        setMenu(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (!mobileQuery.matches || !links.classList.contains('open')) return;
      if (!links.contains(event.target) && !toggle.contains(event.target)) setMenu(false);
    });

    mobileQuery.addEventListener?.('change', () => setMenu(false));
  }

  const updateNav = () => nav?.classList.toggle('scrolled', window.scrollY > 36);
  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });

  // Reveal content only when motion is allowed.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // Highlight the active primary section in the desktop navigation.
  if ('IntersectionObserver' in window && links) {
    const navAnchors = [...links.querySelectorAll('a[href^="#"]')];
    const sections = navAnchors
      .map((anchor) => document.querySelector(anchor.getAttribute('href')))
      .filter(Boolean);

    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;
      navAnchors.forEach((anchor) => {
        anchor.classList.toggle('active', anchor.getAttribute('href') === `#${visible.target.id}`);
      });
    }, { rootMargin: '-25% 0px -55% 0px', threshold: [0.02, 0.15, 0.3] });

    sections.forEach((section) => sectionObserver.observe(section));
  }
})();
