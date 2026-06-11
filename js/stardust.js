/**
 * 浅夏 Blog — 星尘粒子 (Stardust Particles)
 * 轻量级 Canvas 浮动光点，模拟星空萤火
 * ~2KB minified, 零依赖, requestAnimationFrame, GPU-friendly
 */
(function() {
  'use strict';

  if (window.innerWidth < 360) return; // skip extreme small screens

  var canvas = document.createElement('canvas');
  canvas.id = 'stardust-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:-1;';
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var w, h;
  var particles = [];
  var raf;
  var active = true;

  // Config
  var MAX_PARTICLES = 50;     // low count for performance
  var BASE_SPEED = 0.15;      // very slow drift
  var MAX_SIZE = 2.5;         // tiny dots

  function resize() {
    w = canvas.width  = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function createParticle(resetY) {
    return {
      x: Math.random() * w,
      y: resetY ? -10 : Math.random() * h,
      r: Math.random() * MAX_SIZE + 0.5,
      speed: Math.random() * BASE_SPEED + 0.05,
      sway: (Math.random() - 0.5) * 0.3,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: Math.random() * 0.008 + 0.003,
      opacity: Math.random() * 0.5 + 0.2,
      opacityPhase: Math.random() * Math.PI * 2,
      opacitySpeed: Math.random() * 0.01 + 0.005,
      // warm white to pale blue tint
      hue: Math.random() < 0.3
        ? 200 + Math.random() * 40   // pale blue
        : 40 + Math.random() * 20,   // warm gold/amber
      saturation: 20 + Math.random() * 30,
    };
  }

  function init() {
    particles = [];
    for (var i = 0; i < MAX_PARTICLES; i++) {
      particles.push(createParticle(false));
    }
  }

  function update(p) {
    p.y -= p.speed;
    p.x += Math.sin(p.swayPhase + performance.now() * p.swaySpeed) * p.sway;
    p.opacity = 0.2 + Math.sin(p.opacityPhase + performance.now() * p.opacitySpeed) * 0.15 + 0.15;

    if (p.y < -20) {
      p.y = h + 10;
      p.x = Math.random() * w;
    }
    if (p.x < -20) p.x = w + 10;
    if (p.x > w + 20) p.x = -10;
  }

  function draw(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = 'hsla(' + p.hue + ',' + p.saturation + '%, 85%, ' + p.opacity.toFixed(2) + ')';
    ctx.fill();
  }

  function loop() {
    if (!active) return;
    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < particles.length; i++) {
      update(particles[i]);
      draw(particles[i]);
    }

    raf = requestAnimationFrame(loop);
  }

  // Pause when tab hidden
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      active = false;
      if (raf) cancelAnimationFrame(raf);
    } else {
      active = true;
      loop();
    }
  });

  // Resize debounced
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      resize();
      init();
    }, 400);
  });

  // Start
  resize();
  init();
  loop();
})();
