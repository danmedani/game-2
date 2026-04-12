// Level data. Positions use 0-1 fractions of canvas size (400x700).
// Sizes (length, radius, size) are in absolute pixels at that canvas resolution.

const DEFAULT_LEVELS = [
  {
    id: 1,
    ballX: 0.5,       // horizontal start position (0=left, 1=right)
    gravity: 0.22,    // acceleration in px/frame² (at 60fps)
    bounciness: 0.62, // 0 = dead stop, 1 = perfect elastic
    playerBar: {
      x: 0.5,
      y: 0.44,
      rotation: 0,    // degrees
      length: 160,    // px
    },
    items: [
      {
        id: 'bar-1',
        type: 'bar',
        x: 0.28,
        y: 0.31,
        rotation: -38,
        length: 130,
      },
      {
        id: 'circle-1',
        type: 'circle',
        x: 0.67,
        y: 0.52,
        radius: 26,
      },
    ],
    bucket: {
      x: 0.74,
      y: 0.77,
      width: 68,
      height: 54,
      wallThickness: 10,
    },
  },
];

function getLevels() {
  try {
    const stored = localStorage.getItem('moon_levels');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return DEFAULT_LEVELS;
}

function saveLevels(levels) {
  localStorage.setItem('moon_levels', JSON.stringify(levels));
}

function getLevel(id) {
  const levels = getLevels();
  return levels.find(l => l.id === id) || levels[0];
}
