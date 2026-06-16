// =====================================================
// Конфигурация Firebase — проект tennis-academy-2026
//
// Это публичные параметры веб-приложения Firebase (не секрет):
// доступ к данным ограничивают правила Firestore (firestore.rules),
// а не эти ключи. Для compat-SDK конфиг задаётся как глобальный
// объект var FIREBASE_CONFIG (НЕ ES-модуль).
//
// Без конфига (null) игра работает полностью локально.
// =====================================================

var FIREBASE_CONFIG = {
  apiKey:            'AIzaSyD2I95dADoDdRJkZKWWFuyiXndgjfKxoGY',
  authDomain:        'tennis-academy-2026.firebaseapp.com',
  projectId:         'tennis-academy-2026',
  storageBucket:     'tennis-academy-2026.firebasestorage.app',
  messagingSenderId: '178683216930',
  appId:             '1:178683216930:web:2262ac0aab0477377e767b',
  measurementId:     'G-V2Q707D4SL'
};

// Site Key reCAPTCHA v3 для Firebase App Check (публичный, не секрет).
// null = App Check выключен (игра работает, но без защиты от ботов).
var APPCHECK_SITE_KEY = '6LcwPiItAAAAAL4MOa9SoZVjqFaFutunHr6cbh8M';
