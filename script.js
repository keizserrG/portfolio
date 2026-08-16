const audio = document.getElementById('bg-music');
const muteBtn = document.getElementById('mute-btn');
const volumeSlider = document.getElementById('volume-slider');

audio.volume = volumeSlider.value; // set initial volume to match slider

// start playing music on first click anywhere (excluding the volume control itself)
document.addEventListener('click', (event) => {
  if (audio.paused && !event.target.closest('.volume-control')) {
    audio.play();
  }
}, { once: true });

// mute/unmute button
muteBtn.addEventListener('click', () => {
  audio.muted = !audio.muted;
  muteBtn.textContent = audio.muted ? '🔇' : '🔊';
});

// volume slider
volumeSlider.addEventListener('input', () => {
  audio.volume = volumeSlider.value;

  if (volumeSlider.value > 0 &&
