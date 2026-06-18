export const meta = {
  name: 'question-bank-quality-sweep',
  description: 'Параллельный аудит качества 116 вопросов «Академии тенниса» по 17 блокам: факт-корректность, возрастная уместность, дистракторы, дубли, ясность, перекос верного ответа',
  whenToUse: 'После добавления/правки вопросов в банке — прогнать аудит качества по всем блокам сразу. Запуск: Workflow({name: "question-bank-quality-sweep"}).',
  phases: [
    { title: 'Review', detail: 'один агент на блок (17 блоков параллельно)' },
    { title: 'Verify', detail: 'адверсариальная проверка серьёзных находок' },
    { title: 'CrossCheck', detail: 'кросс-блочные дубли и перекосы' },
  ],
}

const FILE = '/Users/zakharovpeter/tennis-simulator/questions.js'

const BLOCKS = [
  { id: 0, title: '1. Тактика и выбор удара' },
  { id: 1, title: '2. Типы соперников' },
  { id: 2, title: '3. Понимание счёта и управление матчем' },
  { id: 3, title: '4. Психология и эмоции' },
  { id: 4, title: '5. Геометрия корта и позиция' },
  { id: 5, title: '6. Рефлексия и самоанализ' },
  { id: 6, title: 'Типовые ошибки (симулятор)' },
  { id: 7, title: 'Д1. Игра на разных покрытиях' },
  { id: 8, title: 'Д2. Парная тактика' },
  { id: 9, title: 'Д3. Тактика подачи' },
  { id: 10, title: 'Д4. Тактика приёма' },
  { id: 11, title: 'Д5. Игра против левши' },
  { id: 12, title: 'Д6. Погода и условия' },
  { id: 13, title: 'Д7. Управление энергией и темпом' },
  { id: 14, title: 'Д8. Форматы счёта' },
  { id: 15, title: 'Д10. Предматчевая подготовка' },
  { id: 16, title: 'Д12. Работа ног и тайминг' },
]

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    blockId: { type: 'number' },
    blockSummary: { type: 'string', description: 'короткая общая оценка блока' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          questionId: { type: ['number', 'null'] },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          category: { type: 'string', enum: ['factual', 'age', 'distractor', 'duplicate', 'clarity', 'answer-bias', 'tone'] },
          issue: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['questionId', 'severity', 'category', 'issue', 'suggestion'],
      },
    },
  },
  required: ['blockId', 'blockSummary', 'findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    confirmed: { type: 'boolean' },
    reasoning: { type: 'string' },
    revisedSeverity: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
  },
  required: ['confirmed', 'reasoning', 'revisedSeverity'],
}

const CROSS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    duplicates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          questionIds: { type: 'array', items: { type: 'number' } },
          why: { type: 'string' },
        },
        required: ['questionIds', 'why'],
      },
    },
    answerBiasNote: { type: 'string', description: 'распределение correctIndex по всем 116 вопросам — есть ли перекос/предсказуемость' },
    difficultyNote: { type: 'string', description: 'распределение Б/С/П по блокам — сбалансировано ли' },
    overall: { type: 'string' },
  },
  required: ['duplicates', 'answerBiasNote', 'difficultyNote', 'overall'],
}

function reviewPrompt(block) {
  return `Ты — рецензент детского обучающего теннисного приложения (аудитория ~8–14 лет, тон подбадривающий).
Прочитай файл ${FILE}. Это сгенерированный банк вопросов. Структура каждого вопроса:
{ id, blockId, topic, text, type, difficulty ("Б"=база/"С"=средний/"П"=продвинутый), phase, options[], correctIndex, explanation }.

Отревьюь ТОЛЬКО блок blockId=${block.id} ("${block.title}"). Профильтруй вопросы по blockId=${block.id}.

Проверь каждый вопрос на:
- factual: фактическая корректность теннисной тактики (верный ли ответ по options[correctIndex]? нет ли спорного/неоднозначно-верного дистрактора, который тоже можно считать правильным?).
- age: возрастная уместность и понятность ребёнку (нет ли жаргона без пояснения, слишком взрослых формулировок).
- distractor: качество неправильных вариантов (правдоподобны ли; нет ли абсурдных-в-лоб; нет ли "тела ответа" по длине/детализации, выдающего правильный).
- clarity: однозначность и ясность формулировки вопроса.
- answer-bias: подозрительно ли расположен correctIndex (например, всегда первый). ВАЖНО: на проде app.js перемешивает варианты при показе (shuffle), поэтому позиционный перекос в данных — НЕ игровой баг, максимум low.
- duplicate: повторы/слишком похожие вопросы ВНУТРИ этого блока.
- tone: соответствие подбадривающему детскому тону.

Возвращай находки списком. severity: high — фактическая ошибка/неверный correctIndex/два верных ответа; medium — слабый дистрактор, неясность, недетский тон; low — мелкие придирки. Если блок хорош — пустой findings и blockSummary об этом. Будь конкретен: questionId и предложение исправления. Не выдумывай проблемы ради галочки.`
}

phase('Review')
const reviewed = await pipeline(
  BLOCKS,
  (block) => agent(reviewPrompt(block), { label: `review:block-${block.id}`, phase: 'Review', schema: FINDINGS_SCHEMA }),
  (review) => {
    if (!review) return null
    const high = review.findings.filter(f => f.severity === 'high')
    if (!high.length) return { ...review, verified: [] }
    return parallel(high.map(f => () =>
      agent(`Адверсариально перепроверь находку по детскому теннисному банку (${FILE}).
Блок ${review.blockId}, вопрос id=${f.questionId}. Заявленная проблема (${f.category}): ${f.issue}
Предложение: ${f.suggestion}

Твоя задача — попытаться ОПРОВЕРГНУТЬ находку. Открой вопрос в файле, проверь сам. По теннисной тактике рассуждай как тренер. Учти: варианты перемешиваются на фронте (shuffle в app.js), так что «правильный всегда первый» в данных — не баг. Подтверждай confirmed=true только если проблема реальна и важна. Если сомневаешься — confirmed=false.`,
        { label: `verify:q${f.questionId}`, phase: 'Verify', schema: VERDICT_SCHEMA })
        .then(v => ({ finding: f, verdict: v }))
    )).then(verified => ({ ...review, verified: verified.filter(Boolean) }))
  }
)

phase('CrossCheck')
const cross = await agent(
  `Прочитай ${FILE} целиком (116 вопросов, 17 блоков). Найди:
1. duplicates — вопросы из РАЗНЫХ блоков, дублирующие друг друга по сути (одинаковая идея/ответ). Укажи их id.
2. answerBiasNote — посчитай распределение correctIndex по всем вопросам; есть ли перекос. ВАЖНО: на фронте варианты перемешиваются (shuffle в app.js), поэтому позиционный перекос в данных НЕ доходит до игрока — это смелл данных, не баг.
3. difficultyNote — распределение difficulty (Б/С/П); сбалансировано ли по блокам.
4. overall — общий вывод о банке.`,
  { label: 'cross-block', phase: 'CrossCheck', schema: CROSS_SCHEMA }
)

const blocks = reviewed.filter(Boolean)
const allFindings = blocks.flatMap(b => b.findings.map(f => ({ blockId: b.blockId, ...f })))
const confirmedHigh = blocks.flatMap(b => (b.verified || []).filter(v => v.verdict?.confirmed).map(v => ({ blockId: b.blockId, ...v.finding })))
const refutedHigh = blocks.flatMap(b => (b.verified || []).filter(v => !v.verdict?.confirmed).map(v => ({ blockId: b.blockId, ...v.finding })))

const counts = { high: 0, medium: 0, low: 0 }
for (const f of allFindings) counts[f.severity]++

log(`Свип готов: ${allFindings.length} находок (high ${counts.high}, medium ${counts.medium}, low ${counts.low}); подтверждено серьёзных ${confirmedHigh.length}, опровергнуто ${refutedHigh.length}`)

return {
  totals: counts,
  confirmedHigh,
  refutedHigh,
  byBlock: blocks.map(b => ({ blockId: b.blockId, summary: b.blockSummary, findings: b.findings })),
  crossBlock: cross,
}
