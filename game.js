'use strict';

const $ = (id) => document.getElementById(id);
const screens = ['start', 'rules', 'game', 'result', 'win'];
const letters = ['A', 'B', 'C', 'D'];
const totalQuestions = 15;

let playerName = '';
let level = 1;
let currentQuestion = null;
let selectedIndex = null;
let timeLeft = 30;
let timerId = null;
let deadline = 0;
let fiftyUsed = false;
let skipUsed = false;
let locked = false;
let toastId = null;

const finalQuestions = [
  { topic: 'NÚMEROS COMPLEXOS', text: 'Qual é o valor de i²⁰²⁶?', answer: '−1', wrong: ['1', 'i', '−i'] },
  { topic: 'TEORIA DOS NÚMEROS', text: 'Qual é o resto da divisão de 2¹⁰⁰ por 7?', answer: '2', wrong: ['1', '3', '4'] },
  { topic: 'POTENCIAÇÃO', text: 'Quais são os dois últimos algarismos de 7²⁰²?', answer: '49', wrong: ['07', '21', '01'] },
  { topic: 'GEOMETRIA', text: 'Quantas diagonais possui um polígono de 20 lados?', answer: '170', wrong: ['180', '160', '190'] },
  { topic: 'RADICAIS INFINITOS', text: 'Se x = √(2 + √(2 + √(2 + …))), quanto vale x?', answer: '2', wrong: ['√2', '4', '1'] }
];

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return Math.abs(a);
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = random(0, i);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function buildOptions(answer, distractors) {
  const values = [String(answer), ...distractors.map(String)];
  const unique = [...new Set(values)];
  let bump = 1;
  while (unique.length < 4) {
    const numeric = Number(answer);
    let extra;
    if (Number.isFinite(numeric)) {
      extra = String(numeric + bump++);
    } else if (String(answer).includes('/')) {
      const [numerator, denominator] = String(answer).split('/').map(Number);
      extra = `${numerator + bump++}/${denominator}`;
    } else {
      extra = `Alternativa ${bump++}`;
    }
    if (!unique.includes(extra)) unique.push(extra);
  }
  return shuffle(unique.slice(0, 4)).map((text) => ({ text, correct: text === String(answer) }));
}

function question(topic, text, answer, wrong) {
  return { topic, text, options: buildOptions(answer, wrong) };
}

function generateQuestion(stage) {
  if (stage === 1) {
    const a = random(24, 79), b = random(16, 59);
    return question('ARITMÉTICA', `Quanto é ${a} + ${b}?`, a + b, [a + b + 2, a + b - 3, a + b + 10]);
  }
  if (stage === 2) {
    const a = random(6, 13), b = random(6, 12), answer = a * b;
    return question('MULTIPLICAÇÃO', `Quanto é ${a} × ${b}?`, answer, [answer + a, answer - b, answer + 10]);
  }
  if (stage === 3) {
    const percent = shuffle([15, 20, 25, 30])[0];
    const base = random(4, 12) * 20;
    const answer = base * percent / 100;
    return question('PORCENTAGEM', `Quanto é ${percent}% de ${base}?`, answer, [answer + 5, answer * 2, base - answer]);
  }
  if (stage === 4) {
    const a = random(5, 12), b = random(3, 9), c = random(2, 5);
    const answer = (a + b) * c;
    return question('ORDEM DAS OPERAÇÕES', `Calcule: (${a} + ${b}) × ${c}`, answer, [a + b * c, answer + c, answer - b]);
  }
  if (stage === 5) {
    const x = random(4, 16), a = random(2, 7), b = random(3, 15), result = a * x + b;
    return question('EQUAÇÃO', `Se ${a}x + ${b} = ${result}, quanto vale x?`, x, [x + 2, x - 2, a * x]);
  }
  if (stage === 6) {
    const d1 = shuffle([3, 4, 5, 6])[0], d2 = shuffle([4, 5, 6, 8])[0];
    const n1 = random(1, d1 - 1), n2 = random(1, d2 - 1);
    const numerator = n1 * d2 + n2 * d1, denominator = d1 * d2, divisor = gcd(numerator, denominator);
    const reducedNumerator = numerator / divisor, reducedDenominator = denominator / divisor;
    const answer = `${reducedNumerator}/${reducedDenominator}`;
    return question('FRAÇÕES', `Quanto é ${n1}/${d1} + ${n2}/${d2}?`, answer, [
      `${reducedNumerator + 1}/${reducedDenominator}`,
      `${reducedNumerator}/${reducedDenominator + 1}`,
      `${reducedNumerator + 2}/${reducedDenominator}`
    ]);
  }
  if (stage === 7) {
    const base = random(2, 4), a = random(3, 5), b = random(2, 4), exponent = a + b;
    const answer = base ** exponent;
    return question('POTÊNCIAS', `Quanto é ${base}^${a} × ${base}^${b}?`, answer, [base ** (a * b), base ** Math.abs(a - b), answer + base]);
  }
  if (stage === 8) {
    const root = random(11, 19), cube = random(2, 5), answer = root + cube;
    return question('RADICIAÇÃO', `Quanto é √${root ** 2} + ∛${cube ** 3}?`, answer, [root * cube, answer - 2, answer + 3]);
  }
  if (stage === 9) {
    const triples = [[3,4,5],[5,12,13],[8,15,17],[7,24,25]];
    const [a,b,c] = triples[random(0, triples.length - 1)];
    return question('TEOREMA DE PITÁGORAS', `Um triângulo retângulo tem catetos ${a} e ${b}. Qual é a hipotenusa?`, c, [a + b, c - 2, Math.abs(b - a)]);
  }
  if (stage === 10) {
    const first = random(2, 9), ratio = random(3, 8), position = random(18, 30);
    const answer = first + (position - 1) * ratio;
    return question('PROGRESSÃO ARITMÉTICA', `Numa P.A., a₁ = ${first} e r = ${ratio}. Qual é a${position}?`, answer, [first + position * ratio, position * ratio, answer - ratio]);
  }
  if (stage === 11) {
    const n = random(8, 14), answer = n * (n - 1) / 2;
    return question('COMBINATÓRIA', `De quantas formas podemos escolher 2 pessoas entre ${n}?`, answer, [n * 2, n ** 2, (n - 1) * 2]);
  }
  if (stage === 12) {
    const target = shuffle([5, 6, 8, 9])[0];
    const combinations = [0,0,1,2,3,4,5,6,5,4,3,2,1][target];
    const divisor = gcd(combinations, 36);
    const answer = `${combinations / divisor}/${36 / divisor}`;
    return question('PROBABILIDADE', `Dois dados são lançados. Qual a chance da soma ser ${target}?`, answer, [`${combinations}/12`, `${target}/36`, `1/${target}`]);
  }
  if (stage === 13) {
    const roots = shuffle([2,3,4,5,6,7]).slice(0, 3);
    const sum = roots.reduce((a,b) => a + b, 0);
    const pair = roots[0]*roots[1] + roots[0]*roots[2] + roots[1]*roots[2];
    const product = roots[0]*roots[1]*roots[2];
    return question('ÁLGEBRA AVANÇADA', `Qual é a soma das raízes de x³ − ${sum}x² + ${pair}x − ${product} = 0?`, sum, [pair, product, -sum]);
  }
  if (stage === 14) {
    const n = random(16, 25), answer = n * (n - 3) / 2;
    return question('GEOMETRIA COMBINATÓRIA', `Quantas diagonais possui um polígono de ${n} lados?`, answer, [n * (n - 1) / 2, n * (n - 2) / 2, answer - n]);
  }
  const picked = finalQuestions[random(0, finalQuestions.length - 1)];
  return question(picked.topic, picked.text, picked.answer, picked.wrong);
}

function showScreen(name) {
  screens.forEach((screen) => $(`${screen}-screen`).hidden = screen !== name);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showToast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toastId);
  toastId = setTimeout(() => $('toast').classList.remove('show'), 1800);
}

function getTimeLimit(stage) {
  if (stage <= 3) return 30;
  if (stage <= 6) return 24;
  if (stage <= 9) return 18;
  if (stage <= 12) return 13;
  if (stage <= 14) return 10;
  return 8;
}

function getDifficulty(stage) {
  if (stage <= 3) return 'AQUECIMENTO';
  if (stage <= 6) return 'VALENDO';
  if (stage <= 9) return 'DIFÍCIL';
  if (stage <= 12) return 'MUITO DIFÍCIL';
  if (stage <= 14) return 'ABSURDO';
  return 'QUASE IMPOSSÍVEL';
}

function startGame() {
  level = 1;
  fiftyUsed = false;
  skipUsed = false;
  $('fifty-button').classList.remove('used');
  $('skip-button').classList.remove('used');
  $('player-display').textContent = playerName;
  $('player-initial').textContent = playerName.charAt(0).toUpperCase();
  showScreen('game');
  loadQuestion();
}

function loadQuestion() {
  clearInterval(timerId);
  locked = false;
  selectedIndex = null;
  currentQuestion = generateQuestion(level);
  timeLeft = getTimeLimit(level);
  deadline = Date.now() + timeLeft * 1000;

  $('level-label').textContent = `PERGUNTA ${level} DE ${totalQuestions}`;
  $('difficulty-label').textContent = getDifficulty(level);
  $('progress-fill').style.width = `${level / totalQuestions * 100}%`;
  $('question-topic').textContent = currentQuestion.topic;
  $('question-text').textContent = currentQuestion.text;
  $('confirm-bar').hidden = true;
  $('timer').textContent = timeLeft;
  $('timer').parentElement.classList.remove('urgent');

  document.querySelectorAll('.money-ladder span').forEach((step) => {
    const number = Number(step.dataset.step);
    step.classList.toggle('done', number < level);
    step.classList.toggle('current', number === level);
  });

  document.querySelectorAll('#answers button').forEach((button, index) => {
    button.hidden = false;
    button.disabled = false;
    button.className = '';
    button.querySelector('strong').textContent = currentQuestion.options[index].text;
  });

  updateTimer();
  timerId = setInterval(updateTimer, 200);
}

function updateTimer() {
  const limit = getTimeLimit(level);
  timeLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  $('timer').textContent = timeLeft;
  $('timer-ring').style.strokeDashoffset = `${119.38 * (1 - timeLeft / limit)}`;
  $('timer').parentElement.classList.toggle('urgent', timeLeft <= 5);
  if (Date.now() >= deadline) {
    clearInterval(timerId);
    finishGame(false, true);
  }
}

function selectAnswer(index) {
  if (locked) return;
  const button = document.querySelector(`[data-answer="${index}"]`);
  if (button.hidden || button.classList.contains('eliminated')) return;
  selectedIndex = index;
  document.querySelectorAll('#answers button').forEach((item) => item.classList.remove('selected'));
  button.classList.add('selected');
  $('selected-answer').textContent = `${letters[index]} · ${currentQuestion.options[index].text}`;
  $('confirm-bar').hidden = false;
}

function confirmAnswer() {
  if (locked || selectedIndex === null) return;
  locked = true;
  clearInterval(timerId);
  $('confirm-bar').hidden = true;
  const buttons = [...document.querySelectorAll('#answers button')];
  buttons.forEach((button) => button.disabled = true);
  const chosen = currentQuestion.options[selectedIndex];
  buttons[selectedIndex].classList.add(chosen.correct ? 'correct' : 'wrong');

  setTimeout(() => {
    if (!chosen.correct) {
      const correctIndex = currentQuestion.options.findIndex((option) => option.correct);
      buttons[correctIndex].classList.add('correct');
      setTimeout(() => finishGame(false, false), 1300);
      return;
    }
    if (level === totalQuestions) {
      setTimeout(winGame, 1000);
      return;
    }
    setTimeout(() => {
      level++;
      loadQuestion();
    }, 900);
  }, 700);
}

function useFifty() {
  if (fiftyUsed || locked) return;
  const wrong = currentQuestion.options
    .map((option, index) => ({ option, index }))
    .filter(({ option, index }) => !option.correct && index !== selectedIndex);
  shuffle(wrong).slice(0, 2).forEach(({ index }) => {
    const button = document.querySelector(`[data-answer="${index}"]`);
    button.classList.add('eliminated');
    if (selectedIndex === index) selectedIndex = null;
  });
  fiftyUsed = true;
  $('fifty-button').classList.add('used');
  showToast('Duas respostas eliminadas.');
}

function useSkip() {
  if (skipUsed || locked) return;
  skipUsed = true;
  $('skip-button').classList.add('used');
  showToast('Pergunta trocada!');
  loadQuestion();
}

function finishGame(won, timeout) {
  if (won) return winGame();
  locked = true;
  clearInterval(timerId);
  const correct = currentQuestion.options.find((option) => option.correct).text;
  $('result-title').textContent = timeout ? 'O tempo acabou.' : 'Resposta errada.';
  $('result-message').textContent = level === 1
    ? 'A pressão começou cedo desta vez.'
    : `Você chegou até a pergunta ${level} de ${totalQuestions}.`;
  $('correct-reveal').innerHTML = `A resposta correta era <strong></strong>.`;
  $('correct-reveal').querySelector('strong').textContent = correct;
  showScreen('result');
}

function winGame() {
  locked = true;
  clearInterval(timerId);
  $('winner-name').textContent = `${playerName}, você venceu o Desafio Final!`;
  createConfetti();
  showScreen('win');
}

function createConfetti() {
  const container = $('confetti');
  container.textContent = '';
  const colors = ['#ffcc3d','#2f7df2','#ee3e5b','#18c77a','#ffffff'];
  for (let i = 0; i < 45; i++) {
    const piece = document.createElement('i');
    piece.className = 'confetti-piece';
    piece.style.left = `${random(0, 100)}%`;
    piece.style.background = colors[random(0, colors.length - 1)];
    piece.style.animationDelay = `${Math.random() * 3}s`;
    piece.style.animationDuration = `${2.5 + Math.random() * 2}s`;
    container.appendChild(piece);
  }
}

function goHome() {
  clearInterval(timerId);
  if ($('quit-dialog').open) $('quit-dialog').close();
  showScreen('start');
}

$('start-form').addEventListener('submit', (event) => {
  event.preventDefault();
  playerName = $('player-name').value.trim().slice(0, 18) || 'Participante';
  startGame();
});
$('rules-button').addEventListener('click', () => showScreen('rules'));
document.querySelectorAll('[data-home]').forEach((button) => button.addEventListener('click', goHome));
document.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => selectAnswer(Number(button.dataset.answer))));
$('confirm-button').addEventListener('click', confirmAnswer);
$('fifty-button').addEventListener('click', useFifty);
$('skip-button').addEventListener('click', useSkip);
$('quit-button').addEventListener('click', () => $('quit-dialog').showModal());
$('keep-playing').addEventListener('click', () => $('quit-dialog').close());
$('confirm-quit').addEventListener('click', goHome);
$('again-button').addEventListener('click', startGame);
$('win-again-button').addEventListener('click', startGame);

if (typeof module !== 'undefined') {
  module.exports = { generateQuestion, getTimeLimit, gcd };
}
