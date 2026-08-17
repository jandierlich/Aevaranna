/* Verhindert Pinch-Zoom (Zwei-Finger-Aufziehen) zusätzlich zum viewport-Meta-Tag,
   da iOS Safari "user-scalable=no" allein oft ignoriert. */
document.addEventListener("touchmove", function (e) {
  if (e.touches && e.touches.length > 1) e.preventDefault();
}, { passive: false });

// Safari-spezifische Gesten-Events (Pinch außerhalb von touchmove erkennbar)
["gesturestart", "gesturechange", "gestureend"].forEach(function (ev) {
  document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false });
});

// Doppel-Tap-Zoom verhindern
let lastTouchEnd = 0;
document.addEventListener("touchend", function (e) {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
