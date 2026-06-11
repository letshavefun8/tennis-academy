// =====================================================
// Академия тенниса — игровой тренажёр
// Vanilla JS, без фреймворков, работает по file://
// Комментарии на русском языке.
// =====================================================

// Проверяем, что данные подключены (questions.js загружен до app.js)
if (typeof QUESTION_BANK === 'undefined') {
  document.body.innerHTML = '<div style="max-width:500px;margin:60px auto;padding:24px;background:#fff;border-radius:12px;text-align:center;font-family:sans-serif;color:#e53e3e;border:2px solid #e53e3e;"><h2>Ошибка</h2><p>Не найден файл questions.js — запустите convert.py для генерации данных.</p></div>';
  throw new Error('QUESTION_BANK не определён');
}

// =====================================================
// РЕПЛИКИ ЭЙСА
// =====================================================
var ACE_MENU = [
  'Привет, чемпион! Готов потренироваться? 🎾',
  'Корт ждёт! Сыграем гейм? ⚡',
  'Я уже размялся — твоя очередь! 💪',
  'Сегодня отличный день для тенниса! ☀️'
];
var ACE_CORRECT = [
  'Эйс! 🎯',
  'Виннер! 💥',
  'Чисто по линии! ✨',
  'Вот это удар! 🚀',
  'Соперник даже не дёрнулся! 😎'
];
var ACE_WRONG_FIRST = [
  'В сетку! Но у тебя есть вторая подача 🎾',
  'Чуть-чуть мимо! Вторая подача — твой шанс! 🎾'
];
var ACE_WRONG_SECOND = [
  'Двойная! Бывает даже у чемпионов. Разберём после гейма! 📋'
];
var ACE_RETRY_CORRECT = [
  'Вторая подача — в корт! 👏',
  'Исправился — как настоящий профи! 💪'
];
var ACE_RESULTS_WIN = [
  'Ты сегодня просто машина! 🤖🎾',
  'Трибуны в восторге! 👏'
];
var ACE_RESULTS_GOOD = [
  'Крутой гейм! Ещё чуть-чуть — и победа! 💪'
];
var ACE_RESULTS_HARD = [
  'Тяжёлый соперник попался. Но ты в игре! 🎾'
];
var ACE_NEW_RANK = 'Новое звание! Ты теперь {emoji} {name}! Праздник на корте! 🎉';
var ACE_ONBOARD_HELLO = 'Добро пожаловать в Академию тенниса! 🎾 Я Эйс. Покажи, что умеешь — три мяча на разминку!';
var ACE_ONBOARD_DONE = '🎉 Зачислен в Академию! Звание: 🎒 Новичок. Вперёд, к тренировкам!';

// =====================================================
// МАППИНГ БЛОКОВ ДЛЯ МЕНЮ (plan 2.7)
// =====================================================
var BLOCK_DISPLAY = {
  0:  { label: '🎯 Тактика',              section: 'court' },
  1:  { label: '🥷 Соперники',            section: 'court' },
  2:  { label: '🧮 Счёт',                 section: 'court' },
  3:  { label: '🧠 Психология',           section: 'court' },
  4:  { label: '📐 Геометрия',            section: 'court' },
  5:  { label: '🪞 Самоанализ',           section: 'court' },
  6:  { label: '🔍 Найди ошибку игрока',  section: 'review' },
  7:  { label: '🟦 Покрытия',             section: 'courses' },
  8:  { label: '👯 Парная тактика',       section: 'courses' },
  9:  { label: '🚀 Подача',               section: 'courses' },
  10: { label: '🛡 Приём',               section: 'courses' },
  11: { label: '🫲 Против левши',         section: 'courses' },
  12: { label: '🌦 Погода и условия',     section: 'courses' },
  13: { label: '🔋 Энергия и темп',       section: 'courses' },
  14: { label: '🧾 Форматы счёта',        section: 'courses' },
  15: { label: '📋 Подготовка к матчу',   section: 'courses' },
  16: { label: '👟 Работа ног',           section: 'courses' }
};

// =====================================================
// ЗВАНИЯ (plan 2.2)
// =====================================================
var RANKS = [
  { min: 0,    name: 'Новичок',          emoji: '🎒' },
  { min: 300,  name: 'Юниор',            emoji: '🥎' },
  { min: 800,  name: 'Игрок основы',     emoji: '🎾' },
  { min: 1600, name: 'Капитан команды',  emoji: '🏅' },
  { min: 2800, name: 'Мастер корта',     emoji: '🏆' },
  { min: 4500, name: 'Чемпион Академии', emoji: '👑' }
];

/** Возвращает объект звания по количеству очков */
function getRank(points) {
  var rank = RANKS[0];
  for (var i = 0; i < RANKS.length; i++) {
    if (points >= RANKS[i].min) rank = RANKS[i];
  }
  return rank;
}

/** Возвращает следующее звание или null (если максимальное) */
function getNextRank(points) {
  for (var i = 0; i < RANKS.length; i++) {
    if (points < RANKS[i].min) return RANKS[i];
  }
  return null;
}

// =====================================================
// LOCALSTORAGE-ПРОФИЛЬ (plan 2.1)
// =====================================================
var STORAGE_KEY = 'tennisAcademy.v1';

/** Загружает профиль из localStorage; при ошибке возвращает дефолт */
function loadProfile() {
  var def = { v: 1, points: 0, onboarded: false, history: {} };
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return def;
    var obj = JSON.parse(raw);
    // Проверка версии и типа
    if (typeof obj !== 'object' || obj === null || obj.v !== 1) {
      console.warn('tennisAcademy: профиль сброшен (несовместимая версия)');
      return def;
    }
    // Валидация полей поштучно
    var pts = (typeof obj.points === 'number' && obj.points >= 0) ? Math.floor(obj.points) : 0;
    var onboarded = obj.onboarded === true;
    var history = (typeof obj.history === 'object' && obj.history !== null && !Array.isArray(obj.history)) ? obj.history : {};
    return { v: 1, points: pts, onboarded: onboarded, history: history };
  } catch (e) {
    console.warn('tennisAcademy: профиль сброшен (ошибка парсинга)', e);
    return def;
  }
}

/** Сохраняет профиль в localStorage */
function saveProfile() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('tennisAcademy: не удалось сохранить профиль', e);
  }
}

// Загружаем профиль при старте
var profile = loadProfile();

// =====================================================
// ССЫЛКИ НА ЭЛЕМЕНТЫ DOM
// Объявляем ДО любых вызовов addEventListener
// =====================================================
var elOnboardingScreen    = document.getElementById('screen-onboarding');
var elMenuScreen          = document.getElementById('screen-menu');
var elQuestionScreen      = document.getElementById('screen-question');
var elResultsScreen       = document.getElementById('screen-results');
var elConfettiLayer       = document.getElementById('confetti-layer');

// Онбординг
var elAceOnboardingBubble = document.getElementById('ace-onboarding-bubble');
var elBtnStartOnboarding  = document.getElementById('btn-start-onboarding');

// Меню
var elAceMenuBubble       = document.getElementById('ace-menu-bubble');
var elRankLabel           = document.getElementById('rank-label');
var elRankProgressBar     = document.getElementById('rank-progress-bar');
var elRankProgressText    = document.getElementById('rank-progress-text');
var elBtnDaily            = document.getElementById('btn-daily');

// Вопрос
var elStepDots            = document.getElementById('step-dots');
var elGameCounter         = document.getElementById('game-counter');
var elStakeBadge          = document.getElementById('stake-badge');
var elStreakBadge          = document.getElementById('streak-badge');
var elQText               = document.getElementById('q-text');
var elOptionsList         = document.getElementById('options-list');
var elExplanationWrap     = document.getElementById('explanation-wrap');
var elAceReaction         = document.getElementById('ace-reaction');
var elExplanationText     = document.getElementById('explanation-text');
var elNextBtnWrap         = document.getElementById('next-btn-wrap');
var elBtnNext             = document.getElementById('btn-next');

// Итоги
var elResultTitle         = document.getElementById('result-title');
var elAceResultsBubble    = document.getElementById('ace-results-bubble');
var elResultPoints        = document.getElementById('result-points');
var elResultStreak        = document.getElementById('result-streak');
var elResultStarsRow      = document.getElementById('result-stars-row');
var elResultRankProgress  = document.getElementById('result-rank-progress');
var elBtnAgain            = document.getElementById('btn-again');
var elBtnReviewMistakes   = document.getElementById('btn-review-mistakes');
var elMistakesCount       = document.getElementById('mistakes-count');
var elBtnAcademy          = document.getElementById('btn-academy');

// =====================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =====================================================

/** Перемешивает массив на месте (Фишер–Йетс). Возвращает его же. */
function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/** Экранирует HTML-спецсимволы */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Возвращает случайный элемент массива */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Возвращает букву варианта по индексу */
function optionLetter(index) {
  return ['А', 'Б', 'В', 'Г'][index] || '?';
}

/** Порядковый номер сложности для сортировки */
function difficultyOrder(d) {
  return d === 'Б' ? 0 : d === 'С' ? 1 : 2;
}

/** Базовые очки за вопрос по сложности */
function basePoints(d) {
  return d === 'Б' ? 10 : d === 'С' ? 20 : 30;
}

// =====================================================
// ОТБОР ВОПРОСОВ (plan 2.3)
// =====================================================

/**
 * Выбирает n вопросов из pool с учётом истории.
 * n = min(7, pool.length)
 */
function pickGameQuestions(pool, n) {
  if (typeof n === 'undefined') n = Math.min(7, pool.length);
  var hist = profile.history;

  // Три корзины по истории
  var basketA = []; // нет записи в истории
  var basketB = []; // last === 0 (последняя попытка неверна)
  var basketC = []; // освоены (last === 1)

  for (var i = 0; i < pool.length; i++) {
    var q = pool[i];
    var key = String(q.id);
    var rec = hist[key];
    if (!rec) {
      basketA.push(q);
    } else if (rec.last === 0) {
      basketB.push(q);
    } else {
      basketC.push(q);
    }
  }

  // A и B перемешиваем, C сортируем по времени (старейшие первые)
  shuffle(basketA);
  shuffle(basketB);
  basketC.sort(function(a, b) {
    var ta = (hist[String(a.id)] && hist[String(a.id)].t) || 0;
    var tb = (hist[String(b.id)] && hist[String(b.id)].t) || 0;
    return ta - tb;
  });

  // Объединённый пул в порядке приоритета A→B→C
  var ordered = basketA.concat(basketB).concat(basketC);

  // Лёгкий старт: берём до 2 Б-вопросов в начало
  var selected = [];
  var selectedIds = {};
  var bCount = 0;

  for (var k = 0; k < ordered.length && bCount < 2; k++) {
    if (ordered[k].difficulty === 'Б') {
      selected.push(ordered[k]);
      selectedIds[ordered[k].id] = true;
      bCount++;
    }
  }

  // Добор до n из ordered без уже выбранных
  for (var k2 = 0; k2 < ordered.length && selected.length < n; k2++) {
    if (!selectedIds[ordered[k2].id]) {
      selected.push(ordered[k2]);
      selectedIds[ordered[k2].id] = true;
    }
  }

  // Если Б-вопросов не нашлось — просто первые n
  if (bCount === 0) {
    selected = ordered.slice(0, n);
  }

  // Стабильная сортировка Б→С→П
  selected.sort(function(a, b) {
    return difficultyOrder(a.difficulty) - difficultyOrder(b.difficulty);
  });

  return selected;
}

// =====================================================
// ДВИЖОК СЕССИИ (plan 2.5)
// =====================================================

var session = null;

/**
 * Запускает новую сессию.
 * mode: 'daily' | 'block' | 'mistakes' | 'onboarding'
 * pool: массив вопросов
 * blockId: id блока (для mode='block') или не передаётся
 */
function startSession(mode, pool, blockId) {
  var questions;
  if (mode === 'mistakes') {
    // «Разобрать ошибки» — используем вопросы как есть
    questions = pool.slice();
  } else {
    questions = pickGameQuestions(pool);
  }

  var n = questions.length;

  // Формируем очередь элементов {q, slot, isRetry}
  var queue = [];
  for (var i = 0; i < n; i++) {
    queue.push({ q: questions[i], slot: i, isRetry: false });
  }

  var bid = (typeof blockId !== 'undefined') ? blockId : null;

  session = {
    mode: mode,
    blockId: bid,
    pool: pool,           // исходный пул для «Ещё один гейм»
    queue: queue,
    pos: 0,
    n: n,                 // число слотов (не меняется при добавлении retry)
    slots: [],            // 'pending' | 'yellow' | 'green'
    sessionPoints: 0,
    streak: 0,
    bestStreak: 0,
    mistakes: [],         // вопросы с провалом обеих попыток
    answered: false,
    rankBefore: getRank(profile.points),
    starsBefore: (bid !== null) ? getBlockStars(bid) : null
  };

  // Инициализируем слоты
  for (var j = 0; j < n; j++) {
    session.slots.push('pending');
  }

  showScreen('question');
  renderQuestion();
}

// =====================================================
// ЗВЁЗДЫ БЛОКА (plan 2.6)
// =====================================================

/** Считает звёзды блока: 0, 1, 2 или 3 */
function getBlockStars(blockId) {
  var blockQuestions = QUESTION_BANK.questions.filter(function(q) {
    return q.blockId === blockId;
  });
  var total = blockQuestions.length;
  if (total === 0) return 0;

  var mastered = 0;
  for (var i = 0; i < blockQuestions.length; i++) {
    var key = String(blockQuestions[i].id);
    var rec = profile.history[key];
    if (rec && rec.c > 0) mastered++;
  }

  var ratio = mastered / total;
  if (ratio === 1) return 3;
  if (ratio >= 0.8) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}

/** Возвращает HTML-строку со звёздами */
function starsHtml(count) {
  var html = '';
  for (var i = 0; i < 3; i++) {
    html += '<span class="star ' + (i < count ? 'star-filled' : 'star-empty') + '">★</span>';
  }
  return html;
}

// =====================================================
// СМЕНА ЭКРАНОВ
// =====================================================
function showScreen(name) {
  elOnboardingScreen.classList.toggle('hidden', name !== 'onboarding');
  elMenuScreen.classList.toggle('hidden', name !== 'menu');
  elQuestionScreen.classList.toggle('hidden', name !== 'question');
  elResultsScreen.classList.toggle('hidden', name !== 'results');
}

// =====================================================
// РЕНДЕР ЭКРАНА ВОПРОСА (plan 2.10)
// =====================================================
function renderQuestion() {
  var item = session.queue[session.pos];
  var q = item.q;
  var isRetry = item.isRetry;
  session.answered = false;

  // Счётчик вторых подач в очереди (для отображения N/M)
  var retryItems = [];
  for (var ri = 0; ri < session.queue.length; ri++) {
    if (session.queue[ri].isRetry) retryItems.push(ri);
  }
  var retryIndex = retryItems.indexOf(session.pos);

  // Текст счётчика
  if (isRetry) {
    elGameCounter.textContent = 'Вторая подача · ' + (retryIndex + 1) + '/' + retryItems.length + ' · 🎾 ' + session.sessionPoints;
  } else {
    elGameCounter.textContent = 'Гейм: вопрос ' + (item.slot + 1) + '/' + session.n + ' · 🎾 ' + session.sessionPoints;
  }

  // Плашка ставки
  var base = basePoints(q.difficulty);
  var stakeVal = isRetry ? Math.floor(base / 2) : base;
  elStakeBadge.textContent = '🎾 +' + stakeVal;

  // Плашка серии ×2 (показываем при streak >= 3, т.е. множитель уже активен)
  if (session.streak >= 3) {
    elStreakBadge.classList.remove('hidden');
  } else {
    elStreakBadge.classList.add('hidden');
  }

  // Точки-шаги
  renderDots();

  // Текст вопроса
  elQText.textContent = q.text;

  // Скрываем объяснение и кнопку «Дальше»
  elExplanationWrap.classList.add('hidden');
  elNextBtnWrap.classList.add('hidden');

  // Перемешиваем варианты ответа (переиспользуем подход исходного кода)
  var indices = [0, 1, 2, 3];
  shuffle(indices);
  var shuffledOptions = indices.map(function(origIndex) {
    return { text: q.options[origIndex], isCorrect: origIndex === q.correctIndex };
  });

  // Отрисовываем кнопки
  elOptionsList.innerHTML = '';
  for (var i = 0; i < shuffledOptions.length; i++) {
    (function(opt, idx) {
      var btn = document.createElement('button');
      btn.className = 'btn-option';
      btn.innerHTML =
        '<span class="option-letter">' + optionLetter(idx) + ')</span>' +
        '<span class="option-text">' + escapeHtml(opt.text) + '</span>';
      btn.addEventListener('click', function() {
        handleAnswer(idx, opt.isCorrect, q, shuffledOptions, isRetry);
      });
      elOptionsList.appendChild(btn);
    })(shuffledOptions[i], i);
  }

  // Текст кнопки «Дальше»
  updateNextBtnText();
}

/** Обновляет текст кнопки «Дальше»/«К счёту гейма» */
function updateNextBtnText() {
  // Кнопка «К счёту гейма» только если нет больше элементов после текущего
  var isLast = session.pos === session.queue.length - 1;
  elBtnNext.textContent = isLast ? 'К счёту гейма →' : 'Дальше →';
}

/** Отрисовывает точки-шаги (только n слотов, без retry) */
function renderDots() {
  elStepDots.innerHTML = '';
  for (var i = 0; i < session.n; i++) {
    var dot = document.createElement('span');
    dot.className = 'dot dot-' + session.slots[i];
    elStepDots.appendChild(dot);
  }
}

// =====================================================
// ОБРАБОТКА ОТВЕТА (plan 2.4 + 2.5)
// =====================================================
function handleAnswer(clickedIdx, isCorrect, q, shuffledOptions, isRetry) {
  // Защита от повторного клика после ответа
  if (session.answered) return;
  session.answered = true;

  var buttons = elOptionsList.querySelectorAll('.btn-option');

  // Блокируем все кнопки вариантов
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].disabled = true;
  }

  var slot = session.queue[session.pos].slot;
  var base = basePoints(q.difficulty);
  var earned = 0;
  var reaction = '';

  if (isCorrect) {
    // Верный ответ — начисляем очки с учётом серии
    var stakeVal = isRetry ? Math.floor(base / 2) : base;
    var multiplier = (session.streak >= 3) ? 2 : 1;
    earned = stakeVal * multiplier;
    session.streak++;
    if (session.streak > session.bestStreak) session.bestStreak = session.streak;

    // Точка становится зелёной
    session.slots[slot] = 'green';

    // Реакция Эйса
    reaction = isRetry ? pickRandom(ACE_RETRY_CORRECT) : pickRandom(ACE_CORRECT);

    // Анимация правильной кнопки
    for (var bi = 0; bi < buttons.length; bi++) {
      if (shuffledOptions[bi].isCorrect) {
        buttons[bi].classList.add('correct');
        buttons[bi].classList.add('pop-correct');
        // Убираем класс анимации по animationend
        (function(b) {
          b.addEventListener('animationend', function() {
            b.classList.remove('pop-correct');
          }, { once: true });
        })(buttons[bi]);
      }
    }

  } else {
    // Неверный ответ — сбрасываем серию, не сгорают очки
    session.streak = 0;

    // Выбранная неверная кнопка — .not-best (серая), правильная — зелёная
    for (var bi2 = 0; bi2 < buttons.length; bi2++) {
      if (shuffledOptions[bi2].isCorrect) {
        buttons[bi2].classList.add('correct');
      } else if (bi2 === clickedIdx) {
        buttons[bi2].classList.add('not-best');
        // Подпись «не лучший выбор»
        var hint = document.createElement('span');
        hint.className = 'not-best-hint';
        hint.textContent = 'не лучший выбор';
        buttons[bi2].appendChild(hint);
      }
    }

    if (!isRetry) {
      // Первая неверная попытка → добавляем вторую подачу в конец очереди
      session.queue.push({ q: q, slot: slot, isRetry: true });
      session.slots[slot] = 'yellow'; // точка жёлтая
      reaction = pickRandom(ACE_WRONG_FIRST);
    } else {
      // Вторая неверная попытка — точка остаётся жёлтой, вопрос в ошибки
      session.slots[slot] = 'yellow';
      session.mistakes.push(q);
      reaction = pickRandom(ACE_WRONG_SECOND);
    }
    earned = 0;
  }

  // Инкрементально начисляем очки и сохраняем профиль
  session.sessionPoints += earned;
  profile.points += earned;

  // Обновляем историю вопроса
  var key = String(q.id);
  if (!profile.history[key]) {
    profile.history[key] = { c: 0, w: 0, last: 0, t: 0 };
  }
  if (isCorrect) {
    profile.history[key].c++;
    profile.history[key].last = 1;
  } else {
    profile.history[key].w++;
    profile.history[key].last = 0;
  }
  profile.history[key].t = Date.now();

  // Сохраняем профиль после каждого ответа
  saveProfile();

  // Обновляем счётчик
  if (isRetry) {
    elGameCounter.textContent = 'Вторая подача · 🎾 ' + session.sessionPoints;
  } else {
    elGameCounter.textContent = 'Гейм: вопрос ' + (slot + 1) + '/' + session.n + ' · 🎾 ' + session.sessionPoints;
  }

  // Показываем объяснение с реакцией Эйса
  elAceReaction.textContent = reaction;
  elExplanationText.textContent = q.explanation;
  elExplanationWrap.classList.remove('hidden');

  // При верном ответе Эйс подпрыгивает (plan 2.8); класс снимаем
  // по окончании анимации, чтобы она запускалась на каждом верном ответе
  if (isCorrect) {
    var aceInline = elExplanationWrap.querySelector('.ace-inline');
    if (aceInline) {
      aceInline.classList.add('ace-bounce');
      aceInline.addEventListener('animationend', function () {
        aceInline.classList.remove('ace-bounce');
      }, { once: true });
    }
  }

  // Обновляем точки
  renderDots();

  // Показываем кнопку «Дальше» с правильным текстом
  updateNextBtnText();
  elNextBtnWrap.classList.remove('hidden');
}

// =====================================================
// ЭКРАН ИТОГОВ (plan 2.11)
// =====================================================
function showResults() {
  if (session.mode === 'onboarding') {
    showOnboardingResults();
    return;
  }

  // Подсчёт зелёных точек (выигранных вопросов)
  var greenCount = 0;
  for (var i = 0; i < session.slots.length; i++) {
    if (session.slots[i] === 'green') greenCount++;
  }
  var ratio = session.n > 0 ? greenCount / session.n : 0;

  // Заголовок по порогам
  var title = '';
  if (ratio >= 0.85) title = 'Гейм выигран! 🏆';
  else if (ratio >= 0.55) title = 'Отличный розыгрыш! 💪';
  else title = 'Жёсткий гейм, но ты в игре! 🎾';
  elResultTitle.textContent = title;

  // Реплика Эйса по исходу
  var aceReply = '';
  if (ratio >= 0.85) aceReply = pickRandom(ACE_RESULTS_WIN);
  else if (ratio >= 0.55) aceReply = pickRandom(ACE_RESULTS_GOOD);
  else aceReply = pickRandom(ACE_RESULTS_HARD);

  // Проверяем новое звание
  var rankAfter = getRank(profile.points);
  if (rankAfter.min > session.rankBefore.min) {
    // Получено новое звание — специальная реплика и конфетти
    aceReply = ACE_NEW_RANK
      .replace('{emoji}', rankAfter.emoji)
      .replace('{name}', rankAfter.name);
    showConfetti();
  }

  elAceResultsBubble.textContent = aceReply;

  // Очки сессии
  elResultPoints.textContent = '+' + session.sessionPoints + ' 🎾';

  // Лучшая серия (показываем если >= 2)
  if (session.bestStreak >= 2) {
    elResultStreak.textContent = '🔥 Лучшая серия: ' + session.bestStreak + ' подряд';
    elResultStreak.classList.remove('hidden');
  } else {
    elResultStreak.classList.add('hidden');
  }

  // Звёзды блока (только для block-режима)
  elResultStarsRow.classList.add('hidden');
  elResultStarsRow.innerHTML = '';
  if (session.mode === 'block' && session.blockId !== null) {
    var starsNow = getBlockStars(session.blockId);
    var starsBefore = session.starsBefore;
    elResultStarsRow.classList.remove('hidden');
    if (starsBefore !== starsNow) {
      // Изменились — показываем стрелку с анимацией новых звёзд
      elResultStarsRow.innerHTML =
        '<span class="stars-label">Звёзды блока:</span> ' +
        starsHtml(starsBefore) +
        ' <span class="stars-arrow">→</span> ' +
        '<span class="stars-new">' + starsHtml(starsNow) + '</span>';
    } else {
      elResultStarsRow.innerHTML =
        '<span class="stars-label">Звёзды блока:</span> ' + starsHtml(starsNow);
    }
  }

  // Полоса прогресса звания
  renderRankProgress(elResultRankProgress);

  // Кнопки итогов
  elBtnAgain.classList.remove('hidden');
  elBtnReviewMistakes.classList.toggle('hidden', session.mistakes.length === 0);
  elMistakesCount.textContent = session.mistakes.length;

  showScreen('results');
}

// =====================================================
// КОНФЕТТИ (plan 2.11)
// =====================================================
var confettiTimer = null;

function showConfetti() {
  // Сбрасываем прошлый таймер, чтобы он не смёл свежие конфетти раньше времени
  if (confettiTimer !== null) {
    clearTimeout(confettiTimer);
  }
  elConfettiLayer.innerHTML = '';
  var emojis = ['🎾', '✨', '🎾', '✨', '🎉'];
  for (var i = 0; i < 20; i++) {
    var span = document.createElement('span');
    span.className = 'confetti-item';
    span.textContent = emojis[i % emojis.length];
    span.style.left = (Math.random() * 100).toFixed(1) + 'vw';
    span.style.animationDelay = (Math.random() * 1.5).toFixed(2) + 's';
    span.style.animationDuration = (2 + Math.random() * 2).toFixed(2) + 's';
    span.style.fontSize = (1.2 + Math.random() * 1.5).toFixed(1) + 'rem';
    elConfettiLayer.appendChild(span);
  }
  // Очищаем через 4 секунды
  confettiTimer = setTimeout(function() {
    elConfettiLayer.innerHTML = '';
    confettiTimer = null;
  }, 4000);
}

// =====================================================
// РЕНДЕР ПОЛОСЫ ЗВАНИЯ
// =====================================================
function renderRankProgress(container) {
  var rank = getRank(profile.points);
  var nextRank = getNextRank(profile.points);
  var progressHtml = '';

  if (!nextRank) {
    // Максимальное звание
    progressHtml =
      '<div class="rank-bar-outer"><div class="rank-bar-inner" style="width:100%"></div></div>' +
      '<p class="rank-progress-text">Высшее звание Академии! 👑</p>';
  } else {
    var range = nextRank.min - rank.min;
    var done = profile.points - rank.min;
    var pct = Math.round(Math.min(100, (done / range) * 100));
    progressHtml =
      '<div class="rank-bar-outer"><div class="rank-bar-inner" style="width:' + pct + '%"></div></div>' +
      '<p class="rank-progress-text">До звания «' + nextRank.name + '» осталось ' + (nextRank.min - profile.points) + ' 🎾</p>';
  }

  container.innerHTML = progressHtml;
}

// =====================================================
// МЕНЮ (plan 2.7)
// =====================================================
function buildMenu() {
  // Случайная реплика Эйса
  elAceMenuBubble.textContent = pickRandom(ACE_MENU);

  // Звание и полоса прогресса
  var rank = getRank(profile.points);
  elRankLabel.textContent = rank.emoji + ' ' + rank.name;
  renderRankProgressBar();

  // Строим карточки по секциям
  buildSectionCards('court',   document.getElementById('cards-court'));
  buildSectionCards('review',  document.getElementById('cards-review'));
  buildSectionCards('courses', document.getElementById('cards-courses'));
}

/** Рендерит полосу прогресса звания в шапке меню */
function renderRankProgressBar() {
  var rank = getRank(profile.points);
  var nextRank = getNextRank(profile.points);

  if (!nextRank) {
    elRankProgressBar.style.width = '100%';
    elRankProgressText.textContent = 'Высшее звание Академии! 👑';
  } else {
    var range = nextRank.min - rank.min;
    var done = profile.points - rank.min;
    var pct = Math.round(Math.min(100, (done / range) * 100));
    elRankProgressBar.style.width = pct + '%';
    elRankProgressText.textContent = 'До звания «' + nextRank.name + '» осталось ' + (nextRank.min - profile.points) + ' 🎾';
  }
}

/** Строит карточки блоков для одной секции */
function buildSectionCards(sectionName, container) {
  container.innerHTML = '';
  for (var blockId = 0; blockId <= 16; blockId++) {
    var display = BLOCK_DISPLAY[blockId];
    if (!display || display.section !== sectionName) continue;

    // Замыкание для blockId
    (function(bid) {
      var blockQuestions = QUESTION_BANK.questions.filter(function(q) {
        return q.blockId === bid;
      });

      var card = document.createElement('button');
      card.className = 'block-card';

      var stars = getBlockStars(bid);
      card.innerHTML =
        '<span class="card-label">' + escapeHtml(BLOCK_DISPLAY[bid].label) + '</span>' +
        '<span class="card-stars">' + starsHtml(stars) + '</span>';

      card.addEventListener('click', function() {
        startSession('block', blockQuestions, bid);
      });

      container.appendChild(card);
    })(blockId);
  }
}

// =====================================================
// ОНБОРДИНГ (plan 2.12)
// =====================================================
function buildOnboarding() {
  elAceOnboardingBubble.textContent = ACE_ONBOARD_HELLO;
}

function startOnboarding() {
  // Берём 2 Б-вопроса блока 0 + 1 С-вопрос блока 0 (согласованный компромисс по плану)
  var block0 = QUESTION_BANK.questions.filter(function(q) { return q.blockId === 0; });
  var block0B = block0.filter(function(q) { return q.difficulty === 'Б'; });
  var block0C = block0.filter(function(q) { return q.difficulty === 'С'; });

  shuffle(block0B);
  shuffle(block0C);

  // Берём все Б-вопросы блока 0 (их ровно 2)
  var pool = block0B.slice(0, 2);
  // Добираем один С-вопрос
  if (block0C.length > 0) {
    pool.push(block0C[0]);
  }

  // Сортировка Б→С
  pool.sort(function(a, b) {
    return difficultyOrder(a.difficulty) - difficultyOrder(b.difficulty);
  });

  // Формируем очередь вручную (фиксированный набор, без pickGameQuestions)
  var n = pool.length;
  var queue = [];
  for (var i = 0; i < n; i++) {
    queue.push({ q: pool[i], slot: i, isRetry: false });
  }

  session = {
    mode: 'onboarding',
    blockId: 0,
    pool: pool,
    queue: queue,
    pos: 0,
    n: n,
    slots: [],
    sessionPoints: 0,
    streak: 0,
    bestStreak: 0,
    mistakes: [],
    answered: false,
    rankBefore: getRank(profile.points),
    starsBefore: 0
  };
  for (var j = 0; j < n; j++) session.slots.push('pending');

  showScreen('question');
  renderQuestion();
}

/** Показывает итоги онбординга */
function showOnboardingResults() {
  // Сохраняем флаг завершения онбординга
  profile.onboarded = true;
  saveProfile();

  elResultTitle.textContent = '🎉 Зачислен в Академию!';
  elAceResultsBubble.textContent = ACE_ONBOARD_DONE;
  elResultPoints.textContent = '+' + session.sessionPoints + ' 🎾';
  elResultStreak.classList.add('hidden');
  elResultStarsRow.classList.add('hidden');
  renderRankProgress(elResultRankProgress);

  // В режиме онбординга — только кнопка «В Академию»
  elBtnAgain.classList.add('hidden');
  elBtnReviewMistakes.classList.add('hidden');
  elBtnAcademy.textContent = 'В Академию 🎾';

  showScreen('results');
}

// =====================================================
// ОБРАБОТЧИКИ КНОПОК
// =====================================================

// Кнопка «Дальше»
elBtnNext.addEventListener('click', function() {
  session.pos++;
  session.answered = false;

  if (session.pos >= session.queue.length) {
    showResults();
  } else {
    renderQuestion();
  }
});

// Старт онбординга
elBtnStartOnboarding.addEventListener('click', function() {
  startOnboarding();
});

// «Тренировка дня»
elBtnDaily.addEventListener('click', function() {
  startSession('daily', QUESTION_BANK.questions);
});

// «Ещё один гейм!»
elBtnAgain.addEventListener('click', function() {
  if (session.mode === 'daily') {
    startSession('daily', QUESTION_BANK.questions);
  } else if (session.mode === 'block') {
    startSession('block', session.pool, session.blockId);
  } else if (session.mode === 'mistakes') {
    startSession('mistakes', session.pool);
  } else {
    startSession('daily', QUESTION_BANK.questions);
  }
});

// «Разобрать ошибки»
elBtnReviewMistakes.addEventListener('click', function() {
  if (session.mistakes.length > 0) {
    startSession('mistakes', session.mistakes.slice());
  }
});

// «В Академию»
elBtnAcademy.addEventListener('click', function() {
  // Восстанавливаем кнопки, скрытые в режиме онбординга
  elBtnAgain.classList.remove('hidden');
  elBtnAcademy.textContent = 'В Академию';
  buildMenu();
  showScreen('menu');
});

// =====================================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// =====================================================
if (!profile.onboarded) {
  // Новый пользователь — показываем онбординг
  buildOnboarding();
  showScreen('onboarding');
} else {
  // Возвращающийся пользователь — сразу в меню
  buildMenu();
  showScreen('menu');
}
