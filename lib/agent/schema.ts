export type AgentVerdict =
  | 'SUPPORTED'
  | 'CAUTION'
  | 'CALCULATION_UNAVAILABLE';

export type AgentEvidence = {
  source: string;
  metric: string;
  value: string | number | null;
  data_as_of: string | null;
  reason_code: string | null;
};

export type AgentAnswer = {
  answer: string;
  verdict: AgentVerdict;
  evidence: AgentEvidence[];
  data_as_of: string | null;
  risk: string | null;
  recommended_action: string | null;
  cannot_answer: boolean;
  cannot_answer_reason: string | null;
};

const agentEvidenceJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    source: { type: 'string' },
    metric: { type: 'string' },
    value: { type: ['string', 'number', 'null'] },
    data_as_of: { type: ['string', 'null'] },
    reason_code: { type: ['string', 'null'] },
  },
  required: ['source', 'metric', 'value', 'data_as_of', 'reason_code'],
} as const;

export const agentAnswerJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    answer: { type: 'string' },
    verdict: {
      type: 'string',
      enum: ['SUPPORTED', 'CAUTION', 'CALCULATION_UNAVAILABLE'],
    },
    evidence: {
      type: 'array',
      items: agentEvidenceJsonSchema,
    },
    data_as_of: { type: ['string', 'null'] },
    risk: { type: ['string', 'null'] },
    recommended_action: { type: ['string', 'null'] },
    cannot_answer: { type: 'boolean' },
    cannot_answer_reason: { type: ['string', 'null'] },
  },
  required: [
    'answer',
    'verdict',
    'evidence',
    'data_as_of',
    'risk',
    'recommended_action',
    'cannot_answer',
    'cannot_answer_reason',
  ],
} as const;

export const agentAnswerStructuredOutput = {
  type: 'json_schema',
  json_schema: {
    name: 'agent_answer',
    strict: true,
    schema: agentAnswerJsonSchema,
  },
} as const;

const answerKeys = [
  'answer',
  'verdict',
  'evidence',
  'data_as_of',
  'risk',
  'recommended_action',
  'cannot_answer',
  'cannot_answer_reason',
] as const;

const evidenceKeys = [
  'source',
  'metric',
  'value',
  'data_as_of',
  'reason_code',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isEvidence(value: unknown): value is AgentEvidence {
  if (!isRecord(value) || !hasOnlyKeys(value, evidenceKeys)) return false;

  return (
    typeof value.source === 'string' &&
    typeof value.metric === 'string' &&
    (value.value === null ||
      (typeof value.value === 'string' && value.value.length >= 0) ||
      (typeof value.value === 'number' && Number.isFinite(value.value))) &&
    isNullableString(value.data_as_of) &&
    isNullableString(value.reason_code)
  );
}

function isAgentAnswer(value: unknown): value is AgentAnswer {
  if (!isRecord(value) || !hasOnlyKeys(value, answerKeys)) return false;

  return (
    answerKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
    typeof value.answer === 'string' &&
    (value.verdict === 'SUPPORTED' ||
      value.verdict === 'CAUTION' ||
      value.verdict === 'CALCULATION_UNAVAILABLE') &&
    Array.isArray(value.evidence) &&
    value.evidence.every(isEvidence) &&
    isNullableString(value.data_as_of) &&
    isNullableString(value.risk) &&
    isNullableString(value.recommended_action) &&
    typeof value.cannot_answer === 'boolean' &&
    isNullableString(value.cannot_answer_reason)
  );
}

export function parseAgentAnswer(input: string): AgentAnswer | null {
  try {
    const parsed: unknown = JSON.parse(input);
    return isAgentAnswer(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function cannotAnswer(
  reason: string,
  evidence: AgentEvidence[] = [],
  dataAsOf: string | null = null,
): AgentAnswer {
  return {
    answer: '현재 질문에 답할 수 없습니다.',
    verdict: 'CALCULATION_UNAVAILABLE',
    evidence,
    data_as_of: dataAsOf,
    risk: null,
    recommended_action: null,
    cannot_answer: true,
    cannot_answer_reason: reason,
  };
}
