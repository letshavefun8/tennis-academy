# Академия тенниса — гайд для Claude

Детский веб-тренажёр по тактике тенниса (маскот Эйс 🎾). Vanilla HTML/CSS/JS,
без сборки и npm. Русский UI, mobile-first. 116 вопросов в 17 блоках.
Прод: https://letshavefun8.github.io/tennis-academy/

## Запуск локально
```
python3 -m http.server 8000   # из корня репо, открыть http://localhost:8000
```
Без облака игра работает автономно (localStorage), но без Стены и рейтинга.

## Ключевые файлы
- `index.html` — экраны, нижний таб-бар, ссылки на ассеты с `?v=N`
- `app.js` — вся игровая логика (геймы, очки, звания, значки, Стена)
- `cloud.js` — сетевой слой к бэкенду (fetch, токен, опрос ленты, офлайн-очередь)
- `questions.js` — СГЕНЕРИРОВАННЫЕ данные, **руками не править**
- `tennis_question_bank.md` — исходный банк вопросов (правится здесь)
- `convert.py` — генератор `questions.js` из банка
- `backend/handler.py` — серверная логика (одна Cloud Function, роутинг по пути)
- `style.css` — дизайн-система и стили
- `.claude/` — агент-дизайнер, скилл деплоя, хук-привратник разрешений

## Команды
- **Регенерация вопросов:** `python3 convert.py` (ждать «OK: 116 вопросов, 17 блоков»).
  Менять только `tennis_question_bank.md`, затем пересобирать — `questions.js` не редактировать.
- **Деплой фронта:** скилл `/deploy-frontend` — бамп `?v=N` (4 ссылки в index.html) +
  `APP_VERSION` в app.js → commit → `git push` (GitHub Pages пересобирает сам).
- **Тесты (P0, данные):** `python3 tests/run.py` — проверяет `questions.js` (17 блоков, 116 вопросов, кросс-сверка с банком). Все строки `PASS`, код выхода 0. Браузерный P1: `python3 -m http.server 8000`, открыть `http://localhost:8000/tests/browser.html`.
- **Деплой бэкенда:** `yc serverless function version create --function-name tennis-api
  --runtime python312 --entrypoint handler.handler --memory 128m --execution-timeout 30s
  --source-path backend --service-account-id ajemrlkcqardi59ug72a --environment ...`
  (env: APP_SECRET, DOCAPI_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY — из `~/.yc-tennis-*`).

## Конвенции
- Комментарии и UI-тексты — на русском, в стиле уже существующего кода.
- Тон для детей: подбадривающий, без красного «НЕВЕРНО», эмодзи уместны.
- Дизайн-система: корт-грин `#1F6F50` + лайм `#C7E03A`, Unbounded (заголовки) + Nunito (текст),
  bento-карточки, нижний таб-бар. Оставаться в палитре/шрифтах.
- Git: ветка `main`. Коммитить/пушить **только по явной просьбе**.
  Коммиты заканчивать строкой `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## Гочи (НЕ сломать)
- **`questions.js` — генерируемый.** Правки руками затрутся при следующем `convert.py`.
- **Версионирование ассетов:** при деплое фронта обязательно бампать `?v=N` у всех 4 ссылок
  И `APP_VERSION`, иначе браузеры детей отдадут старый кеш.
- **`APP_SECRET` переиспользовать** при передеплое бэкенда (лежит в `~/.yc-tennis-app-secret`),
  иначе сломаются токены сессий и pin_hash у всех игроков.
- **Секреты не в репо:** ключи Yandex Cloud и APP_SECRET — в `~/`, в `.gitignore` (`*-key.json`, `*.env`).
- На сервер уходят только агрегаты профиля; история ответов и значки — локальные (localStorage).

## Бэкенд (Yandex Cloud, доступен в РФ)
Cloud Function + YDB (Document API) + API Gateway. Базовый URL — в `cloud.js` (`CLOUD_BACKEND_URL`).
Эндпоинты: POST `/register` `/login` `/sync` `/feed`; GET `/feed` `/leaderboard` `/wall` `/player?uid=`.
`/wall` = лента+рейтинг одним запросом (фронт умеет фолбэк на `/feed`+`/leaderboard`).

## Команда агентов и инструменты
- Конвейер: **designer → planner → executor → reviewer**.
  Дизайнер (спец по детским приложениям, с веб-доступом) — в `.claude/agents/`;
  planner/executor/reviewer — глобальные универсалы.
- Хук `.claude/hooks/permission-gate.py` авто-разрешает read-only/проектные правки,
  блокирует разрушительное, остальное спрашивает.
- Перед действием, требующим подтверждения, давать человеческое «что и зачем».
