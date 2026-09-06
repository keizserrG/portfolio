const audio = document.getElementById('bg-music');
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
   Audio: fixed default volume
   ============================ */
audio.volume = 0.5;

/* start playing music on the first click anywhere on the page.
   Keeps listening until playback actually starts. */
function startMusicOnClick() {
  audio.play()
    .then(() => document.removeEventListener('click', startMusicOnClick))
    .catch((err) => console.warn('Autoplay blocked, will retry on next click:', err));
}
document.addEventListener('click', startMusicOnClick);

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
      showToast(`Discord tag "${value}" copied to clipboard`);
    } catch {
      showToast('Could not copy — copy it manually: ' + value);
    }
  });
});

/* ============================
   Hero: typing effect
   ============================ */
const typedEl = document.querySelector('.typed-target');
if (typedEl) {
  const fullText = typedEl.dataset.text || typedEl.textContent;

  if (prefersReducedMotion) {
    typedEl.textContent = fullText;
    typedEl.classList.add('done');
  } else {
    typedEl.textContent = '';
    let i = 0;
    const type = () => {
      if (i <= fullText.length) {
        typedEl.textContent = fullText.slice(0, i);
        i++;
        setTimeout(type, 45);
      } else {
        typedEl.classList.add('done');
      }
    };
    setTimeout(type, 300);
  }
}

/* ============================
   Nav: highlight active section on scroll
   ============================ */
const navLinks = document.querySelectorAll('nav a[data-nav]');
const sections = Array.from(navLinks)
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const id = `#${entry.target.id}`;
      const link = document.querySelector(`nav a[href="${id}"]`);
      if (!link) return;
      if (entry.isIntersecting) {
        navLinks.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  },
  { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
);
sections.forEach((section) => navObserver.observe(section));

/* ============================
   Sections: fade in/out as they enter/leave view
   ============================ */
const fadeEls = document.querySelectorAll('.fade-section');
const fadeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('in-view', entry.isIntersecting);
    });
  },
  { threshold: 0.3, rootMargin: '0px 0px -10% 0px' }
);
fadeEls.forEach((el) => fadeObserver.observe(el));
