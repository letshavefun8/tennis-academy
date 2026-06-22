#!/usr/bin/env python3
# Авто-обход сайта Playwright'ом (P2). Ходит свежим браузером по живому сайту,
# логинит тест-юзера, проверяет ключевые экраны и воспроизводит баг с бейджиком.
# Геймплей — в ГОСТЕВОМ режиме (без токена), чтобы не мутить прод-данные.
# Запуск: python3 tests/walk.py [BASE_URL]   (по умолчанию прод)
import sys, time
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://wildcardway.com"
USER, PIN = "Джок", "1234"
SHOTS = "/tmp/walk-shots"
import os; os.makedirs(SHOTS, exist_ok=True)

results = []
def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("  ✅" if cond else "  ✗") + " " + name + (" — " + detail if detail else ""))

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 390, "height": 844})  # мобильный
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))

    print("BASE:", BASE)
    print("\n[A] Загрузка")
    page.goto(BASE, wait_until="networkidle", timeout=30000)
    check("страница открылась (title)", "тенниса" in page.title().lower(), page.title())
    page.screenshot(path=f"{SHOTS}/01-load.png")
    body = page.inner_text("body")
    check("видна версия сборки", "сборка" in body.lower(),
          next((l for l in body.splitlines() if "сборка" in l.lower()), ""))

    print("\n[B] Вход Джок/1234")
    try:
        page.click("#auth-tab-login", timeout=8000)
        page.fill("#login-name", USER)
        page.fill("#login-pin", PIN)
        page.click("#btn-login-submit")
        page.wait_for_timeout(3500)  # ждём ответ бэка + переход
        # пропускаем онбординг, если показался
        if page.is_visible("#btn-skip-onboarding"):
            page.click("#btn-skip-onboarding")
            page.wait_for_timeout(800)
        err = page.is_visible("#login-error") and page.inner_text("#login-error").strip()
        check("вход без ошибки", not err, err or "")
        page.screenshot(path=f"{SHOTS}/02-after-login.png")
    except Exception as e:
        check("вход выполнен", False, repr(e)[:160])

    print("\n[C] Профиль — звёзды и бейджи (репро бага)")
    try:
        if page.is_visible("#btn-hall"):
            page.click("#btn-hall")
        else:
            page.click('.tabbar-btn[data-screen="hall"]')
        page.wait_for_timeout(1500)
        hall = page.inner_text("#screen-hall")
        page.screenshot(path=f"{SHOTS}/03-profile.png", full_page=True)
        stars = hall.count("★")
        check("звёзды подтянулись из облака", stars > 0, f"найдено ★: {stars}")
        # бейджи: ищем эмодзи значков из реестра BADGES
        badge_emojis = ["📚", "🏅", "🗓", "🔥", "🎯"]
        has_badge = any(e in hall for e in badge_emojis)
        check("бейдж активирован на свежем устройстве", has_badge,
              "если ✗ — подтверждён баг: значки не пере-выдаются из cloudBlockStars")
    except Exception as e:
        check("профиль открылся", False, repr(e)[:160])

    print("\n[D] Стена — рейтинг + лента")
    try:
        page.click('.tabbar-btn[data-screen="wall"]')
        page.wait_for_timeout(3500)
        lb = page.inner_text("#leaderboard-wrap")
        feed = page.inner_text("#feed-wrap")
        page.screenshot(path=f"{SHOTS}/04-wall.png", full_page=True)
        check("рейтинг отрендерился", "Загружаем" not in lb and len(lb) > 0, lb[:60].replace("\n", " "))
        check("лента отрендерилась", "Загружаем" not in feed and len(feed) > 5, feed[:60].replace("\n", " "))
    except Exception as e:
        check("стена открылась", False, repr(e)[:160])

    ctx.close()

    print("\n[E] Геймплей в ГОСТЕВОМ режиме (без мутации прод-данных)")
    ctx2 = browser.new_context(viewport={"width": 390, "height": 844})
    pg = ctx2.new_page()
    try:
        pg.goto(BASE, wait_until="networkidle", timeout=30000)
        if pg.is_visible("#btn-auth-skip"):
            pg.click("#btn-auth-skip")
            pg.wait_for_timeout(800)
        if pg.is_visible("#btn-skip-onboarding"):
            pg.click("#btn-skip-onboarding")
            pg.wait_for_timeout(800)
        # старт «Тренировка дня»
        pg.click("#btn-daily", timeout=8000)
        pg.wait_for_timeout(1500)
        opts = pg.query_selector_all("#options-list .option, #options-list button, #options-list > *")
        check("экран вопроса с вариантами", len(opts) >= 2, f"вариантов: {len(opts)}")
        pg.screenshot(path=f"{SHOTS}/05-question.png", full_page=True)
        if opts:
            opts[0].click()
            pg.wait_for_timeout(1200)
            check("после ответа есть «Дальше»/реакция", pg.is_visible("#btn-next") or pg.is_visible("#next-btn-wrap"), "")
            pg.screenshot(path=f"{SHOTS}/06-answered.png", full_page=True)
    except Exception as e:
        check("геймплей прошёл", False, repr(e)[:160])
    ctx2.close()
    browser.close()

print("\n==== ИТОГ ====")
ok = sum(1 for _, c, _ in results if c)
print(f"{ok}/{len(results)} проверок прошло. Скриншоты: {SHOTS}")
print("JS-ошибок в консоли:", len(errors))
for e in errors[:5]:
    print("   •", e[:160])
