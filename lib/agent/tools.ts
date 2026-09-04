import type { BomRequirement, DemandProfileRt, OlAccuracyResult, ShipmentTrend } from '../scm-model.ts';

export type AgentRole = 'USER' | 'ADMIN';

export type ToolResult = {
  ok: boolean;
  data: ShipmentTrend[] | DemandProfileRt[] | OlAccuracyResult | BomRequirement[] | null;
  numbers: Record<string, number>;
  dataAsOf: string | null;
  reason: string | null;
};

type JsonSchema = {
  type: 'object';
  additionalProperties: false;
  properties: Record<string, unknown>;
  required: string[];
};

export type AgentTool = {
  name: string;
  description: string;
  parameters: JsonSchema;
  roles: AgentRole[];
  run: (input: unknown, role?: string) => Promise<ToolResult>;
};

const itemParameters: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: { itemCode: { type: ['string', 'null'] } },
  required: ['itemCode'],
};

const olAccuracyParameters: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    modelBase: { type: ['string', 'null'] },
    fy: { type: ['string', 'null'] },
  },
  required: ['modelBase', 'fy'],
};

const bomParameters: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: { modelBase: { type: 'string' } },
  required: ['modelBase'],
};

function emptyResult(reason: string): ToolResult {
  return { ok: false, data: null, numbers: {}, dataAsOf: null, reason };
}

function collectNumbers(value: unknown, path = '', result: Record<string, number> = {}): Record<string, number> {
  if (typeof value === 'number' && Number.isFinite(value) && path) result[path] = value;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectNumbers(entry, `${path}[${index}]`, result));
  } else if (value !== null && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      collectNumbers(entry, path ? `${path}.${key}` : key, result);
    });
  }
  return result;
}

export { collectNumbers };

function findDataAsOf(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const result = findDataAsOf(entry);
      if (result) return result;
    }
    return null;
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.data_as_of === 'string') return record.data_as_of;
    for (const entry of Object.values(record)) {
      const result = findDataAsOf(entry);
      if (result) return result;
    }
  }
  return null;
}

function hasReturnedData(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasReturnedData);
  }
  return value !== null && value !== undefined;
}

function resultFrom<T extends ToolResult['data']>(data: T, error: string | null): ToolResult {
  const reason = error ?? (hasReturnedData(data) ? null : 'NO_DATA');
  return {
    ok: error === null && reason === null,
    data,
    numbers: collectNumbers(data),
    dataAsOf: findDataAsOf(data),
    reason,
  };
}

function readOptionalString(input: unknown, key: string): string | null | undefined {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const value = (input as Record<string, unknown>)[key];
  if (value === undefined) return null;
  return typeof value === 'string' || value === null ? value : undefined;
}

function readRequiredString(input: unknown, key: string): string | undefined {
  const value = readOptionalString(input, key);
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function roleAllowed(role: string, roles: AgentRole[]): boolean {
  return roles.includes(role as AgentRole);
}

export const agentTools: AgentTool[] = [
  {
    name: 'getShipmentTrend',
    description: 'v_shipment_by_hoc에서 품목별 월간 출고 추이와 저장된 이동평균을 조회합니다.',
    parameters: itemParameters,
    roles: ['USER', 'ADMIN'],
    async run(input, role = 'USER') {
      if (!roleAllowed(role, this.roles)) return emptyResult('ROLE_NOT_ALLOWED');
      const itemCode = readOptionalString(input, 'itemCode');
      if (itemCode === undefined) return emptyResult('INVALID_PARAMETERS');
      const { getShipmentTrend } = await import('../scm.ts');
      const result = await getShipmentTrend(itemCode ?? undefined);
      return resultFrom(result.rows, result.error);
    },
  },
  {
    name: 'getDemandProfile',
    description: 'v_item_demand_profile에서 저장된 품목별 수요 프로파일을 조회합니다.',
    parameters: itemParameters,
    roles: ['USER', 'ADMIN'],
    async run(input, role = 'USER') {
      if (!roleAllowed(role, this.roles)) return emptyResult('ROLE_NOT_ALLOWED');
      const itemCode = readOptionalString(input, 'itemCode');
      if (itemCode === undefined) return emptyResult('INVALID_PARAMETERS');
      const { getDemandProfile } = await import('../scm.ts');
      const result = await getDemandProfile(itemCode ?? undefined);
      return resultFrom(result.rows, result.error);
    },
  },
  {
    name: 'getOlAccuracy',
    description: 'fact_mc_plan_actual 기반으로 생성된 Sales OL과 SCM OL 정확도 결과를 조회합니다.',
    parameters: olAccuracyParameters,
    roles: ['USER', 'ADMIN'],
    async run(input, role = 'USER') {
      if (!roleAllowed(role, this.roles)) return emptyResult('ROLE_NOT_ALLOWED');
      const modelBase = readOptionalString(input, 'modelBase');
      const fy = readOptionalString(input, 'fy');
      if (modelBase === undefined || fy === undefined) return emptyResult('INVALID_PARAMETERS');
      const { getOlAccuracy } = await import('../scm.ts');
      const result = await getOlAccuracy(modelBase ?? undefined, fy ?? undefined);
      return resultFrom(result.data, result.error);
    },
  },
  {
    name: 'getBomRequirement',
    description: '기종별 BOM 뷰에서 CAP, 필수 옵션, SCC와 구성 품목 수량을 조회합니다.',
    parameters: bomParameters,
    roles: ['USER', 'ADMIN'],
    async run(input, role = 'USER') {
      if (!roleAllowed(role, this.roles)) return emptyResult('ROLE_NOT_ALLOWED');
      const modelBase = readRequiredString(input, 'modelBase');
      if (!modelBase) return emptyResult('INVALID_PARAMETERS');
      const { getBomRequirement } = await import('../scm.ts');
      const result = await getBomRequirement(modelBase);
      return resultFrom(result.rows, result.error);
    },
  },
];
