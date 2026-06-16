// =====================================================
// cloud.js — сетевой слой Firebase для Академии тенниса
// Работает только при наличии FIREBASE_CONFIG.
// Без конфига все функции безопасно возвращают null/Promise.resolve().
// Vanilla JS, без npm, CDN compat-SDK.
// Комментарии на русском языке.
// =====================================================

// Ключи в localStorage
var ACCOUNT_KEY  = 'tennisAcademy.account';   // { uid, name }
var SYNC_QUEUE_KEY = 'tennisAcademy.syncQueue'; // офлайн-очередь feed-событий

// Флаг: Firebase инициализирован и готов к работе
var cloudReady = false;

// Ссылки на службы Firebase (заполняются при инициализации)
var firebaseAuth = null;
var firebaseDb   = null;

// Промис готовности авторизации (резолвится первым onAuthStateChanged)
var _authReadyPromise = null;
var _authReadyResolve = null;
// Флаг: первое срабатывание onAuthStateChanged уже было
var _authResolvedOnce = false;

// =====================================================
// ТРАНСЛИТЕРАЦИЯ И ПОСТРОЕНИЕ СИНТЕТИЧЕСКОГО EMAIL
// =====================================================

/**
 * Таблица транслитерации кириллицы → латиница.
 * Все буквы нижнего регистра (вход уже приведён к нижнему).
 */
var TRANSLIT_MAP = {
  'а': 'a',  'б': 'b',  'в': 'v',  'г': 'g',  'д': 'd',
  'е': 'e',  'ж': 'zh', 'з': 'z',  'и': 'i',  'й': 'y',
  'к': 'k',  'л': 'l',  'м': 'm',  'н': 'n',  'о': 'o',
  'п': 'p',  'р': 'r',  'с': 's',  'т': 't',  'у': 'u',
  'ф': 'f',  'х': 'h',  'ц': 'c',  'ч': 'ch', 'ш': 'sh',
  'щ': 'sch','ъ': '',   'ы': 'y',  'ь': '',   'э': 'e',
  'ю': 'yu', 'я': 'ya'
};

/**
 * Преобразует имя игрока в локальную часть синтетического email.
 * Алгоритм: trim → lowercase → ё→е → транслитерация кириллицы →
 *   не [a-z0-9] → '.' → схлопнуть точки → обрезать края → до 32 символов.
 * Если результат пустой — возвращает 'user'.
 */
function nameToEmailLocalPart(name) {
  var s = String(name).trim().toLowerCase();
  // ё → е (до транслитерации)
  s = s.replace(/ё/g, 'е');

  // Посимвольная транслитерация
  var result = '';
  for (var i = 0; i < s.length; i++) {
    var ch = s[i];
    if (TRANSLIT_MAP.hasOwnProperty(ch)) {
      result += TRANSLIT_MAP[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      result += ch;
    } else {
      result += '.';
    }
  }

  // Схлопнуть множественные точки
  result = result.replace(/\.{2,}/g, '.');
  // Убрать ведущие и хвостовые точки
  result = result.replace(/^\.+|\.+$/g, '');

  // Пустой результат — заглушка
  if (!result) result = 'user';

  // Обрезать до 32 символов
  return result.slice(0, 32);
}

/**
 * Строит синтетический email по имени игрока.
 * Формат: <localpart>@academy.local
 */
function buildSyntheticEmail(name) {
  return nameToEmailLocalPart(name) + '@academy.local';
}

/**
 * Строит пароль из ПИН-кода.
 * Детерминированная функция, длина ≥ 6, не зависит от uid/имени.
 */
function padPin(pin) {
  return String(pin) + 'Ac';
}

// =====================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =====================================================

/**
 * Возвращает ключ текущей ISO-недели по ЛОКАЛЬНОМУ времени.
 * Формат: '2025-W23'
 * Алгоритм ISO 8601: неделя начинается в понедельник,
 * первая неделя — та, в которую входит первый четверг года.
 */
function weekKey() {
  var d = new Date();
  d = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var day = (d.getDay() + 6) % 7; // 0=Пн ... 6=Вс
  d.setDate(d.getDate() - day + 3); // четверг этой недели
  var firstThu = new Date(d.getFullYear(), 0, 4); // 4 января всегда в 1-й неделе
  var week = 1 + Math.round(((d - firstThu) / 86400000 - 3 + ((firstThu.getDay() + 6) % 7)) / 7);
  var wk = String(week);
  if (wk.length < 2) wk = '0' + wk;
  return d.getFullYear() + '-W' + wk;
}

/**
 * Читает аккаунт текущего игрока из localStorage.
 * Возвращает { uid, name } или null.
 */
function loadAccount() {
  try {
    var raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if (obj && typeof obj.uid === 'string' && typeof obj.name === 'string') return obj;
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Сохраняет аккаунт в localStorage.
 */
function saveAccount(uid, name) {
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ uid: uid, name: name }));
  } catch (e) {
    console.warn('tennisAcademy: не удалось сохранить аккаунт', e);
  }
}

/**
 * Удаляет аккаунт из localStorage.
 */
function clearAccount() {
  try {
    localStorage.removeItem(ACCOUNT_KEY);
  } catch (e) {
    console.warn('tennisAcademy: не удалось очистить аккаунт', e);
  }
}

// =====================================================
// ОФЛАЙН-ОЧЕРЕДЬ FEED-СОБЫТИЙ
// =====================================================

/**
 * Читает офлайн-очередь из localStorage.
 * Возвращает массив объектов событий.
 */
function loadSyncQueue() {
  try {
    var raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    var arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

/**
 * Сохраняет офлайн-очередь в localStorage.
 */
function saveSyncQueue(queue) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('tennisAcademy: не удалось сохранить syncQueue', e);
  }
}

/**
 * Добавляет событие в офлайн-очередь (если Firebase недоступен или нет сети).
 */
function enqueueFeedEvent(eventObj) {
  var queue = loadSyncQueue();
  queue.push(eventObj);
  saveSyncQueue(queue);
}

/**
 * Досылает все события из офлайн-очереди в Firestore.
 * Вызывается после успешного синка и по событию window 'online'.
 */
function flushSyncQueue() {
  if (!cloudReady || !firebaseDb) return;
  var account = loadAccount();
  if (!account) return;

  var queue = loadSyncQueue();
  if (queue.length === 0) return;

  // Очищаем очередь сразу (оптимистично), чтобы не дублировать при повторном вызове
  saveSyncQueue([]);

  var feedRef = firebaseDb.collection('feed');
  for (var i = 0; i < queue.length; i++) {
    (function(evt) {
      feedRef.add(evt).catch(function(err) {
        console.warn('tennisAcademy: ошибка досылки feed-события', err);
        // Если не удалось — кладём обратно в очередь
        enqueueFeedEvent(evt);
      });
    })(queue[i]);
  }
}

// Досылаем очередь при восстановлении сети
window.addEventListener('online', function() {
  if (cloudReady) flushSyncQueue();
});

// =====================================================
// ИНИЦИАЛИЗАЦИЯ FIREBASE
// =====================================================

/**
 * Инициализирует Firebase compat-SDK.
 * БЕЗ анонимного входа — используем Email/Password.
 * Устанавливает onAuthStateChanged: обновляет cloudReady,
 * досылает очередь, резолвит _authReadyPromise при первом срабатывании.
 * Возвращает Promise<boolean> — true если Firebase сконфигурирован.
 */
function cloudInit() {
  // Если конфига нет — работаем локально
  if (typeof FIREBASE_CONFIG === 'undefined' || FIREBASE_CONFIG === null) {
    return Promise.resolve(false);
  }

  // Проверяем наличие compat-SDK в глобальном пространстве
  if (typeof firebase === 'undefined') {
    console.warn('tennisAcademy: Firebase SDK не загружен');
    return Promise.resolve(false);
  }

  try {
    // Инициализируем приложение (защита от повторной инициализации)
    var app;
    if (firebase.apps.length === 0) {
      app = firebase.initializeApp(FIREBASE_CONFIG);
    } else {
      app = firebase.apps[0];
    }

    firebaseAuth = firebase.auth();
    firebaseDb   = firebase.firestore();

    // Создаём промис готовности авторизации
    _authReadyPromise = new Promise(function(resolve) {
      _authReadyResolve = resolve;
    });

    // Единственная подписка на изменение состояния авторизации
    firebaseAuth.onAuthStateChanged(function(user) {
      cloudReady = !!user;
      if (user) {
        console.log('tennisAcademy: пользователь вошёл, uid =', user.uid);
        flushSyncQueue();
      }
      // Резолвим _authReadyPromise только при первом срабатывании
      if (!_authResolvedOnce) {
        _authResolvedOnce = true;
        _authReadyResolve(user || null);
      }
    });

    return Promise.resolve(true);

  } catch (err) {
    console.warn('tennisAcademy: ошибка инициализации Firebase', err);
    return Promise.resolve(false);
  }
}

/**
 * Возвращает промис, который резолвится при первом onAuthStateChanged.
 * Результат: объект user (если залогинен) или null.
 * При отсутствии конфига резолвится мгновенно с null.
 */
function cloudWaitForAuth() {
  if (typeof FIREBASE_CONFIG === 'undefined' || FIREBASE_CONFIG === null) {
    return Promise.resolve(null);
  }
  if (!_authReadyPromise) {
    return Promise.resolve(null);
  }
  return _authReadyPromise;
}

// =====================================================
// РЕГИСТРАЦИЯ
// =====================================================

/**
 * Регистрирует нового игрока через Firebase Email/Password.
 * email = buildSyntheticEmail(name), password = padPin(pin).
 * Создаёт документ players/{uid} в Firestore с агрегатами из локального профиля.
 * Имена глобально уникальны (нормализуются через buildSyntheticEmail).
 * name — строка 1–20 символов, pin — 4 цифры.
 * Возвращает Promise<{ok, code?, error?}>.
 */
function cloudRegister(name, pin) {
  if (!cloudReady && !(firebaseAuth)) {
    return Promise.resolve({ ok: false, code: 'no-cloud', error: 'Firebase не готов' });
  }

  // Проверяем конфиг
  if (typeof FIREBASE_CONFIG === 'undefined' || FIREBASE_CONFIG === null) {
    return Promise.resolve({ ok: false, code: 'no-cloud', error: 'Нет конфигурации Firebase' });
  }

  // Валидация имени
  var trimmedName = String(name).trim();
  if (trimmedName.length < 1 || trimmedName.length > 20) {
    return Promise.resolve({ ok: false, error: 'Имя должно быть от 1 до 20 символов' });
  }

  // Валидация ПИН — только 4 цифры
  var pinStr = String(pin).trim();
  if (!/^\d{4}$/.test(pinStr)) {
    return Promise.resolve({ ok: false, error: 'ПИН — ровно 4 цифры' });
  }

  var email    = buildSyntheticEmail(trimmedName);
  var password = padPin(pinStr);

  return firebaseAuth.createUserWithEmailAndPassword(email, password).then(function(cred) {
    var uid = cred.user.uid;

    // Читаем локальный профиль для миграции агрегатов
    var localProfile = (typeof profile !== 'undefined') ? profile : null;
    var pts        = (localProfile && typeof localProfile.points === 'number') ? localProfile.points : 0;
    var bestStreak = (localProfile && typeof localProfile.bestStreakEver === 'number') ? localProfile.bestStreakEver : 0;
    var daysCount  = (localProfile && Array.isArray(localProfile.days)) ? localProfile.days.length : 0;
    var rankName   = (typeof getRank === 'function') ? getRank(pts).emoji + ' ' + getRank(pts).name : '';

    // Агрегаты звёзд блоков (17 блоков)
    var blockStars = {};
    if (typeof getBlockStars === 'function') {
      for (var bid = 0; bid <= 16; bid++) {
        blockStars[String(bid)] = getBlockStars(bid);
      }
    }

    var now = firebase.firestore.FieldValue.serverTimestamp();
    var wk  = weekKey();

    var doc = {
      uid:           uid,
      name:          trimmedName,   // исходное имя (не localpart), для отображения
      points:        pts,
      rankName:      rankName,
      blockStars:    blockStars,
      bestStreakEver: bestStreak,
      daysCount:     daysCount,
      weeklyPoints:  0,
      weekKey:       wk,
      createdAt:     now,
      updatedAt:     now
    };

    return firebaseDb.collection('players').doc(uid).set(doc).then(function() {
      saveAccount(uid, trimmedName);
      console.log('tennisAcademy: игрок зарегистрирован', trimmedName, uid);
      return { ok: true };
    });
  }).catch(function(err) {
    console.warn('tennisAcademy: ошибка регистрации', err);
    return { ok: false, code: err.code, error: err.message || 'Ошибка сервера' };
  });
}

// =====================================================
// ВХОД (со второго устройства или после очистки данных)
// =====================================================

/**
 * Выполняет вход существующего игрока по имени и ПИН-коду.
 * email = buildSyntheticEmail(name), password = padPin(pin).
 * При успехе — сохраняет аккаунт локально.
 * Возвращает Promise<{ok, uid?, code?, error?}>.
 */
function cloudSignIn(name, pin) {
  // Проверяем конфиг и готовность Firebase
  if (typeof FIREBASE_CONFIG === 'undefined' || FIREBASE_CONFIG === null) {
    return Promise.resolve({ ok: false, code: 'no-cloud', error: 'Нет конфигурации Firebase' });
  }
  if (!firebaseAuth) {
    return Promise.resolve({ ok: false, code: 'no-cloud', error: 'Firebase не инициализирован' });
  }

  // Валидация имени
  var trimmedName = String(name).trim();
  if (trimmedName.length < 1 || trimmedName.length > 20) {
    return Promise.resolve({ ok: false, error: 'Имя должно быть от 1 до 20 символов' });
  }

  // Валидация ПИН
  var pinStr = String(pin).trim();
  if (!/^\d{4}$/.test(pinStr)) {
    return Promise.resolve({ ok: false, error: 'ПИН — ровно 4 цифры' });
  }

  var email    = buildSyntheticEmail(trimmedName);
  var password = padPin(pinStr);

  return firebaseAuth.signInWithEmailAndPassword(email, password).then(function(cred) {
    var uid = cred.user.uid;
    saveAccount(uid, trimmedName);
    console.log('tennisAcademy: вход выполнен', trimmedName, uid);
    return { ok: true, uid: uid };
  }).catch(function(err) {
    console.warn('tennisAcademy: ошибка входа', err);
    return { ok: false, code: err.code, error: err.message || 'Ошибка входа' };
  });
}

// =====================================================
// ВЫХОД
// =====================================================

/**
 * Выполняет выход из аккаунта Firebase и очищает локальный аккаунт.
 * Возвращает Promise.
 */
function cloudSignOut() {
  if (!firebaseAuth) {
    clearAccount();
    return Promise.resolve();
  }
  return firebaseAuth.signOut().then(function() {
    clearAccount();
    console.log('tennisAcademy: выход из аккаунта');
  }).catch(function(err) {
    console.warn('tennisAcademy: ошибка выхода', err);
    clearAccount();
  });
}

// =====================================================
// СИНХРОНИЗАЦИЯ ПРОФИЛЯ
// =====================================================

/**
 * Синхронизирует локальный профиль с документом players/{uid} в Firestore.
 * Обновляет агрегаты: points, rankName, blockStars, bestStreakEver,
 * daysCount, weeklyPoints (с учётом смены недели).
 * Вызывается после showResults() и showOnboardingResults().
 * Не бросает исключений — graceful degradation.
 */
function cloudSyncProfile() {
  if (!cloudReady || !firebaseDb || !firebaseAuth) return;
  var account = loadAccount();
  if (!account) return;
  var uid = account.uid;

  // Читаем актуальный локальный профиль
  var localProfile = (typeof profile !== 'undefined') ? profile : null;
  if (!localProfile) return;

  var pts        = localProfile.points || 0;
  var bestStreak = localProfile.bestStreakEver || 0;
  var daysCount  = Array.isArray(localProfile.days) ? localProfile.days.length : 0;
  var rankName   = (typeof getRank === 'function') ? getRank(pts).emoji + ' ' + getRank(pts).name : '';
  var wkNow      = weekKey();

  // Агрегаты звёзд блоков
  var blockStars = {};
  if (typeof getBlockStars === 'function') {
    for (var bid = 0; bid <= 16; bid++) {
      blockStars[String(bid)] = getBlockStars(bid);
    }
  }

  // Захватываем sessionPoints синхронно — до асинхронного docRef.get(),
  // чтобы смена недели не потеряла очки при null session в колбэке
  var capturedSessionPoints = (typeof session !== 'undefined' && session) ? (session.sessionPoints || 0) : 0;

  // Читаем текущий документ для определения weeklyPoints
  var docRef = firebaseDb.collection('players').doc(uid);
  docRef.get().then(function(snap) {
    var weeklyPoints = 0;

    if (snap.exists) {
      var data = snap.data();
      var savedWk = data.weekKey || '';

      if (savedWk === wkNow) {
        // Та же неделя — вычисляем дельту
        var prevPoints = typeof data.points === 'number' ? data.points : 0;
        var delta = pts - prevPoints;
        weeklyPoints = (typeof data.weeklyPoints === 'number' ? data.weeklyPoints : 0) + Math.max(0, delta);
      } else {
        // Неделя сменилась — начинаем заново с очков за эту сессию
        weeklyPoints = capturedSessionPoints;
      }
    } else {
      // Документа нет (удалён или ещё не создан) — пересоздаём
      weeklyPoints = capturedSessionPoints;
    }

    var updateData = {
      points:        pts,
      rankName:      rankName,
      blockStars:    blockStars,
      bestStreakEver: bestStreak,
      daysCount:     daysCount,
      weeklyPoints:  weeklyPoints,
      weekKey:       wkNow,
      updatedAt:     firebase.firestore.FieldValue.serverTimestamp()
    };

    // set с merge — пересоздаёт документ, если он был удалён
    return docRef.set(updateData, { merge: true });
  }).then(function() {
    // Успешный синк — досылаем офлайн-очередь
    flushSyncQueue();
  }).catch(function(err) {
    console.warn('tennisAcademy: ошибка синка профиля', err);
  });
}

// =====================================================
// ЛЕНТА СОБЫТИЙ (СТЕНА)
// =====================================================

/**
 * Публикует событие в ленту академии.
 * type: 'block_stars' | 'rank_up' | 'daily_done'
 * text: строка описания
 * emoji: один эмодзи
 * Если сети нет — кладёт в офлайн-очередь.
 */
function cloudPostFeedEvent(type, text, emoji) {
  var account = loadAccount();
  if (!account) return;

  var eventObj = {
    uid:   account.uid,
    name:  account.name,
    type:  type,
    text:  String(text),
    emoji: String(emoji),
    ts:    Date.now() // клиентское время; при досылке будет использовано как есть
  };

  if (!cloudReady || !firebaseDb) {
    // Firebase не готов — кладём в очередь
    enqueueFeedEvent(eventObj);
    return;
  }

  if (!navigator.onLine) {
    // Нет сети — кладём в очередь
    enqueueFeedEvent(eventObj);
    return;
  }

  // Добавляем событие в коллекцию feed
  firebaseDb.collection('feed').add({
    uid:   eventObj.uid,
    name:  eventObj.name,
    type:  eventObj.type,
    text:  eventObj.text,
    emoji: eventObj.emoji,
    ts:    firebase.firestore.FieldValue.serverTimestamp()
  }).catch(function(err) {
    console.warn('tennisAcademy: ошибка публикации события в feed', err);
    // Не удалось — сохраняем в очередь
    enqueueFeedEvent(eventObj);
  });
}

// =====================================================
// ЗАГРУЗКА ЛЕНТЫ СОБЫТИЙ (REAL-TIME)
// =====================================================

/**
 * Подписывается на ленту событий в реальном времени.
 * cb(events) — вызывается при каждом обновлении с массивом событий
 * (последние 30, отсортированы новейшие первыми).
 * Возвращает функцию отписки (unsubscribe).
 */
function cloudLoadFeed(cb) {
  if (!cloudReady || !firebaseDb) {
    if (typeof cb === 'function') cb([]);
    return function() {};
  }

  var unsub = firebaseDb.collection('feed')
    .orderBy('ts', 'desc')
    .limit(30)
    .onSnapshot(function(snap) {
      var events = [];
      snap.forEach(function(doc) {
        events.push(doc.data());
      });
      if (typeof cb === 'function') cb(events);
    }, function(err) {
      console.warn('tennisAcademy: ошибка чтения feed', err);
      if (typeof cb === 'function') cb([]);
    });

  return unsub;
}

// =====================================================
// НЕДЕЛЬНАЯ ТАБЛИЦА РЕЙТИНГА
// =====================================================

/**
 * Загружает топ-20 игроков по weeklyPoints.
 * Для игроков с устаревшим weekKey показываем weeklyPoints = 0.
 * Возвращает Promise<Array<playerData>>.
 */
function cloudLoadLeaderboard() {
  if (!cloudReady || !firebaseDb) {
    return Promise.resolve([]);
  }

  var wkNow = weekKey();

  return firebaseDb.collection('players')
    .orderBy('weeklyPoints', 'desc')
    .limit(20)
    .get()
    .then(function(snap) {
      var players = [];
      snap.forEach(function(doc) {
        var d = doc.data();
        // Если неделя устарела — показываем 0 очков
        var wp = (d.weekKey === wkNow) ? (d.weeklyPoints || 0) : 0;
        players.push({
          uid:          d.uid,
          name:         d.name,
          weeklyPoints: wp,
          rankName:     d.rankName || '',
          points:       d.points   || 0
        });
      });
      // Сортируем по скорректированным weeklyPoints
      players.sort(function(a, b) { return b.weeklyPoints - a.weeklyPoints; });
      return players;
    })
    .catch(function(err) {
      console.warn('tennisAcademy: ошибка загрузки рейтинга', err);
      return [];
    });
}

// =====================================================
// ПРОФИЛЬ ДРУГОГО ИГРОКА
// =====================================================

/**
 * Загружает профиль игрока по uid из Firestore.
 * Возвращает Promise<playerData|null>.
 */
function cloudLoadPlayer(uid) {
  if (!cloudReady || !firebaseDb) {
    return Promise.resolve(null);
  }

  return firebaseDb.collection('players').doc(uid).get()
    .then(function(snap) {
      if (!snap.exists) return null;
      return snap.data();
    })
    .catch(function(err) {
      console.warn('tennisAcademy: ошибка загрузки профиля игрока', err);
      return null;
    });
}
