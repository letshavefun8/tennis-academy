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
var ACE_NEW_BADGE = 'Значок в коллекцию! Загляни в Профиль! 🏆';
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
// РЕЕСТР ЗНАЧКОВ (5 старых наград)
// =====================================================
var BADGES = [
  { id: 'enrolled', emoji: '🎉', name: 'Зачислен',         hint: 'Пройди разминку с Эйсом' },
  { id: 'sniper',   emoji: '🎯', name: 'Снайпер',          hint: 'Выиграй гейм из 5+ вопросов без единой второй подачи' },
  { id: 'streak5',  emoji: '🔥', name: 'Серия 5',          hint: 'Ответь верно 5 раз подряд в одном гейме' },
  { id: 'course',   emoji: '📚', name: 'Спецкурс пройден', hint: 'Собери ★★★ в любом спецкурсе' },
  { id: 'week',     emoji: '🗓', name: 'Неделя в строю',   hint: 'Тренируйся в 3 разных дня' }
];

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
  var def = { v: 1, points: 0, onboarded: false, history: {}, bestStreakEver: 0, days: [], badges: {} };
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return def;
    var obj = JSON.parse(raw);
    // Проверка версии и типа
    if (typeof obj !== 'object' || obj === null || obj.v !== 1) {
      console.warn('tennisAcademy: профиль сброшен (несовместимая версия)');
      return def;
    }
    // Валидация полей поштучно (старые поля)
    var pts = (typeof obj.points === 'number' && obj.points >= 0) ? Math.floor(obj.points) : 0;
    var onboarded = obj.onboarded === true;
    var history = (typeof obj.history === 'object' && obj.history !== null && !Array.isArray(obj.history)) ? obj.history : {};
    // Новые поля (аддитивно, дефолты при отсутствии)
    var bestStreakEver = (typeof obj.bestStreakEver === 'number' && obj.bestStreakEver >= 0) ? Math.floor(obj.bestStreakEver) : 0;
    var days = (Array.isArray(obj.days)) ? obj.days : [];
    var badges = (typeof obj.badges === 'object' && obj.badges !== null && !Array.isArray(obj.badges)) ? obj.badges : {};
    return { v: 1, points: pts, onboarded: onboarded, history: history, bestStreakEver: bestStreakEver, days: days, badges: badges };
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
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДАТ
// =====================================================

/** Возвращает сегодняшнюю дату в формате 'YYYY-MM-DD' по локальному времени (не UTC!) */
function todayStr() {
  var d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1);
  var day = String(d.getDate());
  if (m.length < 2) m = '0' + m;
  if (day.length < 2) day = '0' + day;
  return y + '-' + m + '-' + day;
}

/** Форматирует timestamp в строку «дд.мм.гггг» */
function formatDate(ts) {
  var d = new Date(ts);
  var day = String(d.getDate());
  var m = String(d.getMonth() + 1);
  var y = d.getFullYear();
  if (day.length < 2) day = '0' + day;
  if (m.length < 2) m = '0' + m;
  return day + '.' + m + '.' + y;
}

// =====================================================
// ССЫЛКИ НА ЭЛЕМЕНТЫ DOM
// Объявляем ДО любых вызовов addEventListener
// =====================================================
var elOnboardingScreen    = document.getElementById('screen-onboarding');
var elMenuScreen          = document.getElementById('screen-menu');
var elQuestionScreen      = document.getElementById('screen-question');
var elResultsScreen       = document.getElementById('screen-results');
var elConfettiLayer       = document.getElementById('confetti-layer');
var elAuthScreen          = document.getElementById('screen-auth');
var elWallScreen          = document.getElementById('screen-wall');

// Онбординг
var elAceOnboardingBubble = document.getElementById('ace-onboarding-bubble');
var elBtnStartOnboarding  = document.getElementById('btn-start-onboarding');

// Меню
var elAceMenuBubble       = document.getElementById('ace-menu-bubble');
var elRankLabel           = document.getElementById('rank-label');
var elRankProgressBar     = document.getElementById('rank-progress-bar');
var elRankProgressText    = document.getElementById('rank-progress-text');
var elBtnDaily            = document.getElementById('btn-daily');
var elMenuPlayerName      = document.getElementById('menu-player-name');

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
var elResultBadges        = document.getElementById('result-badges');
var elResultStarsRow      = document.getElementById('result-stars-row');
var elResultRankProgress  = document.getElementById('result-rank-progress');
var elBtnAgain            = document.getElementById('btn-again');
var elBtnReviewMistakes   = document.getElementById('btn-review-mistakes');
var elMistakesCount       = document.getElementById('mistakes-count');
var elBtnAcademy          = document.getElementById('btn-academy');

// Кнопка «Выйти из гейма» на экране вопросов
var elBtnExitGame         = document.getElementById('btn-exit-game');
var elBtnSkipOnboarding   = document.getElementById('btn-skip-onboarding');

// Профиль (бывший «Зал славы»)
var elBtnHall             = document.getElementById('btn-hall');
var elBtnHallBack         = document.getElementById('btn-hall-back');
var elHallScreen          = document.getElementById('screen-hall');

// Стена академии
var elBtnWall             = document.getElementById('btn-wall');
var elBtnWallBack         = document.getElementById('btn-wall-back');

// Кнопка выхода из аккаунта
var elBtnLogout           = document.getElementById('btn-logout');
var elBtnGuestLogin       = document.getElementById('btn-guest-login');

// Табы экрана регистрации / входа
var elAuthTabRegister     = document.getElementById('auth-tab-register');
var elAuthTabLogin        = document.getElementById('auth-tab-login');
var elAuthFormRegister    = document.getElementById('auth-form-register');
var elAuthFormLogin       = document.getElementById('auth-form-login');

// Поля и элементы формы входа
var elLoginName           = document.getElementById('login-name');
var elLoginPin            = document.getElementById('login-pin');
var elLoginError          = document.getElementById('login-error');
var elBtnLoginSubmit      = document.getElementById('btn-login-submit');

// Тост для значков
var elBadgeToast          = document.getElementById('badge-toast');

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

// =====================================================
// СИСТЕМА ЗНАЧКОВ
// =====================================================

// Очередь тостов и флаг активности
var toastQueue = [];
var toastActive = false;

/**
 * Выдаёт значок игроку.
 * quiet=true — без тоста (ретроактивная выдача при старте).
 * Возвращает true, если значок выдан впервые.
 */
function awardBadge(id, quiet) {
  // Уже есть — пропускаем
  if (profile.badges[id]) return false;

  // Записываем метку времени и сохраняем профиль
  profile.badges[id] = Date.now();
  saveProfile();

  // Если есть активная сессия — фиксируем в session.newBadges
  if (session && session.newBadges) {
    session.newBadges.push(id);
  }

  // Тост при не-тихом вручении
  if (!quiet) {
    var def = null;
    for (var i = 0; i < BADGES.length; i++) {
      if (BADGES[i].id === id) { def = BADGES[i]; break; }
    }
    if (def) {
      showBadgeToast('🏅 Новый значок: ' + def.emoji + ' ' + def.name + '!');
    }
  }

  return true;
}

/** Добавляет сообщение в очередь тостов и запускает показ, если не активен */
function showBadgeToast(msg) {
  toastQueue.push(msg);
  if (!toastActive) processToastQueue();
}

/** Берёт следующий тост из очереди и показывает его */
function processToastQueue() {
  if (toastQueue.length === 0) {
    toastActive = false;
    return;
  }
  toastActive = true;
  var msg = toastQueue.shift();
  elBadgeToast.textContent = msg;
  elBadgeToast.classList.remove('hidden');
  // Перезапускаем анимацию
  elBadgeToast.classList.remove('badge-toast-show');
  // Принудительный reflow для перезапуска анимации
  void elBadgeToast.offsetWidth;
  elBadgeToast.classList.add('badge-toast-show');
  setTimeout(function() {
    elBadgeToast.classList.add('hidden');
    elBadgeToast.classList.remove('badge-toast-show');
    toastActive = false;
    // Показываем следующий тост с небольшой паузой
    setTimeout(processToastQueue, 400);
  }, 3000);
}

/**
 * Ретроактивная выдача значков при инициализации — тихо, без тостов.
 * Вызывается один раз после loadProfile, до показа экранов.
 */
function checkRetroBadges() {
  var changed = false;
  // Зачислен: если онбординг уже пройден
  if (profile.onboarded) {
    if (awardBadge('enrolled', true)) changed = true;
  }
  // Спецкурс: проверяем блоки 7–16
  for (var bid = 7; bid <= 16; bid++) {
    if (getBlockStars(bid) === 3) {
      if (awardBadge('course', true)) changed = true;
    }
  }
  // При изменениях saveProfile уже вызван внутри awardBadge
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
    starsBefore: (bid !== null) ? getBlockStars(bid) : null,
    newBadges: []         // значки, полученные в этом гейме
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
  elAuthScreen.classList.toggle('hidden', name !== 'auth');
  elOnboardingScreen.classList.toggle('hidden', name !== 'onboarding');
  elMenuScreen.classList.toggle('hidden', name !== 'menu');
  elQuestionScreen.classList.toggle('hidden', name !== 'question');
  elResultsScreen.classList.toggle('hidden', name !== 'results');
  elHallScreen.classList.toggle('hidden', name !== 'hall');
  elWallScreen.classList.toggle('hidden', name !== 'wall');
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
    // Обновляем рекорд серии за всё время
    if (session.streak > profile.bestStreakEver) profile.bestStreakEver = session.streak;
    // Значок «Серия 5» — выдаётся сразу в гейме
    if (session.streak >= 5) awardBadge('streak5', false);

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

  // Трекинг дня (локальная дата, не UTC!)
  var today = todayStr();
  if (profile.days.indexOf(today) === -1) {
    profile.days.push(today);
    // «Неделя в строю» — 3 разных дня
    if (profile.days.length >= 3) awardBadge('week', false);
  }

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

  // Проверка «Снайпер»: настоящий гейм (не онбординг и не разбор ошибок),
  // n>=5, ни одной второй подачи (queue.length === n — retry не добавлялись)
  if (session.mode !== 'mistakes' && session.n >= 5 && session.queue.length === session.n) {
    awardBadge('sniper', false);
  }

  // Проверка «Спецкурс»: после ЛЮБОГО гейма
  for (var bid2 = 7; bid2 <= 16; bid2++) {
    if (getBlockStars(bid2) === 3) awardBadge('course', false);
  }

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

  // Проверяем новое звание — приоритетная реплика, конфетти
  var gotNewRank = false;
  var rankAfter = getRank(profile.points);
  if (rankAfter.min > session.rankBefore.min) {
    // Получено новое звание — специальная реплика и конфетти
    aceReply = ACE_NEW_RANK
      .replace('{emoji}', rankAfter.emoji)
      .replace('{name}', rankAfter.name);
    showConfetti();
    gotNewRank = true;

    // Публикуем событие повышения звания в ленту (только при наличии аккаунта)
    var acct = loadAccount();
    if (acct) {
      cloudPostFeedEvent(
        'rank_up',
        acct.name + ' получил новое звание: ' + rankAfter.emoji + ' ' + rankAfter.name + '!',
        rankAfter.emoji
      );
    }
  }

  // Звёзды блока (только для block-режима) — проверяем до вывода
  elResultStarsRow.classList.add('hidden');
  elResultStarsRow.innerHTML = '';
  if (session.mode === 'block' && session.blockId !== null) {
    var starsNow = getBlockStars(session.blockId);
    var starsBefore = session.starsBefore;
    elResultStarsRow.classList.remove('hidden');
    if (starsBefore !== starsNow) {
      elResultStarsRow.innerHTML =
        '<span class="stars-label">Звёзды блока:</span> ' +
        starsHtml(starsBefore) +
        ' <span class="stars-arrow">→</span> ' +
        '<span class="stars-new">' + starsHtml(starsNow) + '</span>';

      // Публикуем событие получения ★★★ (только при переходе к трём звёздам)
      if (starsNow === 3) {
        var acct2 = loadAccount();
        if (acct2) {
          var blockLabel = BLOCK_DISPLAY[session.blockId] ? BLOCK_DISPLAY[session.blockId].label : 'блок ' + session.blockId;
          cloudPostFeedEvent(
            'block_stars',
            acct2.name + ' собрал ★★★ в блоке «' + blockLabel + '»!',
            '⭐'
          );
        }
      }
    } else {
      elResultStarsRow.innerHTML =
        '<span class="stars-label">Звёзды блока:</span> ' + starsHtml(starsNow);
    }
  }

  // Публикуем событие завершения тренировки дня — не чаще одного раза в день
  if (session.mode === 'daily') {
    var acct3 = loadAccount();
    if (acct3) {
      var dailyFeedKey = 'tennisAcademy.lastDailyFeed';
      var lastDailyFeed = localStorage.getItem(dailyFeedKey);
      var todayForFeed = todayStr();
      if (lastDailyFeed !== todayForFeed) {
        // Сегодня ещё не публиковали — публикуем и запоминаем дату
        localStorage.setItem(dailyFeedKey, todayForFeed);
        cloudPostFeedEvent(
          'daily_done',
          acct3.name + ' завершил тренировку дня! +' + session.sessionPoints + ' 🎾',
          '⚡'
        );
      }
    }
  }

  // Строка значков на итогах
  elResultBadges.classList.add('hidden');
  elResultBadges.textContent = '';
  if (session.newBadges && session.newBadges.length > 0) {
    // Если не получили новое звание — ещё и реплика Эйса про значок
    if (!gotNewRank) {
      aceReply = ACE_NEW_BADGE;
    }
    // Собираем строку со всеми новыми значками
    var badgeNames = [];
    for (var bi = 0; bi < session.newBadges.length; bi++) {
      var badgeId = session.newBadges[bi];
      for (var bj = 0; bj < BADGES.length; bj++) {
        if (BADGES[bj].id === badgeId) {
          badgeNames.push(BADGES[bj].emoji + ' ' + BADGES[bj].name);
          break;
        }
      }
    }
    elResultBadges.textContent = '🏅 Новые значки: ' + badgeNames.join(', ');
    elResultBadges.classList.remove('hidden');
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

  // Полоса прогресса звания
  renderRankProgress(elResultRankProgress);

  // Кнопки итогов
  elBtnAgain.classList.remove('hidden');
  elBtnReviewMistakes.classList.toggle('hidden', session.mistakes.length === 0);
  elMistakesCount.textContent = session.mistakes.length;

  // Синкаем профиль в облако ПОСЛЕ гейма (не на каждый ответ!)
  cloudSyncProfile();

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

  // Имя игрока в заголовке (если есть аккаунт)
  var acct = loadAccount();
  if (acct && acct.name) {
    elMenuPlayerName.textContent = acct.name + ' — Академия 🎾';
  } else {
    elMenuPlayerName.textContent = 'Академия тенниса';
  }

  // Строим карточки по секциям
  buildSectionCards('court',   document.getElementById('cards-court'));
  buildSectionCards('review',  document.getElementById('cards-review'));
  buildSectionCards('courses', document.getElementById('cards-courses'));

  // Есть аккаунт → кнопка «Выйти»; гость при настроенном облаке →
  // кнопка «Войти или зарегистрироваться» (без облака регистрация невозможна).
  var cloudConfigured = (typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG !== null);
  if (acct) {
    elBtnLogout.classList.remove('hidden');
    elBtnGuestLogin.classList.add('hidden');
  } else {
    elBtnLogout.classList.add('hidden');
    if (cloudConfigured) {
      elBtnGuestLogin.classList.remove('hidden');
    } else {
      elBtnGuestLogin.classList.add('hidden');
    }
  }
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

// =====================================================
// ПРОФИЛЬ (переработанный «Зал славы»)
// =====================================================

/**
 * Рендерит экран «Профиль».
 * playerData — если передан, показываем чужой профиль (read-only).
 * Без параметра — показываем свой профиль из локального хранилища.
 */
function renderHall(playerData) {
  var isOwnProfile = !playerData;
  var rank, pts, bestStreak, daysCount, blockStarsData, badgesData;

  if (isOwnProfile) {
    // Локальный профиль
    pts        = profile.points;
    bestStreak = profile.bestStreakEver;
    daysCount  = Array.isArray(profile.days) ? profile.days.length : 0;
    rank       = getRank(pts);
    blockStarsData = null; // null = считаем из локального профиля
    badgesData     = profile.badges;
  } else {
    // Облачный профиль другого игрока
    pts        = playerData.points || 0;
    bestStreak = playerData.bestStreakEver || 0;
    daysCount  = playerData.daysCount || 0;
    rank       = getRank(pts);
    blockStarsData = playerData.blockStars || {}; // { '0': 3, '1': 2, ... }
    badgesData     = null; // значки чужих игроков не храним в облаке
  }

  // Заголовок профиля
  var elHallPlayerName = document.getElementById('hall-player-name');
  var elHallReadonly   = document.getElementById('hall-readonly-label');

  if (isOwnProfile) {
    var acct = loadAccount();
    elHallPlayerName.textContent = (acct && acct.name) ? '🏆 ' + acct.name : '🏆 Профиль';
    elHallReadonly.classList.add('hidden');
  } else {
    elHallPlayerName.textContent = '🏆 ' + escapeHtml(playerData.name || 'Игрок');
    elHallReadonly.classList.remove('hidden');
  }

  // Звание
  var elHallRank = document.getElementById('hall-rank');
  elHallRank.textContent = rank.emoji + ' ' + rank.name;

  // Очки
  var elHallPoints = document.getElementById('hall-points');
  elHallPoints.textContent = pts + ' 🎾';

  // Рекордная серия
  var elHallBestStreak = document.getElementById('hall-best-streak');
  elHallBestStreak.textContent = bestStreak;

  // Дней тренировок
  var elHallDaysCount = document.getElementById('hall-days-count');
  elHallDaysCount.textContent = daysCount;

  // ---- Полка 17 блоков ----
  var blocksShelf = document.getElementById('blocks-shelf');
  blocksShelf.innerHTML = '';

  var litCount = 0; // сколько блоков с ★★★

  for (var bid = 0; bid <= 16; bid++) {
    var stars;
    if (isOwnProfile) {
      stars = getBlockStars(bid);
    } else {
      stars = parseInt(blockStarsData[String(bid)], 10) || 0;
    }

    if (stars === 3) litCount++;

    var display = BLOCK_DISPLAY[bid];
    var label   = display ? display.label : 'Блок ' + bid;
    // Первый символ label — эмодзи блока; остаток — текст
    var parts    = label.split(' ');
    var blockEmoji = parts[0];
    var blockName  = parts.slice(1).join(' ');

    var cell = document.createElement('div');
    cell.className = 'block-badge' + (stars === 3 ? ' block-badge-lit' : ' block-badge-dim');
    cell.title = label + ' — ' + stars + '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars);
    cell.innerHTML =
      '<span class="block-badge-emoji">' + blockEmoji + '</span>' +
      '<span class="block-badge-name">' + escapeHtml(blockName) + '</span>' +
      '<span class="block-badge-stars">' + starsHtml(stars) + '</span>';

    blocksShelf.appendChild(cell);
  }

  // Подпись под полкой
  var elBlocksTitle = document.getElementById('hall-blocks-title');
  elBlocksTitle.textContent = 'Значки блоков — собрано ' + litCount + ' из 17';

  // ---- Старые 5 наград BADGES (только для своего профиля) ----
  var elShelfTitle = document.getElementById('hall-shelf-title');
  var shelf        = document.getElementById('badges-shelf');
  shelf.innerHTML  = '';

  if (isOwnProfile) {
    var earned = 0;
    for (var k = 0; k < BADGES.length; k++) {
      if (badgesData[BADGES[k].id]) earned++;
    }
    elShelfTitle.textContent = 'Достижения — собрано ' + earned + ' из ' + BADGES.length;

    for (var i = 0; i < BADGES.length; i++) {
      var def = BADGES[i];
      var ts  = badgesData[def.id];
      var isEarned = !!ts;

      var card = document.createElement('div');
      card.className = 'badge-card' + (isEarned ? ' earned' : ' goal');

      if (isEarned) {
        card.innerHTML =
          '<div class="badge-emoji">' + def.emoji + '</div>' +
          '<div class="badge-name">' + escapeHtml(def.name) + '</div>' +
          '<div class="badge-date">получен ' + escapeHtml(formatDate(ts)) + '</div>';
      } else {
        card.innerHTML =
          '<div class="badge-emoji badge-emoji-goal">' + def.emoji + '</div>' +
          '<div class="badge-name">' + escapeHtml(def.name) + '</div>' +
          '<div class="badge-hint">Попробуй: ' + escapeHtml(def.hint) + '</div>';
      }

      shelf.appendChild(card);
    }
  } else {
    // Для чужого профиля достижения не показываем
    elShelfTitle.textContent = '';
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
    starsBefore: 0,
    newBadges: []         // значки, полученные в онбординге
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

  // Выдаём значок «Зачислен»
  awardBadge('enrolled', false);

  elResultTitle.textContent = '🎉 Зачислен в Академию!';
  elAceResultsBubble.textContent = ACE_ONBOARD_DONE;
  elResultPoints.textContent = '+' + session.sessionPoints + ' 🎾';
  elResultStreak.classList.add('hidden');
  elResultBadges.classList.add('hidden');
  elResultStarsRow.classList.add('hidden');
  renderRankProgress(elResultRankProgress);

  // В режиме онбординга — только кнопка «В Академию»
  elBtnAgain.classList.add('hidden');
  elBtnReviewMistakes.classList.add('hidden');
  elBtnAcademy.textContent = 'В Академию 🎾';

  // Синкаем профиль в облако после онбординга
  cloudSyncProfile();

  showScreen('results');
}

// =====================================================
// СТЕНА АКАДЕМИИ
// =====================================================

// Отписка от onSnapshot (чтобы не множить слушателей)
var feedUnsubscribe = null;

/** Открывает экран «Стена академии», загружает рейтинг и ленту */
function openWall() {
  showScreen('wall');

  // Рейтинг
  var lbWrap = document.getElementById('leaderboard-wrap');
  lbWrap.innerHTML = '<p class="wall-loading">Загружаем рейтинг...</p>';

  cloudLoadLeaderboard().then(function(players) {
    renderLeaderboard(lbWrap, players);
  });

  // Лента (real-time)
  var feedWrap = document.getElementById('feed-wrap');
  feedWrap.innerHTML = '<p class="wall-loading">Загружаем события...</p>';

  // Отписываемся от предыдущей подписки
  if (feedUnsubscribe) {
    feedUnsubscribe();
    feedUnsubscribe = null;
  }

  feedUnsubscribe = cloudLoadFeed(function(events) {
    renderFeed(feedWrap, events);
  });
}

/**
 * Рендерит таблицу недельного рейтинга.
 * players — массив { uid, name, weeklyPoints, rankName, points }
 */
function renderLeaderboard(container, players) {
  if (!players || players.length === 0) {
    container.innerHTML = '<p class="wall-empty">Пока никого нет — стань первым! 🎾</p>';
    return;
  }

  var html = '<table class="leaderboard-table">';
  html += '<thead><tr><th>#</th><th>Игрок</th><th>За неделю 🎾</th></tr></thead><tbody>';

  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    var rowClass = (i === 0) ? ' class="lb-first"' : (i === 1) ? ' class="lb-second"' : (i === 2) ? ' class="lb-third"' : '';
    var medal    = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
    // Имя кликабельно — открывает профиль игрока
    html += '<tr' + rowClass + '>' +
      '<td class="lb-pos">' + medal + '</td>' +
      '<td class="lb-name"><span class="player-link" data-uid="' + escapeHtml(p.uid) + '">' + escapeHtml(p.name) + '</span></td>' +
      '<td class="lb-pts">' + p.weeklyPoints + '</td>' +
      '</tr>';
  }

  html += '</tbody></table>';
  container.innerHTML = html;

  // Навешиваем обработчики на имена
  var links = container.querySelectorAll('.player-link');
  for (var j = 0; j < links.length; j++) {
    (function(link) {
      link.addEventListener('click', function() {
        var uid = link.getAttribute('data-uid');
        openPlayerProfile(uid);
      });
    })(links[j]);
  }
}

/**
 * Рендерит ленту событий.
 * events — массив { uid, name, type, text, emoji, ts }
 */
function renderFeed(container, events) {
  if (!events || events.length === 0) {
    container.innerHTML = '<p class="wall-empty">Лента пуста — сыграй гейм, и твоё событие появится здесь! 🎾</p>';
    return;
  }

  var html = '';
  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    // ts может быть Firestore Timestamp или число (из офлайн-очереди)
    var tsNum = ev.ts && typeof ev.ts === 'object' && ev.ts.seconds
      ? ev.ts.seconds * 1000
      : (typeof ev.ts === 'number' ? ev.ts : 0);
    var dateStr = tsNum ? formatDate(tsNum) : '';

    html += '<div class="feed-card">' +
      '<span class="feed-emoji">' + escapeHtml(ev.emoji || '🎾') + '</span>' +
      '<div class="feed-body">' +
        '<span class="feed-name player-link" data-uid="' + escapeHtml(ev.uid) + '">' + escapeHtml(ev.name || 'Игрок') + '</span>' +
        '<span class="feed-text"> — ' + escapeHtml(ev.text || '') + '</span>' +
        (dateStr ? '<span class="feed-date">' + dateStr + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  container.innerHTML = html;

  // Навешиваем обработчики на имена
  var links = container.querySelectorAll('.player-link');
  for (var j = 0; j < links.length; j++) {
    (function(link) {
      link.addEventListener('click', function() {
        var uid = link.getAttribute('data-uid');
        openPlayerProfile(uid);
      });
    })(links[j]);
  }
}

/**
 * Открывает профиль игрока по uid.
 * Загружает данные из облака и показывает экран Hall.
 */
function openPlayerProfile(uid) {
  // Уходим со Стены — отписываемся от live-ленты, чтобы не текла подписка
  if (feedUnsubscribe) {
    feedUnsubscribe();
    feedUnsubscribe = null;
  }

  // Проверяем: если это свой uid — показываем локальный профиль
  var acct = loadAccount();
  if (acct && acct.uid === uid) {
    renderHall();
    showScreen('hall');
    return;
  }

  // Чужой профиль — загружаем из облака
  cloudLoadPlayer(uid).then(function(playerData) {
    if (!playerData) {
      showBadgeToast('Профиль не найден');
      return;
    }
    renderHall(playerData);
    showScreen('hall');
  });
}

// =====================================================
// ЭКРАН AUTH: РЕГИСТРАЦИЯ / ВХОД
// =====================================================

/**
 * Показывает экран аутентификации в нужном режиме.
 * mode: 'register' (по умолчанию) | 'login'
 */
function showAuthScreen(mode) {
  var isLogin = (mode === 'login');

  // Переключаем видимость форм и активность табов
  if (isLogin) {
    elAuthFormRegister.classList.add('hidden');
    elAuthFormLogin.classList.remove('hidden');
    elAuthTabLogin.classList.add('auth-tab-active');
    elAuthTabRegister.classList.remove('auth-tab-active');
    document.getElementById('ace-auth-bubble').textContent =
      'С возвращением! Введи своё имя и ПИН — и сразу на корт! 🎾';
  } else {
    elAuthFormLogin.classList.add('hidden');
    elAuthFormRegister.classList.remove('hidden');
    elAuthTabRegister.classList.add('auth-tab-active');
    elAuthTabLogin.classList.remove('auth-tab-active');
    document.getElementById('ace-auth-bubble').textContent =
      'Привет! Я Эйс. Давай заведём твой аккаунт — придумай имя и секретный ПИН! 🎾';
  }

  // Очищаем поля и ошибки формы регистрации
  var regErr = document.getElementById('auth-error');
  regErr.textContent = '';
  regErr.classList.add('hidden');
  document.getElementById('auth-name').value = '';
  document.getElementById('auth-pin').value = '';

  // Очищаем поля и ошибки формы входа
  elLoginError.textContent = '';
  elLoginError.classList.add('hidden');
  elLoginName.value = '';
  elLoginPin.value = '';

  showScreen('auth');
}

// Счётчик неудачных попыток входа (защита от перебора на клиенте)
var loginAttempts = 0;
var loginLockTimer = null;

/**
 * Возвращает мягкую реплику Эйса по коду ошибки Firebase Auth.
 */
function mapAuthError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Ой, это имя уже занято! Попробуй другое или войди во вкладке «У меня есть аккаунт» 🎾';
    case 'auth/user-not-found':
      return 'Не нашёл такого игрока. Проверь имя — или заведи новый аккаунт 🌟';
    case 'auth/wrong-password':
      return 'ПИН не подошёл. Попробуй ещё раз 🔑';
    case 'auth/invalid-credential':
      // Современные SDK объединяют user-not-found + wrong-password в один код
      return 'Имя или ПИН не совпадают. Проверь и попробуй ещё раз 🎾';
    case 'auth/invalid-email':
      return 'Хм, с этим именем не получается. Попробуй буквами 🎾';
    case 'auth/too-many-requests':
      return 'Слишком много попыток! Давай передохнём минутку ⏳';
    case 'auth/network-request-failed':
    case 'no-cloud':
      return 'Кажется, нет интернета. Проверь сеть и попробуй снова 📡';
    case 'auth/operation-not-allowed':
    case 'auth/weak-password':
    default:
      return 'Что-то пошло не так. Попробуй ещё раз.';
  }
}

/**
 * Применяет данные облачного аккаунта после входа.
 * Сливает локальный прогресс с облачным (если локальный не пустой).
 * uid — uid вошедшего пользователя, name — отображаемое имя.
 */
function applyAccountAfterSignIn(uid, name) {
  cloudLoadPlayer(uid).then(function(cloudData) {
    var localPts = profile.points || 0;

    // Облачный профиль не загрузился (нет сети/ошибка) — НЕ затираем
    // локальный прогресс нулями. Оставляем как есть и идём в меню.
    if (!cloudData) {
      profile.onboarded = true;
      saveProfile();
      if (localPts > 0) {
        showBadgeToast('Не удалось загрузить данные аккаунта — прогресс сохранён локально');
      }
      buildMenu();
      showScreen('menu');
      return;
    }

    var cloudPts = (typeof cloudData.points === 'number') ? cloudData.points : 0;
    var cloudBest = (typeof cloudData.bestStreakEver === 'number') ? cloudData.bestStreakEver : 0;

    if (localPts > 0) {
      // Локальный прогресс есть — предлагаем слияние
      var merge = confirm(
        'У тебя на этом устройстве уже есть прогресс (' + localPts + ' мячей). ' +
        'Добавить его к аккаунту? (Отмена — войти с прогрессом из аккаунта)'
      );

      if (merge) {
        // Берём максимум из локального и облачного
        profile.points = Math.max(localPts, cloudPts);
        profile.bestStreakEver = Math.max(profile.bestStreakEver || 0, cloudBest);
        profile.onboarded = true;
        saveProfile();
        cloudSyncProfile();
      } else {
        // Загружаем из облака (отбрасываем локальный прогресс)
        profile.points = cloudPts;
        profile.bestStreakEver = cloudBest;
        profile.onboarded = true;
        saveProfile();
      }
    } else {
      // Локального прогресса нет — просто применяем из облака
      profile.points = cloudPts;
      profile.bestStreakEver = cloudBest;
      profile.onboarded = true;
      saveProfile();
    }

    buildMenu();
    showScreen('menu');
  });
}

/** Обработчик таба «Я новенький» */
elAuthTabRegister.addEventListener('click', function() {
  showAuthScreen('register');
});

/** Обработчик таба «У меня есть аккаунт» */
elAuthTabLogin.addEventListener('click', function() {
  showAuthScreen('login');
});

/** Обработчик кнопки «В Академию!» на форме регистрации */
document.getElementById('btn-auth-submit').addEventListener('click', function() {
  var name = document.getElementById('auth-name').value;
  var pin  = document.getElementById('auth-pin').value;
  var errEl = document.getElementById('auth-error');

  // Клиентская валидация до отправки
  if (!name || name.trim().length < 1) {
    errEl.textContent = 'Введи своё имя!';
    errEl.classList.remove('hidden');
    return;
  }
  if (!/^\d{4}$/.test(pin)) {
    errEl.textContent = 'ПИН — ровно 4 цифры (0-9)';
    errEl.classList.remove('hidden');
    return;
  }

  errEl.classList.add('hidden');
  var btn = document.getElementById('btn-auth-submit');
  btn.disabled = true;
  btn.textContent = 'Регистрируемся...';

  cloudRegister(name.trim(), pin).then(function(result) {
    btn.disabled = false;
    btn.textContent = 'В Академию! 🎾';

    if (result.ok) {
      // Регистрация успешна — показываем онбординг или меню
      if (!profile.onboarded) {
        buildOnboarding();
        showScreen('onboarding');
      } else {
        buildMenu();
        showScreen('menu');
      }
    } else {
      // Мягкая реплика Эйса по коду ошибки; если кода нет —
      // показываем конкретный текст серверной валидации
      errEl.textContent = result.code ? mapAuthError(result.code) : (result.error || 'Ошибка. Попробуй ещё раз.');
      errEl.classList.remove('hidden');
    }
  });
});

/** Обработчик кнопки «На корт!» на форме входа */
elBtnLoginSubmit.addEventListener('click', function() {
  var name = elLoginName.value;
  var pin  = elLoginPin.value;

  // Клиентская валидация
  if (!name || name.trim().length < 1) {
    elLoginError.textContent = 'Введи своё имя!';
    elLoginError.classList.remove('hidden');
    return;
  }
  if (!/^\d{4}$/.test(pin)) {
    elLoginError.textContent = 'ПИН — ровно 4 цифры (0-9)';
    elLoginError.classList.remove('hidden');
    return;
  }

  elLoginError.classList.add('hidden');
  elBtnLoginSubmit.disabled = true;
  elBtnLoginSubmit.textContent = 'Входим...';

  cloudSignIn(name.trim(), pin).then(function(result) {
    elBtnLoginSubmit.disabled = false;
    elBtnLoginSubmit.textContent = 'На корт! 🎾';

    if (result.ok) {
      // Успешный вход — сбрасываем счётчик
      loginAttempts = 0;
      applyAccountAfterSignIn(result.uid, name.trim());
    } else {
      // Счётчик неудачных попыток
      loginAttempts++;

      // После 5 неудач — блокируем на 30 секунд
      if (loginAttempts >= 5) {
        elBtnLoginSubmit.disabled = true;
        elBtnLoginSubmit.textContent = 'Сделаем паузу на полминуты 🎾';
        if (loginLockTimer) clearTimeout(loginLockTimer);
        loginLockTimer = setTimeout(function() {
          loginAttempts = 0;
          elBtnLoginSubmit.disabled = false;
          elBtnLoginSubmit.textContent = 'На корт! 🎾';
          loginLockTimer = null;
        }, 30000);
      }

      elLoginError.textContent = mapAuthError(result.code);
      elLoginError.classList.remove('hidden');
    }
  });
});

/** Обработчик «Сначала попробую без регистрации →» — уходим в локальный режим */
document.getElementById('btn-auth-skip').addEventListener('click', function() {
  if (!profile.onboarded) {
    buildOnboarding();
    showScreen('onboarding');
  } else {
    buildMenu();
    showScreen('menu');
  }
});

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

// «← В Академию» в гейме (выход без итогов)
elBtnExitGame.addEventListener('click', function() {
  if (session && session.mode === 'onboarding') {
    // Выход из онбординга — засчитываем как завершённый
    profile.onboarded = true;
    saveProfile();
    awardBadge('enrolled', false);
  }
  session = null;
  buildMenu();
  showScreen('menu');
});

// «Сразу в Академию →» на экране онбординга
elBtnSkipOnboarding.addEventListener('click', function() {
  profile.onboarded = true;
  saveProfile();
  awardBadge('enrolled', false);
  session = null;
  buildMenu();
  showScreen('menu');
});

// «🏆 Профиль» в меню
elBtnHall.addEventListener('click', function() {
  renderHall();
  showScreen('hall');
});

// «← В Академию» в Профиле
elBtnHallBack.addEventListener('click', function() {
  buildMenu();
  showScreen('menu');
});

// «📣 Стена академии» в меню
elBtnWall.addEventListener('click', function() {
  openWall();
});

// «← В Академию» на Стене
elBtnWallBack.addEventListener('click', function() {
  // Отписываемся от live-feed при выходе
  if (feedUnsubscribe) {
    feedUnsubscribe();
    feedUnsubscribe = null;
  }
  buildMenu();
  showScreen('menu');
});

// «Выйти» — выход из аккаунта
elBtnLogout.addEventListener('click', function() {
  cloudSignOut().then(function() {
    showAuthScreen('login');
  });
});

// Гость нажимает «Войти или зарегистрироваться» — ведём на экран auth.
// По умолчанию вкладка регистрации (локальный прогресс мигрирует в новый
// аккаунт), но на экране можно переключиться на вход.
elBtnGuestLogin.addEventListener('click', function() {
  showAuthScreen('register');
});

// =====================================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// =====================================================

// Ретроактивная выдача значков (тихо, без тостов)
checkRetroBadges();

/**
 * Запускает приложение после инициализации Firebase и резолва onAuthStateChanged.
 * cloudOk — boolean: true если Firebase сконфигурирован.
 * user — объект пользователя Firebase или null.
 */
function startApp(cloudOk, user) {
  var hasConfig = (typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG !== null);
  var acct      = loadAccount();

  if (hasConfig && cloudOk) {
    // Firebase настроен и SDK загружен
    if (user) {
      // Есть активная Firebase-сессия
      if (!acct) {
        // Аккаунт не сохранён локально — восстанавливаем из облака
        cloudLoadPlayer(user.uid).then(function(cloudData) {
          if (cloudData && cloudData.name) {
            saveAccount(user.uid, cloudData.name);
          }
          buildMenu();
          showScreen('menu');
        });
        return;
      }
      // Аккаунт есть — прямо в меню (или онбординг при первом входе)
      if (!profile.onboarded) {
        buildOnboarding();
        showScreen('onboarding');
      } else {
        buildMenu();
        showScreen('menu');
      }
    } else {
      // Нет активной Firebase-сессии
      if (acct) {
        // Аккаунт есть локально (гость с прогрессом, сессия устарела) — в меню
        buildMenu();
        showScreen('menu');
      } else if (!profile.onboarded) {
        // Новый пользователь без онбординга — показываем регистрацию
        showAuthScreen('register');
      } else {
        // Уже прошёл онбординг гостем — в меню без аккаунта
        buildMenu();
        showScreen('menu');
      }
    }
  } else {
    // Firebase не настроен или SDK не загружен — локальный режим
    if (!profile.onboarded) {
      buildOnboarding();
      showScreen('onboarding');
    } else {
      buildMenu();
      showScreen('menu');
    }
  }
}

// Инициализируем Firebase, ждём первого onAuthStateChanged, затем запускаем приложение.
// Ни один экран не показывается до резолва cloudWaitForAuth (все .screen hidden по умолчанию).
cloudInit().then(function(cloudOk) {
  if (!cloudOk) {
    startApp(false, null);
    return;
  }
  cloudWaitForAuth().then(function(user) {
    startApp(true, user);
  });
});
