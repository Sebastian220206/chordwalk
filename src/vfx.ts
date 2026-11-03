/**
 * VFX Module for Chordwalk
 * Handles mobile particle juice, praise callouts ("Sweet!", "Harmonic!"),
 * victory confetti, and tactile haptic feedback.
 * Automatically respects prefers-reduced-motion.
 */

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function tryVibrate(pattern: number | number[] = 12): void {
  if (prefersReducedMotion()) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Haptics unsupported or disabled
  }
}

/**
 * Spawns glowing sparkle particles and an expanding ripple around a tapped node or coordinate.
 */
export function spawnNodeSparkles(x: number, y: number, color = '#f59e0b'): void {
  if (prefersReducedMotion()) return;

  const container = document.body;
  const count = 9;

  // Expanding ring ripple
  const ripple = document.createElement('div');
  ripple.className = 'vfx-tap-ripple';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.borderColor = color;
  container.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);

  // Sparkle stars
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI + (Math.random() * 0.3 - 0.15);
    const distance = 24 + Math.random() * 32;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;

    const sparkle = document.createElement('div');
    sparkle.className = 'vfx-sparkle-particle';
    sparkle.style.left = `${x}px`;
    sparkle.style.top = `${y}px`;
    sparkle.style.setProperty('--dx', `${dx}px`);
    sparkle.style.setProperty('--dy', `${dy}px`);
    sparkle.style.backgroundColor = color;
    sparkle.style.boxShadow = `0 0 8px ${color}`;

    container.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 700);
  }
}

const PRAISE_WORDS = [
  'SWEET!',
  'HARMONIC!',
  'DELICIOUS!',
  'RESONANT!',
  'DIVINE!',
  'FLAWLESS!',
  'CHORD CRUSH!',
];

/**
 * Spawns a floating Candy Crush style praise badge near the given position or center screen.
 */
export function spawnPraiseCallout(
  text?: string,
  quality: 'major' | 'minor' | 'diminished' | 'augmented' | 'neutral' = 'major',
  x?: number,
  y?: number
): void {
  const chosenWord =
    text || PRAISE_WORDS[Math.floor(Math.random() * PRAISE_WORDS.length)];

  const callout = document.createElement('div');
  callout.className = `vfx-praise-callout vfx-praise-${quality}`;
  callout.textContent = chosenWord;

  const posX = x ?? window.innerWidth / 2;
  const posY = y ?? window.innerHeight / 2 - 40;

  callout.style.left = `${posX}px`;
  callout.style.top = `${posY}px`;

  document.body.appendChild(callout);

  tryVibrate([10, 40, 15]);

  setTimeout(() => {
    callout.remove();
  }, 1200);
}

/**
 * Spawns celebratory victory confetti raining across the screen.
 */
export function spawnVictoryConfetti(): void {
  if (prefersReducedMotion()) return;

  const count = 48;
  const colors = [
    '#f59e0b', // Amber Major
    '#3b82f6', // Sapphire Minor
    '#fb7185', // Rose Diminished
    '#a78bfa', // Violet Augmented
    '#10b981', // Emerald Win
    '#ec4899', // Bubblegum Pink
    '#facc15', // Gold Star
  ];

  const container = document.createElement('div');
  container.className = 'vfx-confetti-container';
  container.setAttribute('aria-hidden', 'true');
  document.body.appendChild(container);

  for (let i = 0; i < count; i++) {
    const bit = document.createElement('div');
    bit.className = 'vfx-confetti-piece';
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = 1.8 + Math.random() * 1.4;
    const sizeW = 8 + Math.random() * 7;
    const sizeH = 12 + Math.random() * 10;
    const rotSpeed = 360 + Math.random() * 720;

    bit.style.left = `${left}%`;
    bit.style.backgroundColor = color;
    bit.style.width = `${sizeW}px`;
    bit.style.height = `${sizeH}px`;
    bit.style.animationDelay = `${delay}s`;
    bit.style.animationDuration = `${duration}s`;
    bit.style.setProperty('--rot-end', `${rotSpeed}deg`);

    container.appendChild(bit);
  }

  tryVibrate([20, 60, 25, 60, 30]);

  setTimeout(() => {
    container.remove();
  }, 3500);
}
