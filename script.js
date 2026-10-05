/* ============================================================
   Motion modelled on abatable.com: GSAP + ScrollTrigger + SplitText,
   Lenis smooth scrolling and the same custom "osmo" ease, intro
   sequence, character/scale reveals, image wipes and parallax.
   Reveals replay every time a section comes back into view.
   ============================================================ */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGsap = !!(window.gsap && window.ScrollTrigger && window.SplitText && window.CustomEase && window.Lenis);
const animate = hasGsap && !prefersReducedMotion;

const preloader = document.querySelector('[data-preloader]');
const header = document.querySelector('[data-nav-bar]');

/* ============================
   Background video: forced autoplay
   The HTML autoplay attribute alone is unreliable inside
   Facebook/Instagram in-app browsers and some mobile WebViews —
   they often ignore it or pause it mid-handoff. This forces
   play() at every point where it's likely to have been blocked
   or interrupted, and mutes via JS as a backup to the attribute.
   ============================ */
const bgVideo = document.getElementById('bg-video');

if (bgVideo) {
  bgVideo.muted = true;
  bgVideo.defaultMuted = true;
  bgVideo.playsInline = true;

  const tryPlayVideo = () => {
    const playPromise = bgVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Blocked for now — one of the listeners below will retry.
      });
    }
  };

  tryPlayVideo();

  ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'].forEach((evt) => {
    bgVideo.addEventListener(evt, tryPlayVideo);
  });

  // In-app browsers (FB/IG) sometimes pause the video during the
  // redirect/handoff — resume once the page is actually visible.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && bgVideo.paused) tryPlayVideo();
  });
  window.addEventListener('pageshow', () => {
    if (bgVideo.paused) tryPlayVideo();
  });

  // Last resort: a few WebViews only unlock playback after a gesture,
  // even when muted. Catch the very first touch/click/scroll.
  const gestureEvents = ['touchstart', 'click', 'scroll'];
  const resumeOnGesture = () => {
    if (bgVideo.paused) tryPlayVideo();
    gestureEvents.forEach((evt) => document.removeEventListener(evt, resumeOnGesture));
  };
  gestureEvents.forEach((evt) => document.addEventListener(evt, resumeOnGesture, { passive: true }));
}

/* ============================
   Toast + copy Discord tag
   ============================ */
const toast = document.getElementById('toast');
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

document.querySelectorAll('.copy-link').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const value = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
      showToast(`Discord tag "${value}" copied`);
    } catch {
      showToast('Could not copy — copy it manually: ' + value);
    }
  });
});

/* ============================
   Button / link character roll (pure CSS once split)
   ============================ */
document.querySelectorAll('[data-button-animate-chars]').forEach((el) => {
  const text = el.textContent;
  el.setAttribute('aria-label', text);
  el.textContent = '';
  [...text].forEach((char, i) => {
    const span = document.createElement('span');
    span.setAttribute('aria-hidden', 'true');
    span.textContent = char === ' ' ? ' ' : char;
    span.style.transitionDelay = `${i * 0.018}s`;
    el.appendChild(span);
  });
});

/* ============================
   Nav: highlight the section in view
   ============================ */
const navLinks = document.querySelectorAll('nav a[data-nav]');
const hero = document.querySelector('[data-hero]');
const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach((l) => l.classList.toggle('active', id !== 'hero' && l.getAttribute('href') === `#${id}`));
    });
  },
  { rootMargin: '-45% 0px -50% 0px' }
);
[hero, ...Array.from(navLinks, (l) => document.querySelector(l.getAttribute('href')))]
  .filter(Boolean)
  .forEach((s) => navObserver.observe(s));

function updateHeader(y) {
  header.classList.toggle('scrolled', y > 24);
}

document.getElementById('year').textContent = new Date().getFullYear();

/* ============================================================
   No GSAP (CDN blocked) or reduced motion: static page.
   ============================================================ */
if (!animate) {
  if (preloader) preloader.remove();
  window.addEventListener('scroll', () => updateHeader(window.scrollY), { passive: true });
  updateHeader(window.scrollY);
} else {
  const ready = document.fonts && document.fonts.ready
    ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))])
    : Promise.resolve();
  ready.then(initMotion);
}

function initMotion() {
  gsap.registerPlugin(CustomEase, ScrollTrigger, SplitText);
  CustomEase.create('osmo', '0.625, 0.05, 0, 1');
  gsap.defaults({ ease: 'osmo', duration: 1 });

  /* ---------- Lenis smooth scroll ---------- */
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  lenis.on('scroll', ({ scroll }) => updateHeader(scroll));
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  updateHeader(window.scrollY);

  // In-page links glide with Lenis instead of jumping.
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : document.querySelector(id);
      if (target === null) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    });
  });

  /* ---------- Hero ---------- */
  const heroBG = hero.querySelector('[data-hero-bg]');
  const heroHeading = hero.querySelector('[data-hero-heading]');
  const heroParagraph = hero.querySelector('[data-hero-paragraph]');
  const heroFades = hero.querySelectorAll('[data-hero-fade]');
  const heroLine = hero.querySelector('[data-hero-line]');
  const heroSplit = SplitText.create(heroHeading, { type: 'chars, words', charsClass: 'char-mask', wordsClass: 'word-mask' });

  // The hero's own reveal, used by the intro and on every return to the top.
  // fromTo (not to) so a replay timeline built while the hero is already
  // visible still knows its hidden starting point.
  function heroReveal(tl, at) {
    return tl
      .fromTo(heroLine, { scaleX: 0 }, { scaleX: 1, duration: 1.75 }, at)
      .fromTo(heroSplit.chars, { opacity: 0 },
        { opacity: 1, duration: 0.5, stagger: { each: 0.03, from: 'start' }, ease: 'none' }, '<0.5')
      .fromTo(heroParagraph, { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' }, '<0.4')
      .fromTo(heroFades, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, '<0.4');
  }

  /* ---------- Intro (full sequence once per browser session) ---------- */
  let seenIntro = false;
  try { seenIntro = sessionStorage.getItem('cdg-intro') === '1'; } catch { /* storage blocked */ }

  const intro = gsap.timeline({
    onComplete: () => {
      if (preloader) preloader.remove();
      lenis.start();
      try { sessionStorage.setItem('cdg-intro', '1'); } catch { /* storage blocked */ }
      setupHeroReplay();
      ScrollTrigger.refresh();
    },
  });

  // Sections and parallax are wired up straight away: under the intro curtain
  // nothing shows, and after a mid-page reload nothing flashes.
  setupReveals();
  setupParallax();

  if (!seenIntro && preloader && window.scrollY < 10) {
    lenis.stop();
    const bg = preloader.querySelector('[data-preloader-bg]');
    const bgImage = preloader.querySelector('[data-preloader-bg-image]');
    const logo = preloader.querySelector('[data-preloader-logo]');

    intro
      .set([logo, bg], { autoAlpha: 1 }, 0)
      .from(bgImage, { scale: 1.125, duration: 3, ease: 'none' })
      .fromTo(bg,
        { clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)', scale: 1.1 },
        { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', scale: 1, duration: 1.5 }, '<')
      .fromTo(logo,
        { clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)', scale: 1.1 },
        { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', scale: 1, duration: 1.25, ease: 'expo.out' }, '<0.5')
      .to(logo, { clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)', scale: 1.1, duration: 1.5 }, '>')
      .fromTo(preloader,
        { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' },
        { clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)', duration: 1.5 }, '<')
      .from(heroBG, { scale: 1.25, duration: 2.75, ease: 'expo.out' }, '<')
      .from(header, { yPercent: -125, duration: 1.5, ease: 'expo.out', clearProps: 'transform' }, '<1');
    heroReveal(intro, '<');
  } else {
    // Repeat visit in this session, or reloaded mid-page: skip the curtain.
    if (preloader) preloader.remove();
    intro
      .from(heroBG, { scale: 1.25, duration: 2.75, ease: 'expo.out' }, 0)
      .from(header, { yPercent: -125, duration: 1.5, ease: 'expo.out', clearProps: 'transform' }, 0.2);
    heroReveal(intro, 0.2);
  }

  /* ---------- Replay helper ----------
     Plays `tl` when the trigger reaches 80% of the viewport (from either
     direction) and rewinds it only once the trigger is fully off screen,
     so the reset itself is never visible. */
  function replayOnView(trigger, tl, start = 'top 80%', end = 'bottom 20%') {
    ScrollTrigger.create({
      trigger, start, end,
      onEnter: () => tl.play(),
      onEnterBack: () => tl.play(),
    });
    ScrollTrigger.create({
      trigger, start: 'top bottom', end: 'bottom top',
      onLeave: () => tl.pause(0),
      onLeaveBack: () => tl.pause(0),
    });
  }

  function setupHeroReplay() {
    const tl = heroReveal(gsap.timeline({ paused: true }), 0);
    tl.progress(1); // the intro already showed it
    ScrollTrigger.create({
      trigger: hero, start: 'top bottom', end: 'bottom top',
      onEnterBack: () => tl.restart(),
      onLeave: () => tl.pause(0),
    });
  }

  /* ---------- Section reveals (abatable's data-reveal-content) ---------- */
  function setupReveals() {
    document.querySelectorAll('[data-reveal-content="component"]').forEach((component) => {
      const headings = component.querySelectorAll('[data-reveal-content="heading"]');
      const paragraphs = component.querySelectorAll('[data-reveal-content="paragraph"]');
      const fades = component.querySelectorAll('[data-reveal-content="fade"]');
      const images = component.querySelectorAll('[data-reveal-content="image"]');
      const tl = gsap.timeline({ paused: true });

      // Images: wipe up from the bottom edge while settling from 110%.
      images.forEach((img) => {
        gsap.set(img, { clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)', scale: 1.1 });
        tl.to(img, { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', scale: 1, duration: 1.5 }, 0);
      });

      // Headings: characters fade in one after another.
      headings.forEach((heading) => {
        const split = SplitText.create(heading, { type: 'chars, words', charsClass: 'char-mask', wordsClass: 'word-mask' });
        gsap.set(split.chars, { opacity: 0 });
        tl.to(split.chars, { opacity: 1, duration: 0.5, stagger: { each: 0.03, from: 'start' }, ease: 'none' }, 0);
      });

      // Paragraphs: fade up from 90% scale.
      paragraphs.forEach((p) => {
        gsap.set(p, { opacity: 0, scale: 0.9 });
        tl.to(p, { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' }, 0.4);
      });

      // Everything else (labels, buttons): plain fade, last.
      if (fades.length) {
        gsap.set(fades, { autoAlpha: 0 });
        tl.to(fades, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, 0.8);
      }

      replayOnView(component, tl);
    });
  }

  /* ---------- Parallax (abatable's data-parallax) ---------- */
  function setupParallax() {
    document.querySelectorAll('[data-parallax="trigger"]').forEach((trigger) => {
      const target = trigger.querySelector('[data-parallax="target"]') || trigger;
      gsap.fromTo(target, { yPercent: -10 }, {
        yPercent: 10,
        ease: 'none',
        scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }
}
