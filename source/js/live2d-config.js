/**
 * 浅夏 Blog — Live2D 看板娘 (live2d-widget v3.1.4)
 * 模型: shizuku (萌娘)，unpkg CDN
 */
L2Dwidget.init({
  model: {
    jsonPath: 'https://unpkg.com/live2d-widget-model-shizuku@1.0.5/assets/shizuku.model.json',
    scale: 1,
  },
  display: {
    superSample: 2,
    width: 150,
    height: 300,
    position: 'left',
    hOffset: 10,
    vOffset: -30,
  },
  mobile: {
    show: true,
    scale: 0.6,
    motion: true,
  },
  react: {
    opacityDefault: 0.8,
    opacityOnHover: 1,
  },
  dialog: {
    enable: true,
    script: {
      'default': '欢迎来到浅夏的小窝~',
      'every idle 30s': [
        '今天也来浅夏看看吧~',
        '你微微地笑着，不同我说什么话',
        '生如夏花之绚烂，死如秋叶之静美',
        '星空の下で、君を想う',
        '世界对着它的爱人，揭下了浩瀚的面具',
      ],
      'tap body': ['哎呀！', '怎么了？', '嗯？', '嘻嘻~'],
      'dawn': '天快亮了...你还没睡吗？',
      'morning': '早上好！新的一天开始了~',
      'noon': '中午好，记得吃饭哦！',
      'afternoon': '下午好~',
      'dusk': '傍晚了呢，天空好美',
      'night': '晚上好！星空真漂亮',
      'late night': '夜深了，早点休息呀...',
    },
  },
});
