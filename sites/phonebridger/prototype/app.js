(() => {
  const root = document.documentElement;
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  const header = document.querySelector('.site-header');
  const sectionLinks = [...nav.querySelectorAll('a[href^="#"]')];
  const navSections = sectionLinks.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
  const updateNavigation = () => {
    let current = navSections[0];
    for (const section of navSections) if (section.getBoundingClientRect().top <= 150) current = section;
    for (const link of sectionLinks) {
      if (link.hash === `#${current?.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };
  let previousScroll = Math.max(0, window.scrollY), scrollDistance = 0, scrollFrame = 0;
  const showHeader = () => header.classList.remove('header-hidden');
  const updateHeader = () => {
    scrollFrame = 0;
    const current = Math.max(0, Math.min(window.scrollY, document.documentElement.scrollHeight - window.innerHeight));
    const delta = current - previousScroll;
    previousScroll = current;
    updateNavigation();
    if (current <= header.offsetHeight || nav.classList.contains('open')) {
      scrollDistance = 0;
      showHeader();
      return;
    }
    if (!delta) return;
    if (Math.sign(delta) !== Math.sign(scrollDistance)) scrollDistance = 0;
    scrollDistance += delta;
    if (scrollDistance > 12) header.classList.add('header-hidden');
    else if (scrollDistance < -8) showHeader();
  };
  window.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateHeader);
  }, { passive: true });
  header.addEventListener('focusin', showHeader);
  header.addEventListener('keydown', showHeader);
  root.dataset.theme = 'dark';
  document.querySelector('meta[name="theme-color"]').content = '#101114';
  const closeMenu = () => {
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    menuButton.querySelector('use').setAttribute('href', '#i-menu');
  };
  menuButton.addEventListener('click', () => {
    showHeader();
    const open = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menuButton.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 700) closeMenu(); updateNavigation(); });
  const privacy = document.querySelector('.privacy-dialog');
  document.querySelector('[data-open-privacy]').addEventListener('click', () => privacy.showModal());
  document.querySelector('[data-close-privacy]').addEventListener('click', () => privacy.close());
  const revealDetail = id => {
    const target = document.getElementById(id);
    if (target?.matches('details')) target.open = true;
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) revealDetail(link.hash.slice(1));
  });
  window.addEventListener('hashchange', () => revealDetail(location.hash.slice(1)));
  revealDetail(location.hash.slice(1));
  updateNavigation();
})();
