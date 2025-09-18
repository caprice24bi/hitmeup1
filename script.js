/* script.js
 - Mic detection to 'blow out' the flame
 - Click/cursor support if mic unavailable or user prefers
 - Confetti from top, balloons from bottom, popup semi-transparent
 - Flame is the only animated part; candle stays fixed
*/

const flame = document.getElementById('flame');
const popup = document.getElementById('popup');
let celebrationPlayed = false;

// Utility: show popup (semi-transparent) and spawn confetti/balloons
function showCelebration() {
  if (celebrationPlayed) return;
  celebrationPlayed = true;

  // Show popup briefly (then hide after some seconds)
  popup.style.display = 'block';
  popup.style.opacity = '0';
  popup.animate([{opacity:0},{opacity:1}], {duration:300, fill:'forwards'});

  // Create confetti (from top)
  const confettiColors = ['#fcd6e3','#b4d9f7','#f8c3c1','#d7f9f1','#ffe9b8'];
  for (let i=0;i<36;i++){
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random()*100 + 'vw';
    c.style.background = confettiColors[Math.floor(Math.random()*confettiColors.length)];
    const size = 6 + Math.random()*12;
    c.style.width = size + 'px';
    c.style.height = (size + Math.random()*6) + 'px';
    // random rotation + fall duration
    const dur = 1800 + Math.random()*2600;
    c.style.transition = `transform ${dur}ms linear, top ${dur}ms linear, opacity 400ms ease`;
    document.body.appendChild(c);

    // start position slightly above viewport
    requestAnimationFrame(()=>{
      c.style.top = (window.innerHeight + 60) + 'px';
      c.style.transform = `rotate(${Math.random()*720 - 360}deg) translateY(0)`;
    });
    // remove later
    setTimeout(()=> c.remove(), dur+400);
  }

  // Create balloons (from bottom)
  const balloonColors = ['#fcd6e3','#b4d9f7','#f8c3c1','#d7f9f1'];
  for (let i=0;i<8;i++){
    const b = document.createElement('div');
    b.className = 'balloon';
    b.style.left = (5 + Math.random()*90) + 'vw';
    b.style.background = balloonColors[Math.floor(Math.random()*balloonColors.length)];
    // random float duration and x drift
    const dur = 4200 + Math.random()*2800;
    b.style.transition = `transform ${dur}ms cubic-bezier(.2,.9,.2,1), bottom ${dur}ms linear, opacity 600ms linear`;
    document.body.appendChild(b);

    // animate upward with slight horizontal drift
    requestAnimationFrame(()=>{
      b.style.bottom = (window.innerHeight + 100) + 'px';
      const drift = (Math.random()*160 - 80);
      b.style.transform = `translateX(${drift}px)`;
    });
    setTimeout(()=> b.remove(), dur+600);
  }

  // Hide popup after 4s
  setTimeout(()=>{
    popup.animate([{opacity:1},{opacity:0}],{duration:400,fill:'forwards'})
      .onfinish = () => popup.style.display = 'none';
  }, 3800);
}

/* Blow out function: hides flame and triggers celebration */
function blowOut() {
  if (flame.dataset.out === 'true') return;
  flame.style.display = 'none';
  flame.dataset.out = 'true';
  showCelebration();
}

/* Click/cursor accessibility */
flame.addEventListener('click', blowOut);
flame.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter' || e.key === ' ') {
    blowOut();
    e.preventDefault();
  }
});

/* Microphone detection: listen for short, loud burst -> blow out
   - If permission denied or not supported, we fall back to click only.
   - Sensitivity tuned to be fairly easy to trigger; if too sensitive you can adjust threshold.
*/
function initMicBlow() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    // no mic support
    return;
  }

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      let lastBlow = 0;
      function check() {
        analyser.getByteFrequencyData(data);
        // root mean square like volume estimate:
        let sum = 0;
        for (let i=0;i<data.length;i++){
          const v = data[i];
          sum += v*v;
        }
        const rms = Math.sqrt(sum / data.length);

        // threshold: tune if too sensitive (lower = easier to trigger)
        const THRESH = 22; // try 22; increase if false positives

        // Only accept as blow if short burst and not too frequent
        const now = Date.now();
        if (rms > THRESH && (now - lastBlow > 800)) {
          lastBlow = now;
          // simple debounce: require a short burst sequence (simulate breath)
          // check next few frames quickly
          let count = 0;
          const frames = 6;
          const sampleInterval = 40;
          let checks = 0;
          const intervalId = setInterval(()=>{
            analyser.getByteFrequencyData(data);
            let s = 0;
            for (let i=0;i<data.length;i++){ s += data[i]; }
            const vol = s / data.length;
            if (vol > THRESH) count++;
            checks++;
            if (checks >= frames) {
              clearInterval(intervalId);
              if (count >= Math.floor(frames * 0.4)) { // enough frames above threshold
                blowOut();
              }
            }
          }, sampleInterval);
        }

        if (!flame.dataset.out) requestAnimationFrame(check);
      }
      requestAnimationFrame(check);
    })
    .catch(err => {
      // user denied mic or error: fallback to click-only; optionally show small note
      console.warn('Mic tidak tersedia atau akses ditolak:', err);
    });
}

// Init
initMicBlow();
