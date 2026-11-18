import test from "node:test";
import assert from "node:assert/strict";
import { topics, questions, courses, resources } from "../lib/content.ts";

const byId = new Map(questions.map((question) => [question.id, question]));

function selectedChoice(id) {
  const question = byId.get(id);
  assert.ok(question, `Question ${id} must exist`);
  return question.options[question.answer];
}

function normalizeMath(source) {
  return source.replaceAll("$", "").replace(/\\(?:left|right)\b/g, "")
    .replace(/\s+/g, "").replaceAll("−", "-");
}

// A closed recursive grammar: numbers, pi, square roots, fractions,
// grouping, arithmetic and bounded integer powers. No source evaluation.
function numericalExpression(source) {
  const text = normalizeMath(source);
  let position = 0;
  const fail = () => { throw new Error(`Unsupported numerical expression: ${source}`); };
  const startsAtom = () => /[\d.({\\√π]/.test(text[position] || "");
  const group = (open, close) => {
    if (text[position] !== open) fail();
    position++;
    const value = expression();
    if (text[position] !== close) fail();
    position++;
    return value;
  };
  // TeX unbraced arguments consume one token: \\frac12 means 1 / 2.
  const texArgument = () => {
    if (text[position] === "{") return group("{", "}");
    if (/\d/.test(text[position] || "")) return Number(text[position++]);
    return atom();
  };
  const atom = () => {
    if (text[position] === "(") return group("(", ")");
    if (text[position] === "{") return group("{", "}");
    if (text[position] === "π") { position++; return Math.PI; }
    if (text[position] === "√") { position++; const value = text[position] === "(" ? group("(", ")") : texArgument(); if (value < 0) fail(); return Math.sqrt(value); }
    const number = /^(?:\d+(?:\.\d+)?|\.\d+)/.exec(text.slice(position));
    if (number) { position += number[0].length; return Number(number[0]); }
    const command = /^\\[A-Za-z]+/.exec(text.slice(position));
    if (!command) fail();
    position += command[0].length;
    if (command[0] === "\\pi") return Math.PI;
    if (command[0] === "\\sqrt") { const value = texArgument(); if (value < 0) fail(); return Math.sqrt(value); }
    if (command[0] === "\\frac") { const numerator = texArgument(), denominator = texArgument(); if (!denominator) fail(); return numerator / denominator; }
    fail();
  };
  const power = () => {
    let value = atom();
    if (text[position] === "²") { position++; return value ** 2; }
    if (text[position] === "^") {
      position++;
      const exponent = text[position] === "{" ? group("{", "}") : atom();
      if (!Number.isInteger(exponent) || Math.abs(exponent) > 16) fail();
      value **= exponent;
    }
    return value;
  };
  const unary = () => {
    if (text[position] === "+") { position++; return unary(); }
    if (text[position] === "-") { position++; return -unary(); }
    return power();
  };
  const term = () => {
    let value = unary();
    while (position < text.length) {
      if (text[position] === "/") { position++; const denominator = unary(); if (!denominator) fail(); value /= denominator; }
      else if (text[position] === "*" || text[position] === "·" || text[position] === "×") { position++; value *= unary(); }
      else if (startsAtom()) value *= power();
      else break;
    }
    return value;
  };
  const expression = () => {
    let value = term();
    while (text[position] === "+" || text[position] === "-") {
      const sign = text[position++];
      const next = term();
      value += sign === "+" ? next : -next;
    }
    return value;
  };
  const value = expression();
  if (position !== text.length || !Number.isFinite(value)) fail();
  return value;
}

function near(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)), `${message}: ${actual} vs ${expected}`);
}

function assertNumericalChoice(id, expected) {
  near(numericalExpression(selectedChoice(id)), expected, id);
}

// Parses only integer-coefficient polynomials in n of degree at most two.
function polynomialAt(source, n) {
  const normalized = normalizeMath(source).replace(/\^\{2\}|\^2/g, "²");
  const terms = normalized.replaceAll("-", "+-").split("+").filter(Boolean);
  return terms.reduce((sum, term) => {
    const match = /^(-?)(?:(\d*)n(²)?|(\d+))$/.exec(term);
    assert.ok(match, `Unsupported polynomial term: ${term}`);
    const sign = match[1] ? -1 : 1;
    if (match[4] !== undefined) return sum + sign * Number(match[4]);
    return sum + sign * Number(match[2] || 1) * n ** (match[3] ? 2 : 1);
  }, 0);
}

test("content IDs are unique, references resolve and every topic has practice material", () => {
  for (const [kind, values] of Object.entries({ topics, questions, courses, resources })) {
    assert.equal(new Set(values.map((item) => item.id)).size, values.length, `${kind}: duplicate IDs`);
    assert.ok(values.every((item) => /^[a-z0-9-]+$/.test(item.id)), `${kind}: invalid ID`);
  }
  assert.equal(topics.length, 6);
  assert.ok(questions.length >= 24);
  const topicIds = new Set(topics.map((topic) => topic.id));
  for (const item of [...questions, ...courses, ...resources]) {
    assert.ok(topicIds.has(item.topicId), `${item.id}: unknown topic`);
    assert.ok(["高一", "高二", "高三"].includes(item.grade), `${item.id}: invalid grade`);
  }
  for (const topic of topics) {
    assert.ok(questions.filter((question) => question.topicId === topic.id).length >= 4, `${topic.id}: too few questions`);
    assert.ok(courses.some((course) => course.topicId === topic.id), `${topic.id}: missing course`);
    assert.ok(resources.some((resource) => resource.topicId === topic.id), `${topic.id}: missing resource`);
  }
});

test("every single-choice question has distinct options, a valid answer and a useful explanation", () => {
  for (const question of questions) {
    assert.equal(question.options.length, 4, question.id);
    assert.equal(new Set(question.options.map((option) => option.trim())).size, 4, `${question.id}: duplicate options`);
    assert.ok(question.options.every((option) => option.trim().length > 0), `${question.id}: empty option`);
    assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length, `${question.id}: invalid answer index`);
    assert.ok(question.prompt.length > 10, `${question.id}: missing prompt`);
    assert.ok(question.explanation.length >= 30, `${question.id}: insufficient explanation`);
    assert.ok(["基础", "进阶"].includes(question.difficulty), question.id);
  }
});

test("downloadable resources contain substantial Chinese teaching material and answers", () => {
  assert.equal(resources.length, 6);
  for (const resource of resources) {
    assert.equal(resource.format, "Markdown", resource.id);
    assert.ok(resource.content.startsWith("# "), `${resource.id}: missing document heading`);
    const chineseCount = (resource.content.match(/\p{Script=Han}/gu) || []).length;
    assert.ok(chineseCount >= 400, `${resource.id}: only ${chineseCount} Chinese characters`);
    assert.match(resource.content, /例一|例题/, resource.id);
    assert.match(resource.content, /自测/, resource.id);
    assert.match(resource.content, /答案/, resource.id);
  }
});

test("planned courses do not advertise an active sale or an invented price", () => {
  assert.equal(courses.length, 6);
  for (const course of courses) {
    assert.equal(course.status, "planning", course.id);
    assert.equal(course.priceCents, null, course.id);
    assert.match(course.description, /筹备/, course.id);
    assert.ok(course.lessons > 0 && Number.isInteger(course.lessons), course.id);
    assert.ok(course.syllabus.length >= 4, course.id);
    assert.doesNotMatch(`${course.title} ${course.description} ${course.tag}`, /已开售|立即购买|已有\d+人|保证提分|保过|百分百/, course.id);
  }
});

test("sequence answers agree with independent finite sums and differences", () => {
  assertNumericalChoice("seq-01", 3 + (10 - 1) * 2);
  const geometricSum = Array.from({ length: 4 }, (_, i) => 2 * 3 ** i).reduce((sum, term) => sum + term, 0);
  assertNumericalChoice("seq-02", geometricSum);
  for (let n = 1; n <= 20; n++) {
    const partialSum = (k) => k * k + 2 * k;
    near(polynomialAt(selectedChoice("seq-03"), n), partialSum(n) - partialSum(n - 1), `seq-03 at ${n}`);
    let recurrenceTerm = 1;
    for (let k = 1; k < n; k++) recurrenceTerm += 2 * k;
    near(polynomialAt(selectedChoice("seq-04"), n), recurrenceTerm, `seq-04 at ${n}`);
  }
});

test("function and trigonometry answers agree with elementary computations", () => {
  near(numericalExpression(String.raw`$\frac{2\sqrt{3}}{2}$`), Math.sqrt(3), "nested LaTeX numerical syntax");
  near(numericalExpression(String.raw`$\left(3\right)^{2}$`), 9, "grouping and superscript syntax");
  near(numericalExpression("$-2^2$"), -4, "unary minus follows exponentiation");
  for (const invalid of [String.raw`$\unknown{1}$`, "process.exit()", "1/0", String.raw`$\sqrt{-1}$`]) {
    assert.throws(() => numericalExpression(invalid), /Unsupported numerical expression/);
  }
  const a = 1, b = -4, c = 1;
  const vertexX = -b / (2 * a);
  assertNumericalChoice("fn-03", a * vertexX ** 2 + b * vertexX + c);
  assertNumericalChoice("tri-01", Math.sin(Math.PI / 6) + Math.cos(Math.PI / 3));
  assertNumericalChoice("tri-02", 2 * Math.PI / Math.abs(2));
  assertNumericalChoice("tri-03", -Math.sqrt(1 - (3 / 5) ** 2));
  assertNumericalChoice("tri-04", Math.hypot(1, 1));
});

test("geometry answers agree with squared lengths and completed-square parameters", () => {
  assertNumericalChoice("geo-01", Math.hypot(2, 2, 2));
  assertNumericalChoice("geo-02", Math.PI * 3 ** 2 * 4 / 3);
  assertNumericalChoice("geo-04", Math.hypot(3, 4, 12));
  assertNumericalChoice("ana-02", Math.abs(3 * 1 + 4 * 2 - 1) / Math.hypot(3, 4));
  assertNumericalChoice("ana-03", Math.sqrt(25 - 9) / Math.sqrt(25));

  const circle = /^圆心\((-?\d+),(-?\d+)\)，半径(.+)$/.exec(normalizeMath(selectedChoice("ana-01")));
  assert.ok(circle, "ana-01: unrecognized center and radius");
  const D = -4, E = 6, F = -12;
  near(Number(circle[1]), -D / 2, "circle center x");
  near(Number(circle[2]), -E / 2, "circle center y");
  near(numericalExpression(circle[3]), Math.sqrt((D * D + E * E) / 4 - F), "circle radius");

  const focus = /^\((-?\d+),(-?\d+)\)$/.exec(normalizeMath(selectedChoice("ana-04")));
  assert.ok(focus, "ana-04: unrecognized focus coordinate");
  near(Number(focus[1]), 8 / 4, "parabola focus x");
  near(Number(focus[2]), 0, "parabola focus y");
});

test("probability and variance answers agree with explicit outcome enumeration", () => {
  const diceOutcomes = [1, 2, 3, 4, 5, 6];
  assertNumericalChoice("pro-01", diceOutcomes.filter((value) => value > 4).length / diceOutcomes.length);

  const observations = [1, 2, 3, 4, 5];
  const mean = observations.reduce((sum, value) => sum + value, 0) / observations.length;
  const variance = observations.reduce((sum, value) => sum + (value - mean) ** 2, 0) / observations.length;
  assertNumericalChoice("pro-02", variance);
  assertNumericalChoice("pro-03", 1 - (1 - 0.6) * (1 - 0.5));

  const coinOutcomes = Array.from({ length: 2 ** 3 }, (_, bits) => {
    let heads = 0;
    for (let toss = 0; toss < 3; toss++) heads += (bits >> toss) & 1;
    return heads;
  });
  assertNumericalChoice("pro-04", coinOutcomes.filter((heads) => heads >= 2).length / coinOutcomes.length);
});
