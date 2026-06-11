/**
 * 浅夏 Blog — 网页桌宠 (Desktop Mascot)
 * 3D 倾斜 + 影子 + 呼吸 + 随机动作 + 爱心粒子
 * 零依赖，纯原生 JS + CSS
 */
(function() {
  'use strict';

  if (window.innerWidth < 480) return;

  // ==================== 配置 ====================
  var CONFIG = {
    image: '/images/mascot.jpg',
    size: 140,
    position: 'left',
    bottom: 10,
    margin: 10,
  };

  // ==================== 动画 CSS 注入 ====================
  var style = document.createElement('style');
  style.textContent = [
    '@keyframes mp-float{',
      '0%,100%{transform:translateY(0);}',
      '50%{transform:translateY(-12px);}',
    '}',
    '@keyframes mp-breathe{',
      '0%,100%{transform:scale(1);}',
      '50%{transform:scale(1.03);}',
    '}',
    '@keyframes mp-bounce{',
      '0%{transform:translateY(0) scale(1);}',
      '25%{transform:translateY(-30px) scale(1.12);}',
      '40%{transform:translateY(-6px) scale(0.94);}',
      '55%{transform:translateY(-16px) scale(1.06);}',
      '70%{transform:translateY(-4px) scale(0.97);}',
      '100%{transform:translateY(0) scale(1);}',
    '}',
    '@keyframes mp-wiggle{',
      '0%,100%{transform:rotate(0);}',
      '20%{transform:rotate(-8deg);}',
      '40%{transform:rotate(8deg);}',
      '60%{transform:rotate(-5deg);}',
      '80%{transform:rotate(5deg);}',
    '}',
    '@keyframes mp-shadow-float{',
      '0%,100%{transform:translateX(-50%) scale(1);opacity:0.35;}',
      '50%{transform:translateX(-50%) scale(0.8);opacity:0.2;}',
    '}',
    '@keyframes mp-heart{',
      '0%{opacity:1;transform:translateY(0) scale(1) rotate(0deg);}',
      '100%{opacity:0;transform:translateY(-80px) scale(0.2) rotate(20deg);}',
    '}',
    '@keyframes mp-sparkle{',
      '0%{opacity:1;transform:translateY(0) scale(1);}',
      '100%{opacity:0;transform:translateY(-40px) scale(0);}',
    '}',
  ].join('');
  document.head.appendChild(style);

  // ==================== DOM 结构 ====================
  // 外层容器（浮动动画）
  var wrap = document.createElement('div');
  wrap.id = 'mp-wrap';
  wrap.style.cssText = [
    'position:fixed;z-index:9990;pointer-events:none;',
    'bottom:' + CONFIG.bottom + 'px;',
    CONFIG.position + ':' + CONFIG.margin + 'px;',
    'width:' + (CONFIG.size * 1.2) + 'px;',
    'height:' + (CONFIG.size * 1.2 + 10) + 'px;',
    'animation:mp-float 3s ease-in-out infinite;',
  ].join('');

  // 3D 倾斜层
  var tilt = document.createElement('div');
  tilt.id = 'mp-tilt';
  tilt.style.cssText = [
    'width:100%;height:100%;',
    'transition:transform 0.2s ease-out;',
    'will-change:transform;',
  ].join('');

  // 呼吸动画层
  var breathe = document.createElement('div');
  breathe.id = 'mp-breathe';
  breathe.style.cssText = [
    'width:100%;height:100%;',
    'animation:mp-breathe 4s ease-in-out infinite;',
    'display:flex;align-items:flex-end;justify-content:center;',
  ].join('');

  // 交互响应层（hover/click 动画）
  var sprite = document.createElement('div');
  sprite.id = 'mp-sprite';
  sprite.style.cssText = [
    'width:' + CONFIG.size + 'px;',
    'height:' + CONFIG.size + 'px;',
    'cursor:pointer;pointer-events:auto;',
    'transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1);',
    'position:relative;',
  ].join('');

  // 角色图片
  var img = document.createElement('img');
  img.src = CONFIG.image;
  img.style.cssText = [
    'width:100%;height:100%;object-fit:contain;',
    'pointer-events:none;user-select:none;',
    'display:block;',
  ].join('');
  img.draggable = false;
  img.onerror = function() {
    img.style.display = 'none';
    // 显示 emoji 兜底
    var fallback = document.createElement('div');
    fallback.style.cssText = 'font-size:' + CONFIG.size + 'px;line-height:1;text-align:center;';
    fallback.textContent = '🐱'; // cat emoji
    sprite.appendChild(fallback);
  };

  // 影子
  var shadow = document.createElement('div');
  shadow.id = 'mp-shadow';
  shadow.style.cssText = [
    'position:absolute;bottom:-8px;left:50%;',
    'width:' + (CONFIG.size * 0.6) + 'px;height:10px;',
    'background:radial-gradient(ellipse,rgba(0,0,0,0.35),transparent);',
    'border-radius:50%;',
    'animation:mp-shadow-float 3s ease-in-out infinite;',
  ].join('');

  // 组装
  sprite.appendChild(img);
  sprite.appendChild(shadow);
  breathe.appendChild(sprite);
  tilt.appendChild(breathe);
  wrap.appendChild(tilt);
  document.body.appendChild(wrap);

  // ==================== 鼠标跟踪（3D 倾斜） ====================
  var mouseX = window.innerWidth / 2;
  var mouseY = window.innerHeight / 2;

  document.addEventListener('mousemove', function(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function updateTilt() {
    var rect = wrap.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    var dx = (mouseX - cx) / window.innerWidth;
    var dy = (mouseY - cy) / window.innerHeight;

    // 限制旋转幅度
    var rx = Math.max(-10, Math.min(10, -dy * 25));
    var ry = Math.max(-10, Math.min(10, dx * 25));

    tilt.style.transform = 'perspective(300px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';

    requestAnimationFrame(updateTilt);
  }
  requestAnimationFrame(updateTilt);

  // ==================== 随机小动作 ====================
  function randomAction() {
    var actions = ['smallJump', 'wiggle', 'sparkle', 'nothing'];
    var action = actions[Math.floor(Math.random() * actions.length)];

    switch(action) {
      case 'smallJump':
        sprite.style.transition = 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)';
        sprite.style.transform = 'translateY(-20px) scale(1.05)';
        setTimeout(function() {
          sprite.style.transform = 'translateY(0) scale(1)';
        }, 300);
        break;
      case 'wiggle':
        sprite.style.animation = 'mp-wiggle 0.6s ease';
        setTimeout(function() { sprite.style.animation = ''; }, 600);
        break;
      case 'sparkle':
        spawnSparkles(3);
        break;
      case 'nothing':
      default:
        break;
    }

    // 下个随机动作: 4~10 秒后
    setTimeout(randomAction, 4000 + Math.random() * 6000);
  }
  setTimeout(randomAction, 3000);

  // ==================== Hover ====================
  sprite.addEventListener('mouseenter', function() {
    sprite.style.transform = 'scale(1.18)';
    shadow.style.transform = 'translateX(-50%) scale(0.7)';
    shadow.style.opacity = '0.25';
  });

  sprite.addEventListener('mouseleave', function() {
    sprite.style.transform = 'scale(1)';
    shadow.style.transform = '';
    shadow.style.opacity = '';
  });

  // ==================== Click ====================
  sprite.addEventListener('click', function() {
    // 暂停浮动，弹跳
    wrap.style.animation = 'none';
    sprite.style.transition = 'none';
    sprite.style.transform = 'scale(1)';

    requestAnimationFrame(function() {
      sprite.style.transition = 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)';
      sprite.style.animation = 'mp-bounce 0.7s ease';
    });

    setTimeout(function() {
      sprite.style.animation = '';
      wrap.style.animation = 'mp-float 3s ease-in-out infinite';
    }, 700);

    spawnHearts(5);
  });

  // ==================== 爱心粒子 ====================
  function spawnHearts(count) {
    var rect = sprite.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var top = rect.top;

    for (var i = 0; i < count; i++) {
      (function(delay) {
        setTimeout(function() {
          var heart = document.createElement('div');
          heart.innerHTML = '&#10084;';
          heart.style.cssText = [
            'position:fixed;z-index:9991;pointer-events:none;',
            'left:' + (cx + (Math.random() - 0.5) * 60) + 'px;',
            'top:' + top + 'px;',
            'font-size:' + (14 + Math.random() * 14) + 'px;',
            'color:hsl(' + (330 + Math.random() * 30) + ',80%,' + (60 + Math.random() * 20) + '%);',
            'animation:mp-heart ' + (0.8 + Math.random() * 0.8) + 's ease-out forwards;',
          ].join('');
          document.body.appendChild(heart);
          setTimeout(function() { heart.remove(); }, 1800);
        }, delay);
      })(i * 60);
    }
  }

  // ==================== 星光粒子 ====================
  function spawnSparkles(count) {
    var rect = sprite.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var top = rect.top + rect.height / 2;

    for (var i = 0; i < count; i++) {
      var sparkle = document.createElement('div');
      sparkle.innerHTML = '&#10022;';
      sparkle.style.cssText = [
        'position:fixed;z-index:9991;pointer-events:none;',
        'left:' + (cx + (Math.random() - 0.5) * 80) + 'px;',
        'top:' + (top + (Math.random() - 0.5) * 80) + 'px;',
        'font-size:' + (8 + Math.random() * 12) + 'px;',
        'color:hsl(' + (40 + Math.random() * 40) + ',90%,' + (70 + Math.random() * 30) + '%);',
        'animation:mp-sparkle ' + (0.6 + Math.random() * 0.8) + 's ease-out forwards;',
      ].join('');
      document.body.appendChild(sparkle);
      setTimeout(function() { sparkle.remove(); }, 1600);
    }
  }

  // ==================== 移动端适配 ====================
  if (window.innerWidth < 768) {
    CONFIG.size = 80;
    wrap.style.width = (CONFIG.size * 1.2) + 'px';
    wrap.style.height = (CONFIG.size * 1.2 + 10) + 'px';
    sprite.style.width = CONFIG.size + 'px';
    sprite.style.height = CONFIG.size + 'px';
    shadow.style.width = (CONFIG.size * 0.6) + 'px';
  }
})();
