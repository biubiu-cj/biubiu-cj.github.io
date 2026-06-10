/**
 * 浅夏 Blog - 樱花飘落效果
 * Canvas-based cherry blossom (sakura) falling petals animation
 * Inspired by classic anime aesthetic
 */
(function() {
  'use strict';

  // Only run on devices with enough power (skip on very weak mobile)
  if (window.innerWidth < 400) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'sakura-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:9998;';
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var width, height;
  var petals = [];
  var animationId;
  var isActive = true;

  // Petal colors: various shades of pink and white
  var colors = [
    'rgba(255, 183, 197, <opacity>)',  // light pink
    'rgba(255, 133, 162, <opacity>)',  // sakura pink
    'rgba(255, 192, 203, <opacity>)',  // pink
    'rgba(255, 228, 225, <opacity>)',  // misty rose
    'rgba(255, 218, 224, <opacity>)',  // pale pink
    'rgba(255, 105, 180, <opacity>)',  // hot pink
    'rgba(255, 240, 245, <opacity>)',  // lavender blush
  ];

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }

  // Sakura petal shape
  function drawPetal(ctx, x, y, size, rotation, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Draw a sakura petal shape using bezier curves
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      size * 0.3, -size * 0.25,
      size * 0.5, -size * 0.15,
      size * 0.5, 0
    );
    ctx.bezierCurveTo(
      size * 0.5, size * 0.15,
      size * 0.3, size * 0.25,
      0, 0
    );

    // Small notch at the tip
    ctx.moveTo(size * 0.45, -size * 0.02);
    ctx.lineTo(size * 0.35, -size * 0.15);
    ctx.lineTo(size * 0.35, 0.15);
    ctx.lineTo(size * 0.35, 0.02);

    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function createPetal() {
    return {
      x: Math.random() * width * 1.2 - width * 0.1,
      y: -30,
      size: Math.random() * 15 + 10,     // 10-25px
      speed: Math.random() * 1.5 + 0.5,  // fall speed
      swing: Math.random() * 2 - 1,      // horizontal sway
      swingSpeed: Math.random() * 0.02 + 0.01,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: Math.random() * 0.02 - 0.01,
      opacity: Math.random() * 0.4 + 0.3, // 0.3-0.7
      color: colors[Math.floor(Math.random() * colors.length)].replace('<opacity>', '1'),
      phase: Math.random() * Math.PI * 2, // for sine wave sway
    };
  }

  function updatePetal(petal) {
    petal.y += petal.speed;
    petal.x += Math.sin(petal.phase + performance.now() * petal.swingSpeed) * 0.6 + petal.swing * 0.3;
    petal.rotation += petal.rotationSpeed;

    // Reset if out of viewport
    if (petal.y > height + 50 || petal.x < -50 || petal.x > width + 50) {
      petal.y = -30;
      petal.x = Math.random() * width * 1.2 - width * 0.1;
      petal.speed = Math.random() * 1.5 + 0.5;
    }
  }

  function draw(petal) {
    var colorWithOpacity = petal.color.replace('rgba', 'rgba')
      .replace(/255,\s*133,\s*162/i, '255, 133, 162')
      .replace('<opacity>', petal.opacity.toFixed(2));

    // Simpler: draw colored circle with slight deformation (better perf)
    ctx.save();
    ctx.globalAlpha = petal.opacity;
    ctx.fillStyle = petal.color;
    ctx.beginPath();

    // Simple petal-like ellipse
    var px = petal.x;
    var py = petal.y;
    var s = petal.size;
    var r = petal.rotation;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(r);
    ctx.scale(1, 0.55);
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fillStyle = petal.color;
    ctx.fill();

    // Add a subtle line in the middle (petal vein)
    ctx.globalAlpha = petal.opacity * 0.4;
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, 0);
    ctx.lineTo(s * 0.7, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore();
  }

  function animate() {
    if (!isActive) return;

    ctx.clearRect(0, 0, width, height);

    // Draw petals
    for (var i = 0; i < petals.length; i++) {
      updatePetal(petals[i]);
      draw(petals[i]);
    }

    animationId = requestAnimationFrame(animate);
  }

  function initPetals() {
    var count = Math.min(Math.floor(width / 30), 60); // fewer on narrow screens
    petals = [];
    for (var i = 0; i < count; i++) {
      var petal = createPetal();
      petal.y = Math.random() * height; // stagger initial positions
      petals.push(petal);
    }
  }

  // Visibility API - pause when tab inactive
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      isActive = false;
      if (animationId) cancelAnimationFrame(animationId);
    } else {
      isActive = true;
      animate();
    }
  });

  // Handle resize
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      resize();
      initPetals();
    }, 300);
  });

  // Start
  resize();
  initPetals();
  animate();
})();
