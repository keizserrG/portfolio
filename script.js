const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
   Audio: fixed default volume, starts on first click
   ============================ */
const audio = document.getElementById('bg-music');
if (audio) {
  audio.volume = 0.5;
  const startMusicOnClick = () => {
    audio.play()
      .then(() => document.removeEventListener('click', startMusicOnClick))
      .catch(() => { /* blocked or file missing — retry on next click */ });
  };
  document.addEventListener('click', startMusicOnClick);
}

/* ============================
   Toast helper
   ============================ */
const toast = document.getElementById('toast');
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ============================
   Socials: copy Discord tag on click
   ============================ */
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
   Text splitting for the hero and About transitions
   ============================ */
// Hero: every character in its own span, numbered for the stagger.
document.querySelectorAll('[data-split]').forEach((line) => {
  const text = line.textContent.trim();
  line.textContent = '';
  [...text].forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.style.setProperty('--ci', i);
    span.textContent = ch;
    line.appendChild(span);
  });
});

// About: every word in its own span; spaces stay as text so lines wrap naturally.
document.querySelectorAll('[data-words]').forEach((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = 'w';
    span.style.setProperty('--wi', i);
    span.textContent = word;
    el.appendChild(span);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
});

/* ============================
   Replaying transitions
   Every section (hero included) plays its entrance each time it
   scrolls into view, and resets once it has fully left the screen.
   Resetting only at 0% visible means the reverse never plays where
   the user can see it, and a section half on screen never flickers.
   ============================ */
const hero = document.querySelector('.hero');
const ENTER_AT = 0.25;

function watchReplay(el, className, enterAt) {
  new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        // Tall sections on small screens never reach the ratio, so half a
        // screen of the section showing counts as "in view" too.
        const fillsScreen = entry.intersectionRect.height >= window.innerHeight * 0.5;
        if (entry.intersectionRatio >= enterAt || fillsScreen) {
          entry.target.classList.add(className);
        } else if (!entry.isIntersecting) {
          entry.target.classList.remove(className);
        }
      });
    },
    { threshold: [0, enterAt, 0.5, 0.75, 1] }
  ).observe(el);
}

// Hero waits for the fonts first so the letter masks line up.
const startHero = () => requestAnimationFrame(() => watchReplay(hero, 'ready', 0.1));
if (document.fonts && document.fonts.ready) {
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]).then(startHero);
} else {
  startHero();
}

document.querySelectorAll('.reveal').forEach((el) => watchReplay(el, 'in-view', ENTER_AT));

/* ============================
   Nav: highlight the section in view
   ============================ */
const navLinks = document.querySelectorAll('nav a[data-nav]');
const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((l) => {
        l.classList.toggle('active', l.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  },
  { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
);
navLinks.forEach((link) => {
  const section = document.querySelector(link.getAttribute('href'));
  if (section) navObserver.observe(section);
});
// Clear the highlight when back at the top.
new IntersectionObserver(
  ([entry]) => { if (entry.isIntersecting) navLinks.forEach((l) => l.classList.remove('active')); },
  { rootMargin: '-45% 0px -50% 0px' }
).observe(hero);

/* ============================
   Scroll: progress bar, header background, hero video fade
   ============================ */
const header = document.querySelector('.site-header');
const progress = document.querySelector('.progress');
const heroMedia = document.querySelector('.hero-media');
let ticking = false;

function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
  header.classList.toggle('scrolled', y > 24);

  if (!prefersReducedMotion && heroMedia) {
    const t = Math.min(y / hero.offsetHeight, 1);
    heroMedia.style.setProperty('--media-o', (1 - t * 0.9).toFixed(3));
    heroMedia.style.setProperty('--media-s', (1 + t * 0.08).toFixed(3));
  }
  ticking = false;
}
window.addEventListener('scroll', () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(onScroll);
  }
}, { passive: true });
onScroll();

/* ============================
   Footer year
   ============================ */
document.getElementById('year').textContent = new Date().getFullYear();
