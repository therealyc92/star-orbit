/* 星轨运势 · 星座配对
 * 算法：元素亲和基础分 + 对宫/同星座修正，分项按参与元素加成。
 * 确定性微调：同一对星座结果恒定。
 * 浏览器: SIGN_MATCH.scoreOf('aries','libra')
 * Node:   require('./match.js').scoreOf('aries','libra')
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SIGN_MATCH = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SIGN_ELEMENT = {
    aries: 'fire', leo: 'fire', sagittarius: 'fire',
    taurus: 'earth', virgo: 'earth', capricorn: 'earth',
    gemini: 'air', libra: 'air', aquarius: 'air',
    cancer: 'water', scorpio: 'water', pisces: 'water'
  };
  /* 阴阳性：火/风为阳（主动外放），土/水为阴（内敛感受） */
  var SIGN_POLARITY = {
    aries: 'yang', leo: 'yang', sagittarius: 'yang',
    gemini: 'yang', libra: 'yang', aquarius: 'yang',
    taurus: 'yin', virgo: 'yin', capricorn: 'yin',
    cancer: 'yin', scorpio: 'yin', pisces: 'yin'
  };
  var SIGN_KEYS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];

  /* 元素对亲和基础分（key 按 fire < earth < air < water 排序） */
  var ELEMENT_BASE = {
    'fire-fire': 86, 'earth-earth': 84, 'air-air': 85, 'water-water': 89,
    'fire-air': 91, 'earth-water': 89,
    'fire-earth': 63, 'earth-air': 57,
    'fire-water': 52, 'air-water': 71
  };

  /* 元素对关系文案 */
  var PAIR_TEXT = {
    'fire-fire': {
      title: '烈火同盟',
      strength: '两团火撞在一起，热情和行动力直接翻倍。你们都不缺想法也不缺冲劲，在一起永远有下一个计划。',
      challenge: '谁来踩刹车是这段关系最大的课题。争执时火星撞地球，谁都不肯先低头，小矛盾容易烧成大战。',
      advice: '约定一个冷却机制——争吵时各自离开二十分钟再谈。把竞争心留给外面的世界，相处时只讲爱不讲赢。'
    },
    'earth-earth': {
      title: '磐石之约',
      strength: '两个务实者的联盟，安全感和执行力双双拉满。你们 build 的东西——无论是家还是事业——都经得起时间。',
      challenge: '稳定过头就是乏味。日子容易过成流程表，浪漫被排在待办清单的最后一项，谁也懒得先制造惊喜。',
      advice: '把"约会"当成正事排进日程。每月一次打破惯例的小冒险，是给你们关系续命的必需品。'
    },
    'air-air': {
      title: '风之共鸣',
      strength: '思想同频的一对，从宇宙聊到楼下早餐店，永远有话聊。你们是彼此最好的听众和灵感来源。',
      challenge: '两个都飘在空中，没人负责落地。情绪和实际需求容易被一顿漂亮的谈话掩盖，问题从未真正解决。',
      advice: '聊完记得做。每周挑一个聊过的想法真正执行，关系需要共同完成的事来锚定，而不仅是共同的话题。'
    },
    'water-water': {
      title: '深海相拥',
      strength: '不用说就懂的默契。你们共享同一种情感语言，一个眼神就能完成别人一晚上的沟通，亲密感天然满格。',
      challenge: '情绪会共振也会共振着放大。一个人低落另一个人跟着沉，容易一起陷入情绪漩涡，缺乏理性的锚。',
      advice: '约定"不能同时崩溃"原则——一方情绪低落时，另一方负责稳住。轮流当彼此的岸。'
    },
    'fire-air': {
      title: '风助火势',
      strength: '风让火烧得更旺——风象的点子配上火象的行动力，你们是彼此最好的放大器，在一起永远不愁无聊。',
      challenge: '一个跑得快一个变得快，都缺乏耐心深耕。关系容易高开低走，热络之后发现缺乏深层连接。',
      advice: '每月安排一次深度对话，聊感受而不是聊计划。风象多给承诺，火象多给耐心，这段关系就能跑长跑。'
    },
    'earth-water': {
      title: '水润沃土',
      strength: '土象给水象容器，水象给土象温度。一个提供安稳的壳，一个注入柔软的心，是最有"家"感的组合。',
      challenge: '都不擅长主动表达。土象用做事代替说爱，水象用暗示代替开口，委屈都攒在心里发酵。',
      advice: '建立"说破无毒"的习惯：水象直接讲需求，土象定期说感受。你们的爱都在，只是需要翻译。'
    },
    'fire-earth': {
      title: '熔岩与磐石',
      strength: '火象点燃方向，土象铺平道路——一个负责想到，一个负责做到，是事业上最互补的搭档组合。',
      challenge: '节奏错位是常态：火象嫌土象太慢，土象嫌火象太冲，彼此都容易把对方的优点看成缺点。',
      advice: '分工而不是同化。让火象开拓、土象收尾，谁也别改造谁。学会说一句"你的方式也对"。'
    },
    'earth-air': {
      title: '大地与风',
      strength: '一个仰望星空一个脚踏实地，视野完全不同——这意味着你们看到的世界拼起来比别人完整得多。',
      challenge: '价值观错位：风象觉得土象无趣，土象觉得风象不靠谱。互相看不上是这对组合的日常暗流。',
      advice: '把差异当资源而非缺陷。风象的创意交给土象落地，土象的规划交给风象破圈，合作比改变有效。'
    },
    'fire-water': {
      title: '水火淬炼',
      strength: '最具张力的组合。火的热烈融化水的防备，水的温柔浇熄火的焦躁——磨合好了是灵魂级的亲密。',
      challenge: '水象觉得火象粗线条不贴心，火象觉得水象太敏感想太多，彼此的爱的语言几乎不通。',
      advice: '火象行动前多问一句"你感觉如何"，水象直接说需求而不是等对方猜。学习翻译彼此的爱。'
    },
    'air-water': {
      title: '风雨交织',
      strength: '理性与感性的互补。风象帮水象把情绪讲清楚，水象帮风象把道理变软，在一起能长出新的自己。',
      challenge: '水象要的是共情，风象给的是分析。一个说"别讲道理了"，一个说"讲道理有什么错"，频道常常错开。',
      advice: '风象先抱再分析，水象先说需求再期待被懂。顺序对了，你们就是彼此最好的解药。'
    }
  };

  /* 对宫组合短评（key 按字母序） */
  var OPPOSITE_TEXT = {
    'aries-libra': '白羊的"我"与天秤的"我们"互为镜像。白羊教天秤果断，天秤教白羊体面，前提是都别试图改变对方。',
    'taurus-scorpio': '感官与灵魂的强强组合。都深情都固执，信任一旦建立极难撼动，冷战起来也同样旷日持久。',
    'gemini-sagittarius': '信息层面的神仙眷侣。聊不完的话题、走不完的远方，唯独需要有人负责把日子落地。',
    'cancer-capricorn': '一个筑巢一个扛山，传统意义上的互补天花板。巨蟹给温度，摩羯给安全感，记得常把爱说出口。',
    'leo-aquarius': '舞台中心与旁观席的相遇。互相吸引的正是对方身上自己没有的东西——骄傲与抽离的化学反应。',
    'virgo-pisces': '细节与梦境的对望。处女帮双鱼落地，双鱼帮处女放松，治愈系组合，别太较真对错。'
  };
  var SAME_TEXT = '另一个自己。优点加倍，缺点也加倍。相处省力，但要警惕一起钻进同一个牛角尖。';

  /* 性别组合视角短评（ga-gb） */
  var GENDER_BRIEF = {
    'male-female': '他的行动力遇上她的感受力——经典的两性能量对话。关键在于他学会听情绪、她学会直接说需求，顺序对了就是互补天花板。',
    'female-male': '她的主动配上他的内敛——现代版的角色反转。她不必收锋芒，他也不必硬充强势，舒服的关系从来不需要演"该有的样子"。',
    'male-male': '两位男性之间的相处，少了性别角色的预设包袱，多了坦诚直给的痛快。激情和竞争心都可能偏高，记得把胜负欲留在赛场、把温柔留给彼此。',
    'female-female': '两位女性之间的连接，情感密度天然偏高，共情力是双倍的礼物也是双倍的重量。彼此的敏感是默契的来源，但也别让情绪共振成一个漩涡——留一个理性的锚。'
  };

  /* 阴阳配位 × 性别的能量流动描述（key: polarityA-genderA_polarityB-genderB，查表时双向匹配） */
  var POLARITY_NOTE = {
    'yang-male_yin-female': '他（阳性星座）外放主动、她（阴性星座）内敛感受——能量一外一内自然咬合，他带她出门看世界，她给他一个想回来的家。',
    'yin-male_yang-female': '他（阴性星座）沉静细腻、她（阳性星座）明亮果敢——他提供稳的底座，她负责点燃光芒，谁说主角必须是谁？',
    'yang-male_yang-female': '他冲她也冲——两个人都自带引擎。激情拉满，但谁来踩刹车？争主导权是日常功课，学会"轮流当主角"就不怕熄火。',
    'yin-male_yin-female': '他静她也静——两个内敛者的世界很私密很安全，但容易闷。需要有人主动捅破沉默那层纸，制造一点"不舒服"的坦诚。',
    'yang-male_yang-male': '两位阳性星座的男性——行动力叠加，惺惺相惜也容易硬碰硬。把竞争变成共同目标上的并肩，而不是关系里的暗较劲。',
    'yin-male_yin-male': '两位阴性星座的男性——都不爱把话说满，默契靠时间养。慢热但深，记得别让"我都懂"变成"谁都没说"。',
    'yang-female_yang-female': '两位阳性星座的女性——两个都飒都敢。互相成就大于互相竞争时这段关系就是火箭燃料，别让比较心偷走欣赏。',
    'yin-female_yin-female': '两位阴性星座的女性——感受力叠加，彼此是最好的容器。但情绪容易一起沉，约定一个"谁先好起来谁当岸"的规则。',
    'yang-male_yin-male': '他外放他内敛——一动一静天然互补，但外放的那个别用音量盖过对方没说出口的话。',
    'yang-female_yin-female': '她飒她柔——一个带风一个给港湾，但飒的那个也需要被接住，柔的那个也有底线。'
  };

  function polarityKey(sign, gender) {
    if (!gender) return null;
    return SIGN_POLARITY[sign] + '-' + gender;
  }

  function hashCode(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function clamp(v) { return Math.max(30, Math.min(99, v)); }
  function pairKey(ea, eb) {
    var order = { fire: 0, earth: 1, air: 2, water: 3 };
    return order[ea] <= order[eb] ? ea + '-' + eb : eb + '-' + ea;
  }
  function sortedPair(a, b) { return a < b ? a + '-' + b : b + '-' + a; }
  function isOpposite(a, b) {
    return Math.abs(SIGN_KEYS.indexOf(a) - SIGN_KEYS.indexOf(b)) === 6;
  }
  function labelFor(total) {
    if (total >= 90) return '天作之合';
    if (total >= 80) return '琴瑟和鸣';
    if (total >= 70) return '潜力组合';
    if (total >= 60) return '磨合成长';
    if (total >= 50) return '欢喜冤家';
    return '相爱相杀';
  }

  /* 阳性星座+男 / 阴性星座+女 = 能量顺势(+1)；反之为能量反差(-1) */
  function polarityMod(sign, gender) {
    if (!gender) return 0;
    var pol = SIGN_POLARITY[sign];
    if ((pol === 'yang' && gender === 'male') || (pol === 'yin' && gender === 'female')) return 1;
    return -1;
  }

  function scoreOf(a, b, ga, gb) {
    ga = ga || null;
    gb = gb || null;
    var ea = SIGN_ELEMENT[a], eb = SIGN_ELEMENT[b];
    var pk = pairKey(ea, eb);
    var base = ELEMENT_BASE[pk];
    var same = (a === b);
    var opposite = !same && isOpposite(a, b);
    if (same) base += 3;
    if (opposite) base += 5;

    // 阴阳配位微调：合计 -2..+2
    var polMod = polarityMod(a, ga) + polarityMod(b, gb);

    // 确定性微调 ±3
    var jitter = (hashCode(sortedPair(a, b)) % 7) - 3;
    var total = clamp(base + jitter + polMod);

    var elems = same ? [ea] : [ea, eb];
    function has(e) { return elems.indexOf(e) >= 0; }
    function jit(dim) { return (hashCode(sortedPair(a, b) + '|' + dim) % 9) - 4; }

    var dims = {
      love:    clamp(base + (has('water') ? 5 : 0) + (has('fire') ? 2 : 0) + jit('love') + polMod),
      comm:    clamp(base + (has('air') ? 7 : 0) + jit('comm')),
      stable:  clamp(base + (has('earth') ? 7 : 0) + jit('stable') + polMod),
      passion: clamp(base + (has('fire') ? 7 : 0) + jit('passion') - polMod)
    };

    var text = PAIR_TEXT[pk];
    // 性别视角短评
    var genderBrief = (ga && gb) ? GENDER_BRIEF[ga + '-' + gb] : null;
    // 阴阳配位能量描述（双向匹配）
    var polarityNote = null;
    if (ga && gb) {
      var ka = SIGN_POLARITY[a] + '-' + ga;
      var kb = SIGN_POLARITY[b] + '-' + gb;
      polarityNote = POLARITY_NOTE[ka + '_' + kb] || POLARITY_NOTE[kb + '_' + ka] || null;
    }
    return {
      total: total,
      label: labelFor(total),
      stars: Math.round(total / 20),
      title: same ? '镜中之我' : text.title,
      dims: dims,
      strength: text.strength,
      challenge: text.challenge,
      advice: text.advice,
      tag: same ? '同星座' : (opposite ? '对宫组合' : null),
      extra: same ? SAME_TEXT : (opposite ? OPPOSITE_TEXT[sortedPair(a, b)] : null),
      genderBrief: genderBrief,
      polarityNote: polarityNote
    };
  }

  return { scoreOf: scoreOf, SIGN_ELEMENT: SIGN_ELEMENT, SIGN_POLARITY: SIGN_POLARITY };
}));
