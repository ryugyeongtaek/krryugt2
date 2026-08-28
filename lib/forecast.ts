import { createSupabaseServerClient } from './supabase';

export async function getForecastSettingsData() {
  try {
    const supabase = await createSupabaseServerClient();
    const [coverageResult, settingResult, policyResult, ruleResult, itemPolicyResult] = await Promise.all([
      supabase.schema('analytics').from('v_data_coverage').select('*').maybeSingle(),
      supabase.schema('core').from('forecast_setting').select('*').eq('setting_id', 'default').maybeSingle(),
      supabase.schema('core').from('policy_config').select('*').eq('active', true).order('config_key'),
      supabase.schema('core').from('outlier_rule').select('*').eq('active', true).order('priority'),
      supabase.schema('core').from('item_policy').select('*').order('item_id'),
    ]);
    const error = [coverageResult.error, settingResult.error, policyResult.error, ruleResult.error, itemPolicyResult.error].find(Boolean);
    return {
      coverage: coverageResult.data,
      setting: settingResult.data,
      policies: policyResult.data ?? [],
      rules: ruleResult.data ?? [],
      itemPolicies: itemPolicyResult.data ?? [],
      error: error?.message ?? null,
    };
  } catch (error) {
    return { coverage: null, setting: null, policies: [], rules: [], itemPolicies: [], error: error instanceof Error ? error.message : 'Forecast 설정 조회에 실패했습니다.' };
  }
}
