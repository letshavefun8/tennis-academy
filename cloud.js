// =====================================================
// cloud.js — сетевой слой «Академии тенниса»
// Бэкенд: Yandex Cloud (Function + YDB), доступен в РФ без VPN.
// (Заменил Firebase, который блокируется в РФ.)
// Связь по обычному fetch к API Gateway. Авторизация — свой токен сессии
// (имя+ПИН -> сервер проверяет -> выдаёт HMAC-токен, храним в localStorage).
// Лента обновляется опросом (polling), realtime не нужен.
// Без npm/сборки, vanilla JS. Комментарии на русском.
// =====================================================

// Боевой HTTPS-адрес бэкенда (API Gateway). null = офлайн/локальный режим.
var CLOUD_BACKEND_URL = 'https://d5devrobt9pb45srhc84.628pfjdx.apigw.yandexcloud.net';

// Ключи в localStorage
var ACCOUNT_KEY    = 'tennisAcademy.account';    // { uid, name, token }
var SYNC_QUEUE_KEY = 'tennisAcademy.syncQueue';  // офлайн-очередь feed-событий

// Флаг готовности облака (бэкенд настроен)
var cloudReady = false;

// Интервал опроса ленты (мс)
var FEED_POLL_MS = 15000;

// =====================================================
// HTTP-ХЕЛПЕРЫ
// =====================================================

/**
 * POST JSON на эндпоинт бэкенда. Возвращает Promise с распарсенным ответом.
 * При сетевой ошибке резолвит { ok:false, code:'network' } (не бросает).
 */
function apiPost(path, payload) {
  if (!CLOUD_BACKEND_URL) return Promise.resolve({ ok: false, code: 'no-cloud' });
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, 15000);
  return fetch(CLOUD_BACKEND_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
    signal: ctrl.signal
  }).then(function (r) { return r.json(); })
    .then(function (data) { clearTimeout(timer); return data; })
    .catch(function (err) {
      clearTimeout(timer);
      console.warn('tennisAcademy: сетевая ошибка', path, err);
      return { ok: false, code: 'network', error: 'Нет связи с сервером' };
    });
}

/**
 * GET JSON с эндпоинта. При ошибке резолвит null.
 */
function apiGet(path) {
  if (!CLOUD_BACKEND_URL) return Promise.resolve(null);
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, 15000);
  return fetch(CLOUD_BACKEND_URL + path, { signal: ctrl.signal })
    .then(function (r) { return r.json(); })
    .then(function (data) { clearTimeout(timer); return data; })
    .catch(function (err) {
      clearTimeout(timer);
      console.warn('tennisAcademy: сетевая ошибка GET', path, err);
      return null;
    });
}

// =====================================================
// АККАУНТ В LOCALSTORAGE
// =====================================================

/** Читает аккаунт { uid, name, token } или null. */
function loadAccount() {
  try {
    var raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if (obj && typeof obj.uid === 'string' && typeof obj.name === 'string') return obj;
    return null;
  } catch (e) { return null; }
}

/** Сохраняет аккаунт. token обязателен для записи в облако. */
function saveAccount(uid, name, token) {
  try {
    var obj = { uid: uid, name: name };
    if (token) obj.token = token;
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(obj));
  } catch (e) { console.warn('tennisAcademy: не удалось сохранить аккаунт', e); }
}

/** Удаляет аккаунт (выход). */
function clearAccount() {
  try { localStorage.removeItem(ACCOUNT_KEY); } catch (e) {}
}

/** Токен текущего аккаунта или ''. */
function accountToken() {
  var a = loadAccount();
  return (a && a.token) ? a.token : '';
}

// =====================================================
// АГРЕГАТЫ ПРОФИЛЯ (для register/sync)
// =====================================================

/** Собирает агрегаты из локального профиля для отправки на сервер. */
function buildAggregates() {
  var lp = (typeof profile !== 'undefined') ? profile : null;
  var pts  = (lp && typeof lp.points === 'number') ? lp.points : 0;
  var best = (lp && typeof lp.bestStreakEver === 'number') ? lp.bestStreakEver : 0;
  var days = (lp && Array.isArray(lp.days)) ? lp.days.length : 0;
  var rank = (typeof getRank === 'function') ? (getRank(pts).emoji + ' ' + getRank(pts).name) : '';
  var bs = {};
  if (typeof getBlockStars === 'function') {
    for (var b = 0; b <= 16; b++) bs[String(b)] = getBlockStars(b);
  }
  return { points: pts, bestStreakEver: best, daysCount: days, rankName: rank, blockStars: bs };
}

// =====================================================
// ОФЛАЙН-ОЧЕРЕДЬ FEED-СОБЫТИЙ
// =====================================================

function loadSyncQueue() {
  try {
    var raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    var arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function saveSyncQueue(queue) {
  try { localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue)); } catch (e) {}
}

function enqueueFeedEvent(evt) {
  var q = loadSyncQueue();
  q.push(evt);
  saveSyncQueue(q);
}

/** Досылает накопленные feed-события. */
function flushSyncQueue() {
  if (!cloudReady) return;
  var token = accountToken();
  if (!token) return;
  var q = loadSyncQueue();
  if (q.length === 0) return;
  saveSyncQueue([]); // оптимистично очищаем
  q.forEach(function (evt) {
    apiPost('/feed', {
      token: token, type: evt.type, text: evt.text, emoji: evt.emoji, name: evt.name
    }).then(function (res) {
      if (!res || !res.ok) enqueueFeedEvent(evt); // не дослалось — вернём
    });
  });
}

window.addEventListener('online', function () { if (cloudReady) flushSyncQueue(); });

// =====================================================
// ИНИЦИАЛИЗАЦИЯ
// =====================================================

/**
 * Инициализирует облачный слой. SDK не нужен.
 * Возвращает Promise<boolean> — true если бэкенд настроен.
 */
function cloudInit() {
  cloudReady = !!CLOUD_BACKEND_URL;
  if (cloudReady) {
    flushSyncQueue();
    apiGet('/feed'); // прогрев serverless-функции, чтобы Стена потом открывалась без холодного старта
  }
  return Promise.resolve(cloudReady);
}

/**
 * Возвращает текущий аккаунт (с токеном) или null.
 * Аналог Firebase-сессии: теперь сессия = сохранённый токен.
 */
function cloudWaitForAuth() {
  return Promise.resolve(loadAccount());
}

// =====================================================
// РЕГИСТРАЦИЯ / ВХОД / ВЫХОД
// =====================================================

/**
 * Регистрация: имя 1–20, pin 4 цифры. Локальный прогресс мигрирует на сервер.
 * Возвращает Promise<{ ok, code?, error? }>.
 */
function cloudRegister(name, pin) {
  if (!cloudReady) return Promise.resolve({ ok: false, code: 'no-cloud' });
  var payload = buildAggregates();
  payload.name = String(name).trim();
  payload.pin = String(pin);
  return apiPost('/register', payload).then(function (res) {
    if (res && res.ok) {
      saveAccount(res.uid, res.name || payload.name, res.token);
    }
    return res || { ok: false, code: 'network' };
  });
}

/**
 * Вход по имени+ПИН с любого устройства.
 * Возвращает Promise<{ ok, code?, error?, uid? }>.
 */
function cloudSignIn(name, pin) {
  if (!cloudReady) return Promise.resolve({ ok: false, code: 'no-cloud' });
  return apiPost('/login', { name: String(name).trim(), pin: String(pin) }).then(function (res) {
    if (res && res.ok) {
      saveAccount(res.uid, res.name || String(name).trim(), res.token);
    }
    return res || { ok: false, code: 'network' };
  });
}

/** Выход: токены без серверного состояния — просто чистим аккаунт. */
function cloudSignOut() {
  clearAccount();
  return Promise.resolve();
}

// =====================================================
// СИНХРОНИЗАЦИЯ ПРОФИЛЯ
// =====================================================

/** Отправляет агрегаты профиля на сервер. Тихо пропускает, если нет токена. */
function cloudSyncProfile() {
  if (!cloudReady) return;
  var token = accountToken();
  if (!token) return;
  var payload = buildAggregates();
  payload.token = token;
  // очки за текущую сессию — для пересчёта недельного рейтинга при смене недели
  payload.sessionPoints = (typeof session !== 'undefined' && session) ? (session.sessionPoints || 0) : 0;
  apiPost('/sync', payload).then(function (res) {
    if (res && res.ok) flushSyncQueue();
  });
}

// =====================================================
// ЛЕНТА СОБЫТИЙ
// =====================================================

/**
 * Публикует событие в ленту. Если нет связи/токена — кладёт в офлайн-очередь.
 */
function cloudPostFeedEvent(type, text, emoji) {
  var acct = loadAccount();
  if (!acct) return;
  var evt = { type: type, text: String(text), emoji: String(emoji), name: acct.name };

  if (!cloudReady || !acct.token || !navigator.onLine) {
    enqueueFeedEvent(evt);
    return;
  }
  apiPost('/feed', {
    token: acct.token, type: type, text: evt.text, emoji: evt.emoji, name: acct.name
  }).then(function (res) {
    if (!res || !res.ok) enqueueFeedEvent(evt);
  });
}

/**
 * Загружает Стену (лента + рейтинг) ОДНИМ запросом /wall.
 * Если /wall недоступен (старый бэкенд) — откатывается к двум запросам.
 * Возвращает Promise<{events, players}> или Promise<null> при полном отказе сети.
 */
function cloudLoadWall() {
  if (!cloudReady) return Promise.resolve({ events: [], players: [] });
  return apiGet('/wall').then(function (data) {
    if (data && data.ok && ('events' in data || 'players' in data)) {
      return { events: data.events || [], players: data.players || [] };
    }
    // Фолбэк: /wall ещё не задеплоен — старые два запроса
    return Promise.all([apiGet('/feed'), apiGet('/leaderboard')]).then(function (res) {
      if (!res[0] && !res[1]) return null; // полный отказ сети — не затираем кеш
      return {
        events: (res[0] && res[0].events) ? res[0].events : [],
        players: (res[1] && res[1].players) ? res[1].players : []
      };
    });
  });
}

/**
 * Подписка на Стену через опрос. cb({events, players}) сразу и далее раз в FEED_POLL_MS.
 * cb(null) — при полном сетевом отказе (вызывающий код может оставить прежнее). Возвращает отписку.
 */
function cloudSubscribeWall(cb) {
  if (!cloudReady) {
    if (typeof cb === 'function') cb(null); // нет бэкенда — не затираем кеш Стены
    return function () {};
  }
  var stopped = false;
  function tick() {
    cloudLoadWall().then(function (data) {
      if (stopped) return;
      if (typeof cb === 'function') cb(data);
    });
  }
  tick();
  var id = setInterval(tick, FEED_POLL_MS);
  return function () { stopped = true; clearInterval(id); };
}

// =====================================================
// РЕЙТИНГ / ЧУЖОЙ ПРОФИЛЬ
// =====================================================

/** Профиль игрока по uid. Возвращает Promise<player|null>. */
function cloudLoadPlayer(uid) {
  if (!cloudReady || !uid) return Promise.resolve(null);
  return apiGet('/player?uid=' + encodeURIComponent(uid)).then(function (data) {
    return (data && data.ok && data.player) ? data.player : null;
  });
}
