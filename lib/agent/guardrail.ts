import type { AgentAnswer } from './schema.ts';
import type { ToolResult } from './tools.ts';

export type ToolNumberSource = {
  toolName: string;
  result: Pick<ToolResult, 'numbers'>;
};

export type ExtractedAnswerNumber = {
  token: string;
  value: number;
  field: string;
};

export type GuardrailResult = {
  ok: boolean;
  extracted: ExtractedAnswerNumber[];
  unmatched: ExtractedAnswerNumber[];
  allowedNumbers: Record<string, number>;
};

const NUMBER_PATTERN = /[+-]?(?:(?:\d{1,3}(?:,\d{3})+)|(?:\d+))(?:\.\d+)?%?/g;

function isDateNumber(text: string, start: number, end: number): boolean {
  const datePattern = /\b\d{4}[/-]\d{1,2}(?:[/-]\d{1,2})?\b/g;
  let match = datePattern.exec(text);
  while (match) {
    const dateStart = match.index ?? 0;
    const dateEnd = dateStart + match[0].length;
    if (start < dateEnd && end > dateStart) return true;
    match = datePattern.exec(text);
  }
  return false;
}

function isListNumber(text: string, start: number, end: number): boolean {
  const next = text.slice(end);
  const lineStart = Math.max(text.lastIndexOf('\n', start - 1), 0);
  const prefix = text.slice(lineStart, start);
  return (/^\s*$/.test(prefix) || /\s$/.test(prefix)) && (/^\.(?:\s|$)/.test(next) || /^\)(?:\s|$)/.test(next));
}

function isPeriodNumber(text: string, end: number): boolean {
  return /^\s*개월(?:간)?/.test(text.slice(end));
}

function extractNumbers(text: string, field: string): ExtractedAnswerNumber[] {
  const result: ExtractedAnswerNumber[] = [];
  let match = NUMBER_PATTERN.exec(text);
  while (match) {
    const token = match[0];
    const start = match.index ?? 0;
    const end = start + token.length;
    const before = text[start - 1] ?? '';
    const after = text[end] ?? '';
    const isIdentifierPart = /[A-Za-z]/.test(before) || /[A-Za-z]/.test(after);
    if (!isIdentifierPart && !isDateNumber(text, start, end) && !isListNumber(text, start, end) && !isPeriodNumber(text, end)) {
      const numericText = token.replace(/,/g, '').replace(/%$/, '');
      const parsed = Number(numericText);
      if (Number.isFinite(parsed)) result.push({ token, value: token.endsWith('%') ? parsed / 100 : parsed, field });
    }
    match = NUMBER_PATTERN.exec(text);
  }
  return result;
}

function answerNumberTexts(answer: AgentAnswer): Array<{ text: string; field: string }> {
  const texts: Array<{ text: string; field: string }> = [
    { text: answer.answer, field: 'answer' },
    { text: answer.verdict, field: 'verdict' },
  ];
  answer.evidence.forEach((evidence, index) => {
    texts.push({ text: evidence.metric, field: `evidence[${index}].metric` });
    if (evidence.value !== null) texts.push({ text: String(evidence.value), field: `evidence[${index}].value` });
    if (evidence.reason_code !== null) texts.push({ text: evidence.reason_code, field: `evidence[${index}].reason_code` });
  });
  if (answer.recommended_action !== null) texts.push({ text: answer.recommended_action, field: 'recommended_action' });
  return texts;
}

function buildAllowedNumbers(sources: readonly ToolNumberSource[]): Record<string, number> {
  const allowed: Record<string, number> = {};
  for (const source of sources) {
    for (const [key, value] of Object.entries(source.result.numbers)) {
      if (typeof value === 'number' && Number.isFinite(value)) allowed[`${source.toolName}.${key}`] = value;
    }
  }
  return allowed;
}

function decimalPlaces(token: string): number {
  const plain = token.replace(/,/g, '').replace(/%$/, '');
  const decimal = plain.split('.')[1];
  return decimal?.length ?? 0;
}

function matchesAllowed(value: number, token: string, allowed: number): boolean {
  const tolerance = 0.5 * 10 ** -decimalPlaces(token) + Number.EPSILON;
  return Math.abs(value - allowed) <= tolerance ||
    (token.endsWith('%') && allowed >= 0 && allowed <= 1 && Math.abs(value - allowed) <= tolerance);
}

export function validateAnswerNumbers(
  answer: AgentAnswer,
  sources: readonly ToolNumberSource[],
): GuardrailResult {
  const allowedNumbers = buildAllowedNumbers(sources);
  const extracted = answerNumberTexts(answer).flatMap(({ text, field }) => extractNumbers(text, field));
  const allowedValues = Object.values(allowedNumbers);
  const unmatched = extracted.filter((number) => !allowedValues.some((allowed) => matchesAllowed(number.value, number.token, allowed)));
  return { ok: unmatched.length === 0, extracted, unmatched, allowedNumbers };
}
