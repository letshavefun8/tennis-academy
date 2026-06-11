// Логика тренажёра. Данные приходят из questions.js (массив QUESTIONS).

// Состояние текущей тренировки
let pool = [];      // вопросы выбранной темы в случайном порядке
let index = 0;      // номер текущего вопроса в pool
let score = 0;      // сколько отвечено верно
let mistakes = [];  // вопросы, на которые ответили неверно

const $ = id => document.getElementById(id);

const DIFFICULTY_NAMES = { "Б": "базовый", "С": "средний", "П": "продвинутый" };

// Перемешивание массива (алгоритм Фишера–Йетса)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function show(screenId) {
  for (const id of ["menu-screen", "quiz-screen", "result-screen"]) {
    $(id).hidden = id !== screenId;
  }
}

// --- меню ---

function buildMenu() {
  const list = $("block-list");
  list.innerHTML = "";

  const addItem = (label, count, questions) => {
    const btn = document.createElement("button");
    btn.innerHTML = `<span>${label}</span><span class="count">${count}</span>`;
    btn.onclick = () => startQuiz(questions);
    list.appendChild(btn);
  };

  addItem("Все вопросы подряд", QUESTIONS.length, QUESTIONS);
  const blocks = [...new Set(QUESTIONS.map(q => q.block))];
  for (const block of blocks) {
    const qs = QUESTIONS.filter(q => q.block === block);
    addItem(block, qs.length, qs);
  }
}

// --- тренировка ---

function startQuiz(questions) {
  pool = shuffle(questions);
  index = 0;
  score = 0;
  mistakes = [];
  show("quiz-screen");
  showQuestion();
}

function showQuestion() {
  const q = pool[index];
  $("progress").textContent = `Вопрос ${index + 1} из ${pool.length}`;
  $("score").textContent = `Верно: ${score}`;
  $("q-block").textContent = q.block;
  $("q-difficulty").textContent = DIFFICULTY_NAMES[q.difficulty] || q.difficulty;
  $("q-phase").textContent = q.phase;
  $("q-text").textContent = q.question;
  $("feedback").hidden = true;

  // Варианты показываем в случайном порядке, запоминая, какой был правильным
  const options = $("options");
  options.innerHTML = "";
  const order = shuffle(q.options.map((text, i) => ({ text, isCorrect: i === q.correct })));
  for (const opt of order) {
    const btn = document.createElement("button");
    btn.textContent = opt.text;
    btn.onclick = () => answer(btn, opt.isCorrect, q);
    options.appendChild(btn);
  }
}

function answer(clicked, isCorrect, q) {
  // Блокируем все кнопки и подсвечиваем правильный вариант
  for (const btn of $("options").children) {
    btn.disabled = true;
    if (btn.textContent === q.options[q.correct]) btn.classList.add("correct");
  }
  if (isCorrect) {
    score++;
  } else {
    clicked.classList.add("wrong");
    mistakes.push(q);
  }

  $("verdict").textContent = isCorrect ? "✅ Верно!" : "❌ Неверно";
  $("explanation").textContent = q.explanation;
  $("score").textContent = `Верно: ${score}`;
  $("feedback").hidden = false;
  $("next-btn").focus();
}

function next() {
  index++;
  if (index < pool.length) {
    showQuestion();
  } else {
    showResult();
  }
}

// --- результат ---

function showResult() {
  show("result-screen");
  const total = pool.length;
  const percent = Math.round((score / total) * 100);
  let title;
  if (percent === 100) title = "🏆 Идеально!";
  else if (percent >= 80) title = "🎾 Отличная игра!";
  else if (percent >= 50) title = "👍 Неплохо, но есть над чем поработать";
  else title = "📖 Стоит повторить теорию";
  $("result-title").textContent = title;
  $("result-text").textContent = `Правильных ответов: ${score} из ${total} (${percent}%)`;
  $("retry-mistakes-btn").hidden = mistakes.length === 0;
}

// --- привязка кнопок ---

$("next-btn").onclick = next;
$("quit-btn").onclick = () => show("menu-screen");
$("to-menu-btn").onclick = () => show("menu-screen");
$("retry-mistakes-btn").onclick = () => startQuiz(mistakes);

buildMenu();
show("menu-screen");
