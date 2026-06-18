// =============================================================
// logic.test.js — браузерные P1-тесты игровой логики
// Запускать через tests/browser.html (через http-сервер, не file://)
// Без внешних библиотек. Пишет результаты в div#test-results.
// =============================================================

// ---------------------------------------------------------------
// Мини-ассерт-хелпер (~15 строк)
// ---------------------------------------------------------------
var _testResults = [];

function assert(condition, label) {
  _testResults.push({ ok: !!condition, label: label });
}

function assertEqual(a, b, label) {
  var ok = (a === b);
  _testResults.push({
    ok: ok,
    label: ok ? label : label + ' (получили ' + JSON.stringify(a) + ', ожидали ' + JSON.stringify(b) + ')'
  });
}

// ---------------------------------------------------------------
// Вспомогательная функция: создать профиль без localStorage
// ---------------------------------------------------------------
function makeProfile(overrides) {
  return Object.assign(
    { v: 1, points: 0, onboarded: true, history: {}, bestStreakEver: 0,
      days: [], badges: {}, cloudBlockStars: {}, cloudDaysCount: 0 },
    overrides || {}
  );
}

// ---------------------------------------------------------------
// P1-12: basePoints — Б=10, С=20, П=30
// ---------------------------------------------------------------
assertEqual(basePoints('Б'), 10, 'P1-12a basePoints(Б)=10');
assertEqual(basePoints('С'), 20, 'P1-12b basePoints(С)=20');
assertEqual(basePoints('П'), 30, 'P1-12c basePoints(П)=30');

// ---------------------------------------------------------------
// P1-13: difficultyOrder — Б < С < П
// ---------------------------------------------------------------
assert(difficultyOrder('Б') < difficultyOrder('С'), 'P1-13a difficultyOrder: Б<С');
assert(difficultyOrder('С') < difficultyOrder('П'), 'P1-13b difficultyOrder: С<П');

// ---------------------------------------------------------------
// P1-14: getRank — использует RANKS из app.js, не хардкодит пороги
// ---------------------------------------------------------------
(function() {
  // ниже минимума → первый ранг
  var firstRank = RANKS[0];
  var lastRank  = RANKS[RANKS.length - 1];

  assertEqual(getRank(-1).name,  firstRank.name, 'P1-14a getRank(-1) → первый ранг');
  assertEqual(getRank(0).name,   firstRank.name, 'P1-14b getRank(0) → первый ранг');

  // на границе каждого ранга RANKS[i].min → i-й ранг
  for (var i = 0; i < RANKS.length; i++) {
    var r = getRank(RANKS[i].min);
    assertEqual(r.name, RANKS[i].name, 'P1-14c getRank(RANKS[' + i + '].min) → ' + RANKS[i].name);
  }

  // очень большие очки → последний ранг
  assertEqual(getRank(999999).name, lastRank.name, 'P1-14d getRank(999999) → последний ранг');
})();

// ---------------------------------------------------------------
// P1-15: getBlockStars — использует глобальный profile
// ---------------------------------------------------------------
(function() {
  // Для теста берём первый блок из QUESTION_BANK
  var blockId = QUESTION_BANK.blocks[0].id;
  var blockQs = QUESTION_BANK.questions.filter(function(q) { return q.blockId === blockId; });
  var total   = blockQs.length;

  // Подготовка: временно подменяем profile
  var savedProfile = profile;

  // --- пустая история → 0 звёзд
  profile = makeProfile({ history: {} });
  assertEqual(getBlockStars(blockId), 0, 'P1-15a getBlockStars: пустая история → 0');

  // --- 50% освоено → 1 звезда (ровно floor(total*0.5) вопросов с c>0)
  var hist50 = {};
  var count50 = Math.ceil(total * 0.5);
  for (var i = 0; i < count50; i++) {
    hist50[String(blockQs[i].id)] = { c: 1, last: 1, t: 1 };
  }
  profile = makeProfile({ history: hist50 });
  assert(getBlockStars(blockId) >= 1, 'P1-15b getBlockStars: ~50% освоено → ≥1 звезда');

  // --- 80% освоено → 2 звезды
  var hist80 = {};
  var count80 = Math.ceil(total * 0.8);
  for (var i = 0; i < count80; i++) {
    hist80[String(blockQs[i].id)] = { c: 1, last: 1, t: 1 };
  }
  profile = makeProfile({ history: hist80 });
  assert(getBlockStars(blockId) >= 2, 'P1-15c getBlockStars: ~80% освоено → ≥2 звезды');

  // --- 100% освоено → 3 звезды
  var hist100 = {};
  for (var i = 0; i < total; i++) {
    hist100[String(blockQs[i].id)] = { c: 1, last: 1, t: 1 };
  }
  profile = makeProfile({ history: hist100 });
  assertEqual(getBlockStars(blockId), 3, 'P1-15d getBlockStars: 100% освоено → 3');

  // --- cloudBlockStars > computed → берётся max
  profile = makeProfile({ history: {}, cloudBlockStars: { '0': 2 } });
  assertEqual(getBlockStars(0), 2, 'P1-15e getBlockStars: cloudBlockStars > computed → max');

  // Восстанавливаем profile
  profile = savedProfile;
})();

// ---------------------------------------------------------------
// P1-16: pickGameQuestions — инварианты
// ---------------------------------------------------------------
(function() {
  var savedProfile = profile;

  // Формируем pool из первых 20 вопросов (гарантированно > 7)
  var pool = QUESTION_BANK.questions.slice(0, 20);

  // --- результат min(7, pool.length) вопросов
  profile = makeProfile({ history: {} });
  var picked = pickGameQuestions(pool);
  assertEqual(picked.length, Math.min(7, pool.length),
    'P1-16a pickGameQuestions: возвращает min(7, pool.length)');

  // --- нет дублей id
  var ids = picked.map(function(q) { return q.id; });
  var unique = ids.filter(function(id, i) { return ids.indexOf(id) === i; });
  assertEqual(unique.length, ids.length, 'P1-16b pickGameQuestions: нет дублей id');

  // --- все из pool
  var poolIds = pool.map(function(q) { return q.id; });
  var allFromPool = ids.every(function(id) { return poolIds.indexOf(id) !== -1; });
  assert(allFromPool, 'P1-16c pickGameQuestions: все вопросы из pool');

  // --- приоритет корзин A→B→C:
  //     помечаем одни вопросы в корзину C (освоены), другие без истории (A)
  //     при достаточном числе новых вопросов — picked должны содержать A-корзину
  var poolForPriority = QUESTION_BANK.questions.slice(0, 14);
  var histC = {};
  // первые 7 → C (освоены)
  for (var i = 0; i < 7; i++) {
    histC[String(poolForPriority[i].id)] = { c: 1, last: 1, t: 1 };
  }
  // следующие 7 → A (нет записи)
  profile = makeProfile({ history: histC });
  var picked2 = pickGameQuestions(poolForPriority);
  var pickedIds2 = picked2.map(function(q) { return q.id; });
  var aIds = poolForPriority.slice(7).map(function(q) { return q.id; });
  var hasAItems = aIds.some(function(id) { return pickedIds2.indexOf(id) !== -1; });
  assert(hasAItems, 'P1-16d pickGameQuestions: приоритет корзины A перед C');

  // --- краевой случай: bCount === 0 → slice(0, n)
  //     pool только из С-вопросов (всё в корзине C), difficulty НЕ 'Б'
  var poolNoB = QUESTION_BANK.questions.filter(function(q) { return q.difficulty !== 'Б'; }).slice(0, 10);
  if (poolNoB.length > 0) {
    profile = makeProfile({ history: {} });
    var pickedNoB = pickGameQuestions(poolNoB);
    assertEqual(pickedNoB.length, Math.min(7, poolNoB.length),
      'P1-16e pickGameQuestions: bCount=0 (нет Б) → возвращает min(7, pool.length)');
  }

  // --- pool.length < 7 → вернёт все
  var smallPool = QUESTION_BANK.questions.slice(0, 4);
  profile = makeProfile({ history: {} });
  var pickedSmall = pickGameQuestions(smallPool);
  assertEqual(pickedSmall.length, smallPool.length,
    'P1-16f pickGameQuestions: pool.length < 7 → вернёт все (' + smallPool.length + ')');

  profile = savedProfile;
})();

// ---------------------------------------------------------------
// Рендер результатов в DOM
// ---------------------------------------------------------------
(function renderResults() {
  var container = document.getElementById('test-results');
  if (!container) return;

  var passed = 0, failed = 0;
  var html = '<ul style="list-style:none;padding:0;margin:0;">';

  for (var i = 0; i < _testResults.length; i++) {
    var r = _testResults[i];
    var color  = r.ok ? '#1F6F50' : '#c0392b';
    var symbol = r.ok ? '✓' : '✗';
    html += '<li style="padding:4px 0;color:' + color + ';font-family:monospace;font-size:14px;">'
          + symbol + ' ' + r.label + '</li>';
    if (r.ok) passed++; else failed++;
  }
  html += '</ul>';

  var summary = '<p style="margin-top:16px;font-weight:bold;font-size:16px;">'
              + passed + ' passed, ' + failed + ' failed</p>';
  container.innerHTML = summary + html;

  // Статус в заголовке вкладки
  document.title = (failed === 0)
    ? ('✓ ' + passed + '/' + (passed + failed) + ' — tennis tests PASS')
    : ('✗ ' + failed + ' FAIL — tennis tests');

  // Сигнализируем browser.html, что рендер завершён —
  // асинхронные ошибки инициализации app.js уже не должны затирать результаты
  window._testsRendered = true;
})();
