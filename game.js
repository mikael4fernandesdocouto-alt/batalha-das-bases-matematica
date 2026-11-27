'use strict';

const $ = (id) => document.getElementById(id);
const screens = ['start', 'rules', 'game', 'result', 'win', 'qr'];
const letters = ['A', 'B', 'C', 'D'];
const totalQuestions = 15;

let playerName = '';
let playerGrade = null;
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
let activeSet = null;
let currentVariantIndex = 0;
let lastFinalText = '';

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

function pick(items) {
  return items[random(0, items.length - 1)];
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

/* Cada gerador devolve a pergunta "crua"; question() monta as alternativas. */
function q(topic, text, answer, wrong) {
  return { topic, text, answer, wrong };
}

/* ------------------------------------------------------------------ *
 *  FAMÍLIAS DE PERGUNTAS — 3 modelos por família
 * ------------------------------------------------------------------ */
const TOPICS = {
  /* ---- aritmética básica ---- */
  soma: [
    () => {
      const a = random(24, 79), b = random(16, 59), answer = a + b;
      return q('ADIÇÃO', `Quanto é ${a} + ${b}?`, answer, [answer + 2, answer - 3, answer + 10]);
    },
    () => {
      const a = random(3, 9), b = random(11, 49), answer = a + b;
      return q('ADIÇÃO', `Quanto é ${a} + ${b}?`, answer, [answer + 1, answer - 2, answer + 9]);
    },
    () => {
      const a = random(11, 39), b = random(12, 45), c = random(10, 30), answer = a + b + c;
      return q('ADIÇÃO', `Quanto é ${a} + ${b} + ${c}?`, answer, [answer + 5, answer - 4, answer + 11]);
    }
  ],
  sub: [
    () => {
      const a = random(62, 99), b = random(13, 48), answer = a - b;
      return q('SUBTRAÇÃO', `Quanto é ${a} − ${b}?`, answer, [answer + 1, answer - 2, answer + 10]);
    },
    () => {
      const a = random(120, 899), b = random(35, 119), answer = a - b;
      return q('SUBTRAÇÃO', `Quanto é ${a} − ${b}?`, answer, [answer + 10, answer - 1, answer + 100]);
    },
    () => {
      const a = random(2, 9) * 10, b = random(3, 9), answer = a - b;
      return q('SUBTRAÇÃO', `Quanto é ${a} − ${b}?`, answer, [answer - 1, answer + 2, answer + 10]);
    }
  ],
  mult: [
    () => {
      const a = random(6, 13), b = random(6, 12), answer = a * b;
      return q('MULTIPLICAÇÃO', `Quanto é ${a} × ${b}?`, answer, [answer + a, answer - b, answer + 10]);
    },
    () => {
      const a = random(11, 49), b = random(3, 9), answer = a * b;
      return q('MULTIPLICAÇÃO', `Quanto é ${a} × ${b}?`, answer, [answer + b, answer - a, answer + 10]);
    },
    () => {
      const a = random(12, 89), factor = pick([10, 100]), answer = a * factor;
      return q('MULTIPLICAÇÃO', `Quanto é ${a} × ${factor}?`, answer, [answer + factor, answer / 10, answer - factor]);
    }
  ],
  div: [
    () => {
      const b = random(3, 9), answer = random(4, 12), dividend = b * answer;
      return q('DIVISÃO', `Quanto é ${dividend} ÷ ${b}?`, answer, [answer + 1, answer - 2, answer + 3]);
    },
    () => {
      const a = random(2, 9) * 100, factor = pick([10, 100]), answer = a / factor;
      return q('DIVISÃO', `Quanto é ${a} ÷ ${factor}?`, answer, [answer * 10, answer + 10, answer - 5]);
    },
    () => {
      const answer = random(6, 49), a = answer * 2;
      return q('DIVISÃO', `Quanto é a metade de ${a}?`, answer, [answer + 2, answer - 3, answer + 10]);
    }
  ],

  /* ---- operações e porcentagem ---- */
  ordem: [
    () => {
      const a = random(5, 12), b = random(3, 9), c = random(2, 5), answer = (a + b) * c;
      return q('ORDEM DAS OPERAÇÕES', `Calcule: (${a} + ${b}) × ${c}`, answer, [a + b * c, answer + c, answer - b]);
    },
    () => {
      const a = random(5, 20), b = random(3, 9), c = random(2, 6), answer = a + b * c;
      return q('ORDEM DAS OPERAÇÕES', `Calcule: ${a} + ${b} × ${c}`, answer, [(a + b) * c, answer + b, answer - c]);
    },
    () => {
      const a = random(3, 9), b = random(8, 15), c = random(2, 5), answer = a * (b - c);
      return q('ORDEM DAS OPERAÇÕES', `Calcule: ${a} × (${b} − ${c})`, answer, [a * b - c, answer + a, answer - b]);
    }
  ],
  porc: [
    () => {
      const percent = pick([15, 20, 25, 30]);
      const base = random(4, 12) * 20;
      const answer = base * percent / 100;
      return q('PORCENTAGEM', `Quanto é ${percent}% de ${base}?`, answer, [answer + 5, answer * 2, base - answer]);
    },
    () => {
      const price = random(5, 15) * 20;
      const percent = pick([10, 15, 20, 25, 30]);
      const discount = price * percent / 100;
      const answer = price - discount;
      return q('DESCONTO', `Uma camisa de R$ ${price} está com ${percent}% de desconto. Qual o preço final?`, answer, [discount, answer + 10, price]);
    },
    () => {
      const total = random(2, 10) * 100;
      const percent = pick([10, 20, 25, 50]);
      const part = total * percent / 100;
      return q('PORCENTAGEM', `${part} é quantos por cento de ${total}?`, `${percent}%`, [`${percent + 10}%`, `${percent + 5}%`, `${Math.max(5, percent - 5)}%`]);
    }
  ],

  /* ---- equações ---- */
  eq: [
    () => {
      const x = random(4, 16), a = random(2, 7), b = random(3, 15), result = a * x + b;
      return q('EQUAÇÃO', `Se ${a}x + ${b} = ${result}, quanto vale x?`, x, [x + 2, x - 2, a * x]);
    },
    () => {
      const x = random(4, 14), a = random(3, 9), b = random(2, 12), result = a * x - b;
      return q('EQUAÇÃO', `Se ${a}x − ${b} = ${result}, quanto vale x?`, x, [x + 3, x - 1, x + a]);
    },
    () => {
      const a = random(2, 6), x = a * random(2, 9), b = random(2, 9), result = x / a + b;
      return q('EQUAÇÃO', `Se x/${a} + ${b} = ${result}, quanto vale x?`, x, [result - b, x + a, x - a]);
    }
  ],

  /* ---- frações ---- */
  frac: [
    () => {
      const d1 = pick([3, 4, 5, 6]), d2 = pick([4, 5, 6, 8]);
      const n1 = random(1, d1 - 1), n2 = random(1, d2 - 1);
      const numerator = n1 * d2 + n2 * d1, denominator = d1 * d2;
      const divisor = gcd(numerator, denominator);
      const top = numerator / divisor, bottom = denominator / divisor;
      return q('FRAÇÕES', `Quanto é ${n1}/${d1} + ${n2}/${d2}?`, `${top}/${bottom}`, [`${top + 1}/${bottom}`, `${top}/${bottom + 1}`, `${top + 2}/${bottom}`]);
    },
    () => {
      const n1 = random(1, 5), d1 = random(2, 7), n2 = random(1, 5), d2 = random(2, 7);
      const numerator = n1 * n2, denominator = d1 * d2;
      const divisor = gcd(numerator, denominator);
      const top = numerator / divisor, bottom = denominator / divisor;
      return q('FRAÇÕES', `Quanto é ${n1}/${d1} × ${n2}/${d2}?`, `${top}/${bottom}`, [`${numerator + 1}/${denominator}`, `${numerator}/${denominator + 1}`, `${n1 + n2}/${d1 + d2}`]);
    },
    () => {
      const denominator = pick([3, 4, 5, 6, 8]);
      const numerator = random(1, denominator - 1);
      const multiplier = random(2, 12);
      const total = denominator * multiplier;
      const answer = numerator * multiplier;
      return q('FRAÇÕES', `Quanto é ${numerator}/${denominator} de ${total}?`, answer, [total - answer, answer + numerator, total / denominator]);
    }
  ],

  /* ---- potências e raízes ---- */
  pot: [
    () => {
      const base = random(2, 4), a = random(3, 5), b = random(2, 4), answer = base ** (a + b);
      return q('POTÊNCIAS', `Quanto é ${base}^${a} × ${base}^${b}?`, answer, [base ** (a * b), base ** Math.abs(a - b), answer + base]);
    },
    () => {
      const base = random(2, 3), a = random(2, 3), b = random(2, 3), answer = base ** (a * b);
      return q('POTÊNCIAS', `Quanto é (${base}^${a})^${b}?`, answer, [base ** (a + b), base ** a + b, answer + base]);
    },
    () => {
      const base = random(2, 4), b = random(1, 2), a = b + random(1, 3), answer = base ** (a - b);
      return q('POTÊNCIAS', `Quanto é ${base}^${a} ÷ ${base}^${b}?`, answer, [base ** (a + b), base ** a - b, answer + base]);
    }
  ],
  rad: [
    () => {
      const root = random(11, 19), cube = random(2, 5), answer = root + cube;
      return q('RADICIAÇÃO', `Quanto é √${root ** 2} + ∛${cube ** 3}?`, answer, [root * cube, answer - 2, answer + 3]);
    },
    () => {
      const k = random(2, 6), m = pick([2, 3, 5]);
      return q('RADICIAÇÃO', `Simplifique: √${k * k * m}`, `${k}√${m}`, [`${k * m}`, `${k}√${m * k}`, `${k + 1}√${m}`]);
    },
    () => {
      const n = random(2, 9), m = random(2, 9), answer = n * m;
      return q('RADICIAÇÃO', `Quanto é √${n ** 2} × √${m ** 2}?`, answer, [n + m, answer + n, n ** 2 + m]);
    }
  ],

  /* ---- geometria ---- */
  pita: [
    () => {
      const [a, b, c] = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]]);
      return q('TEOREMA DE PITÁGORAS', `Um triângulo retângulo tem catetos ${a} e ${b}. Qual é a hipotenusa?`, c, [a + b, c - 2, Math.abs(b - a)]);
    },
    () => {
      const [a, b, c] = pick([[6, 8, 10], [9, 12, 15], [5, 12, 13], [8, 15, 17]]);
      return q('TEOREMA DE PITÁGORAS', `Num triângulo retângulo, a hipotenusa mede ${c} e um cateto mede ${a}. Quanto mede o outro cateto?`, b, [c - a, b + 2, b - 3]);
    },
    () => {
      const [a, b, c] = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17]]), k = random(2, 4);
      return q('TEOREMA DE PITÁGORAS', `Um triângulo retângulo tem catetos ${a * k} e ${b * k}. Qual é a hipotenusa?`, c * k, [a * k + b * k, c * k - 2, c * k + 3]);
    }
  ],
  geo: [
    () => {
      const n = random(16, 25), answer = n * (n - 3) / 2;
      return q('GEOMETRIA COMBINATÓRIA', `Quantas diagonais possui um polígono de ${n} lados?`, answer, [n * (n - 1) / 2, n * (n - 2) / 2, answer - n]);
    },
    () => {
      const n = random(6, 15), answer = (n - 2) * 180;
      return q('GEOMETRIA', `Qual é a soma dos ângulos internos de um polígono de ${n} lados?`, answer, [(n - 1) * 180, n * 180, (n - 2) * 90]);
    },
    () => {
      const n = random(8, 14), answer = n - 3;
      return q('GEOMETRIA', `Quantas diagonais partem de um único vértice de um polígono de ${n} lados?`, answer, [n, n - 2, n - 1]);
    }
  ],

  /* ---- sequências, contagem e probabilidade ---- */
  pa: [
    () => {
      const first = random(2, 9), ratio = random(3, 8), position = random(18, 30);
      const answer = first + (position - 1) * ratio;
      return q('PROGRESSÃO ARITMÉTICA', `Numa P.A., a₁ = ${first} e r = ${ratio}. Qual é a${position}?`, answer, [first + position * ratio, position * ratio, answer - ratio]);
    },
    () => {
      const n = random(8, 15), first = random(1, 6), ratio = random(2, 5);
      const answer = n * (2 * first + (n - 1) * ratio) / 2;
      return q('PROGRESSÃO ARITMÉTICA', `Numa P.A. com a₁ = ${first} e r = ${ratio}, qual é a soma dos ${n} primeiros termos?`, answer, [n * first + (n - 1) * ratio, answer + n, answer - ratio]);
    },
    () => {
      const first = random(2, 9), ratio = random(2, 6), n = random(5, 10);
      const term = first + (n - 1) * ratio;
      return q('PROGRESSÃO ARITMÉTICA', `Numa P.A., a₁ = ${first} e a${n} = ${term}. Qual é a razão r?`, ratio, [ratio + 1, ratio - 1, term - first]);
    }
  ],
  comb: [
    () => {
      const n = random(8, 14), answer = n * (n - 1) / 2;
      return q('COMBINATÓRIA', `De quantas formas podemos escolher 2 pessoas entre ${n}?`, answer, [n * 2, n ** 2, (n - 1) * 2]);
    },
    () => {
      const n = random(4, 6), answer = [24, 120, 720][n - 4];
      return q('COMBINATÓRIA', `Quantos anagramas tem uma palavra com ${n} letras, todas diferentes?`, answer, [answer / n, answer - n, n ** 2]);
    },
    () => {
      const a = random(3, 6), b = random(3, 6), c = random(2, 4), answer = a * b * c;
      return q('COMBINATÓRIA', `Uma senha tem ${a} opções no 1º dígito, ${b} no 2º e ${c} no 3º. Quantas senhas diferentes existem?`, answer, [a + b + c, a * b, answer + c]);
    }
  ],
  prob: [
    () => {
      const target = pick([5, 6, 8, 9]);
      const combos = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1][target];
      const divisor = gcd(combos, 36);
      return q('PROBABILIDADE', `Dois dados são lançados. Qual a chance da soma ser ${target}?`, `${combos / divisor}/${36 / divisor}`, [`${combos}/12`, `${target}/36`, `1/${target}`]);
    },
    () => {
      const total = random(8, 12), red = random(2, total - 2), divisor = gcd(red, total);
      return q('PROBABILIDADE', `Uma urna tem ${red} bolas vermelhas e ${total - red} azuis. Qual a chance de tirar uma vermelha?`, `${red / divisor}/${total / divisor}`, [`${red}/${total + 1}`, `${red + 1}/${total}`, `1/${red}`]);
    },
    () => q('PROBABILIDADE', 'Três moedas justas são lançadas. Qual a chance de sair exatamente 2 caras?', '3/8', ['1/3', '2/3', '1/2'])
  ],

  /* ---- álgebra avançada (só professor) ---- */
  alg: [
    () => {
      const roots = shuffle([2, 3, 4, 5, 6, 7]).slice(0, 3);
      const sum = roots.reduce((a, b) => a + b, 0);
      const pair = roots[0] * roots[1] + roots[0] * roots[2] + roots[1] * roots[2];
      const product = roots[0] * roots[1] * roots[2];
      return q('ÁLGEBRA AVANÇADA', `Qual é a soma das raízes de x³ − ${sum}x² + ${pair}x − ${product} = 0?`, sum, [pair, product, -sum]);
    },
    () => {
      const roots = shuffle([2, 3, 4, 5, 6, 7]).slice(0, 3);
      const sum = roots.reduce((a, b) => a + b, 0);
      const pair = roots[0] * roots[1] + roots[0] * roots[2] + roots[1] * roots[2];
      const product = roots[0] * roots[1] * roots[2];
      return q('ÁLGEBRA AVANÇADA', `Qual é o produto das raízes de x³ − ${sum}x² + ${pair}x − ${product} = 0?`, product, [sum, pair, -product]);
    },
    () => {
      const sum = random(6, 18), product = random(4, 40);
      return q('ÁLGEBRA AVANÇADA', `Qual é a soma das raízes de x² − ${sum}x + ${product} = 0?`, sum, [product, -sum, sum + product]);
    }
  ],

  /* ---- rodada final (só professor) ---- */
  final: [
    () => finalFrom('complexos'),
    () => finalFrom('algebra'),
    () => finalFrom('geometria')
  ]
};

const FINAL_POOLS = {
  complexos: [
    { topic: 'NÚMEROS COMPLEXOS', text: 'Qual é o valor de i²⁰²⁶?', answer: '−1', wrong: ['1', 'i', '−i'] },
    { topic: 'TEORIA DOS NÚMEROS', text: 'Qual é o resto da divisão de 2¹⁰⁰ por 7?', answer: '2', wrong: ['1', '3', '4'] },
    { topic: 'POTENCIAÇÃO', text: 'Quais são os dois últimos algarismos de 7²⁰²?', answer: '49', wrong: ['07', '21', '01'] },
    { topic: 'NÚMEROS COMPLEXOS', text: 'Qual é o valor de i²⁰²⁵?', answer: 'i', wrong: ['1', '−1', '−i'] },
    { topic: 'TEORIA DOS NÚMEROS', text: 'Qual é o resto da divisão de 3¹⁰⁰ por 5?', answer: '1', wrong: ['2', '3', '4'] }
  ],
  algebra: [
    { topic: 'RADICAIS INFINITOS', text: 'Se x = √(2 + √(2 + √(2 + …))), quanto vale x?', answer: '2', wrong: ['√2', '4', '1'] },
    { topic: 'LOGARITMOS', text: 'Quanto vale log₂ 64?', answer: '6', wrong: ['5', '8', '32'] },
    { topic: 'SÉRIES INFINITAS', text: 'Quanto vale 1 + 1/2 + 1/4 + 1/8 + …?', answer: '2', wrong: ['1', '3', '∞'] },
    { topic: 'ÁLGEBRA', text: 'Se x + 1/x = 3, quanto vale x² + 1/x²?', answer: '7', wrong: ['9', '6', '11'] },
    { topic: 'POTENCIAÇÃO', text: 'Se 2ˣ = 32, quanto vale x?', answer: '5', wrong: ['4', '6', '16'] }
  ],
  geometria: [
    { topic: 'GEOMETRIA', text: 'Quantas diagonais possui um polígono de 20 lados?', answer: '170', wrong: ['180', '160', '190'] },
    { topic: 'COMBINATÓRIA', text: 'Quantos subconjuntos tem um conjunto de 10 elementos?', answer: '1024', wrong: ['512', '100', '20'] },
    { topic: 'GEOMETRIA', text: 'Qual é a soma dos ângulos internos de um polígono de 12 lados?', answer: '1800°', wrong: ['2160°', '1440°', '1080°'] },
    { topic: 'COMBINATÓRIA', text: 'De quantas formas podemos escolher 3 pessoas entre 10?', answer: '120', wrong: ['720', '30', '1000'] }
  ]
};

function finalFrom(bank) {
  const pool = FINAL_POOLS[bank];
  const options = pool.length > 1 ? pool.filter((item) => item.text !== lastFinalText) : pool;
  const picked = pick(options.length ? options : pool);
  lastFinalText = picked.text;
  return q(picked.topic, picked.text, picked.answer, picked.wrong);
}

/* ------------------------------------------------------------------ *
 *  TRILHAS POR TURMA — 15 casas, da mais fácil para a mais difícil
 * ------------------------------------------------------------------ */
const GRADES = {
  '6': {
    label: '6º ANO',
    bonus: 10,
    trilha: ['soma', 'sub', 'mult', 'div', 'soma', 'mult', 'ordem', 'porc', 'ordem', 'frac', 'porc', 'frac', 'ordem', 'porc', 'frac']
  },
  '7': {
    label: '7º ANO',
    bonus: 8,
    trilha: ['soma', 'sub', 'mult', 'div', 'ordem', 'porc', 'frac', 'eq', 'ordem', 'frac', 'porc', 'eq', 'frac', 'eq', 'porc']
  },
  '8': {
    label: '8º ANO',
    bonus: 6,
    trilha: ['mult', 'div', 'ordem', 'porc', 'frac', 'eq', 'eq', 'pot', 'frac', 'rad', 'eq', 'pot', 'porc', 'rad', 'pot']
  },
  '9': {
    label: '9º ANO',
    bonus: 4,
    trilha: ['ordem', 'porc', 'frac', 'eq', 'pot', 'rad', 'pita', 'eq', 'pot', 'pita', 'rad', 'pa', 'pita', 'pa', 'rad']
  },
  '1': {
    label: '1º ANO EM',
    bonus: 2,
    trilha: ['porc', 'frac', 'eq', 'pot', 'rad', 'pita', 'pa', 'pot', 'pita', 'pa', 'comb', 'prob', 'pa', 'comb', 'prob']
  },
  '2': {
    label: '2º ANO EM',
    bonus: 0,
    trilha: ['eq', 'frac', 'pot', 'rad', 'pita', 'pa', 'comb', 'prob', 'pa', 'comb', 'prob', 'geo', 'geo', 'comb', 'prob']
  },
  '3': {
    label: '3º ANO EM',
    bonus: 0,
    trilha: ['pot', 'rad', 'pita', 'pa', 'comb', 'prob', 'pa', 'comb', 'prob', 'geo', 'geo', 'prob', 'comb', 'geo', 'prob']
  },
  prof: {
    label: 'PROFESSOR',
    bonus: 0,
    trilha: ['soma', 'mult', 'porc', 'ordem', 'eq', 'frac', 'pot', 'rad', 'pita', 'pa', 'comb', 'prob', 'alg', 'geo', 'final']
  }
};

/* ------------------------------------------------------------------ *
 *  CONJUNTOS — cada rodada sorteia uma combinação de variantes
 * ------------------------------------------------------------------ */
const SETS = [
  { id: 'A', label: 'CONJUNTO A', picks: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'B', label: 'CONJUNTO B', picks: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { id: 'C', label: 'CONJUNTO C', picks: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
  { id: 'D', label: 'CONJUNTO D', picks: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2] },
  { id: 'E', label: 'CONJUNTO E', picks: [1, 2, 0, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1] },
  { id: 'F', label: 'CONJUNTO F', picks: [2, 0, 1, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0] }
];

const SET_STORAGE_KEY = 'desafio-final-conjunto';

function pickSet() {
  let previous = null;
  try {
    previous = localStorage.getItem(SET_STORAGE_KEY);
  } catch (error) {
    previous = null;
  }
  const candidates = SETS.filter((set) => set.id !== previous);
  const chosen = pick(candidates.length ? candidates : SETS);
  try {
    localStorage.setItem(SET_STORAGE_KEY, chosen.id);
  } catch (error) {
    /* localStorage bloqueado: o sorteio continua funcionando sem memória */
  }
  return chosen;
}

function topicAt(slot) {
  return GRADES[playerGrade].trilha[slot - 1];
}

function pickVariantIndex(slot, avoid) {
  const pool = TOPICS[topicAt(slot)];
  if (pool.length < 2) return 0;
  let index = random(0, pool.length - 1);
  while (index === avoid) index = random(0, pool.length - 1);
  return index;
}

function buildQuestion(slot, variantIndex) {
  const pool = TOPICS[topicAt(slot)];
  const variant = pool[Math.min(variantIndex, pool.length - 1)];
  const raw = variant();
  return question(raw.topic, raw.text, raw.answer, raw.wrong);
}

function generateQuestion(slot) {
  const set = activeSet || SETS[0];
  return buildQuestion(slot, set.picks[slot - 1]);
}

function showScreen(name) {
  screens.forEach((screen) => $(`${screen}-screen`).hidden = screen !== name);
  document.body.classList.toggle('qr-mode', name === 'qr');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showToast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toastId);
  toastId = setTimeout(() => $('toast').classList.remove('show'), 1800);
}

function getTimeLimit(stage) {
  let base;
  if (stage <= 3) base = 30;
  else if (stage <= 6) base = 24;
  else if (stage <= 9) base = 18;
  else if (stage <= 12) base = 13;
  else if (stage <= 14) base = 10;
  else base = 8;
  const bonus = playerGrade && GRADES[playerGrade] ? GRADES[playerGrade].bonus : 0;
  return Math.min(45, base + bonus);
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
  currentVariantIndex = 0;
  lastFinalText = '';
  activeSet = pickSet();
  $('fifty-button').classList.remove('used');
  $('skip-button').classList.remove('used');
  $('player-display').textContent = playerName;
  $('player-initial').textContent = playerName.charAt(0).toUpperCase();
  $('set-label').textContent = `${GRADES[playerGrade].label} · ${activeSet.label}`;
  showScreen('game');
  loadQuestion();
  showToast(`${GRADES[playerGrade].label} · ${activeSet.label}`);
}

function loadQuestion(forceNewVariant) {
  clearInterval(timerId);
  locked = false;
  selectedIndex = null;

  const variantIndex = forceNewVariant
    ? pickVariantIndex(level, currentVariantIndex)
    : activeSet.picks[level - 1];
  currentVariantIndex = variantIndex;

  currentQuestion = buildQuestion(level, variantIndex);
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
  if (chosen.correct) celebrateAnswer();

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

function celebrateAnswer() {
  const overlay = $('correct-celebration');
  const confetti = $('answer-confetti');
  const colors = ['#ffcc3d', '#ff7a18', '#18c77a', '#2f7df2', '#ffffff'];
  confetti.textContent = '';

  for (let i = 0; i < 48; i++) {
    const piece = document.createElement('i');
    piece.style.left = `${random(-185, 185)}px`;
    piece.style.top = `${random(-125, 125)}px`;
    piece.style.setProperty('--x', `${random(-220, 220)}px`);
    piece.style.setProperty('--y', `${random(-240, 220)}px`);
    piece.style.setProperty('--r', `${random(-540, 540)}deg`);
    piece.style.setProperty('--delay', `${Math.random() * .18}s`);
    piece.style.background = colors[random(0, colors.length - 1)];
    confetti.appendChild(piece);
  }

  overlay.classList.remove('show');
  void overlay.offsetWidth;
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden', 'false');
  setTimeout(() => {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  }, 1250);
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
  loadQuestion(true);
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

/* ------------------------------------------------------------------ *
 *  TELA DE QR CODE
 * ------------------------------------------------------------------ */
function gameUrl() {
  return location.origin + location.pathname;
}

function renderQr() {
  const holder = $('qr-holder');
  const url = gameUrl();
  $('qr-url').textContent = url;
  holder.textContent = '';

  if (!/^https?:$/.test(location.protocol)) {
    const warning = document.createElement('p');
    warning.className = 'qr-warning';
    warning.textContent = 'Abra o jogo pelo endereço publicado (https) para gerar o QR Code.';
    holder.appendChild(warning);
    return;
  }

  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  holder.innerHTML = qr.createSvgTag({
    cellSize: 8,
    margin: 2,
    scalable: true,
    alt: 'QR Code para abrir o jogo no celular'
  });
}

function showQr() {
  renderQr();
  showScreen('qr');
}

/* ------------------------------------------------------------------ *
 *  SELEÇÃO DE TURMA
 * ------------------------------------------------------------------ */
function selectGrade(key) {
  playerGrade = key;
  document.querySelectorAll('.grade-chip').forEach((chip) => {
    const on = chip.dataset.grade === key;
    chip.classList.toggle('selected', on);
    chip.setAttribute('aria-checked', String(on));
  });
}

$('start-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!playerGrade) {
    showToast('Escolha sua turma primeiro.');
    document.querySelector('.grade-grid').classList.add('shake');
    setTimeout(() => document.querySelector('.grade-grid').classList.remove('shake'), 500);
    return;
  }
  playerName = $('player-name').value.trim().slice(0, 18) || 'Participante';
  startGame();
});
document.querySelectorAll('.grade-chip').forEach((chip) => {
  chip.addEventListener('click', () => selectGrade(chip.dataset.grade));
});
$('rules-button').addEventListener('click', () => showScreen('rules'));
$('qr-button').addEventListener('click', showQr);
$('qr-refresh').addEventListener('click', renderQr);
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
  module.exports = { generateQuestion, getTimeLimit, gcd, TOPICS, SETS, GRADES, FINAL_POOLS, buildQuestion };
}
