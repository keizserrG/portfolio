const audio = document.getElementById('bg-music');
const muteBtn = document.getElementById('mute-btn');
const volumeSlider = document.getElementById('volume-slider');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================
   Audio: initial volume
   ============================ */
audio.volume = Number(volumeSlider.value);

/* start playing music on the first click anywhere that isn't the volume control.
   Keeps listening until playback actually starts — a single {once:true} listener
   would burn itself out if the first click happened to land on the volume control. */
function startMusicOnClick(event) {
  if (event.target.closest('.volume-control')) return;
  audio.play()
    .then(() => document.removeEventListener('click', startMusicOnClick))
    .catch((err) => console.warn('Autoplay blocked, will retry on next click:', err));
}
document.addEventListener('click', startMusicOnClick);

/* mute/unmute button */
muteBtn.addEventListener('click', () => {
  audio.muted = !audio.muted;
  muteBtn.setAttribute('aria-pressed', audio.muted ? 'true' : 'false');
});

/* volume slider */
volumeSlider.addEventListener('input', () => {
  audio.volume = Number(volumeSlider.value);
  if (audio.volume > 0 && audio.muted) {
    audio.muted = false;
    muteBtn.setAttribute('aria-pressed', 'false');
  }
});

/* ============================
   Socials: copy Discord tag on click
   ============================ */
document.querySelectorAll('.copy-link').forEach((btn) => {
  const label = btn.querySelector('span:first-child');
  const arrow = btn.querySelector('.arrow-copy');
  const originalLabel = label.textContent;
  const originalArrow = arrow.textContent;

  btn.addEventListener('click', async () => {
    const value = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
      label.textContent = 'Copied!';
      arrow.textContent = '✓';
    } catch {
      label.textContent = value;
      arrow.textContent = '✓';
    }
    setTimeout(() => {
      label.textContent = originalLabel;
      arrow.textContent = originalArrow;
    }, 1500);
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
