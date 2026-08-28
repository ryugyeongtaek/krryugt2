-- STEP 8: Python Forecast Service 모델 레지스트리
insert into core.model_config (model_id, model_name, family, engine, version, enabled, is_default, applicable_demand_type, parameters, description)
values
  ('PY_EXPONENTIAL_SMOOTHING', 'Exponential Smoothing', 'EXPONENTIAL_SMOOTHING', 'PYTHON', '1.0.0', false, false, array['SMOOTH','ERRATIC'], '{}'::jsonb, 'Python Forecast Service'),
  ('PY_HOLT', 'Holt', 'HOLT', 'PYTHON', '1.0.0', false, false, array['SMOOTH','ERRATIC'], '{}'::jsonb, 'Python Forecast Service'),
  ('PY_HOLT_WINTERS', 'Holt-Winters', 'HOLT_WINTERS', 'PYTHON', '1.0.0', false, false, array['SMOOTH','ERRATIC'], '{"seasonal_periods":12}'::jsonb, 'Python Forecast Service'),
  ('PY_SARIMA', 'SARIMA', 'SARIMA', 'PYTHON', '1.0.0', false, false, array['SMOOTH','ERRATIC'], '{"order":[1,1,1],"seasonal_order":[0,0,0,0]}'::jsonb, 'Python Forecast Service'),
  ('PY_PROPHET', 'Prophet', 'PROPHET', 'PYTHON', '1.0.0', false, false, array['SMOOTH','ERRATIC'], '{"yearly_seasonality":true}'::jsonb, 'Python Forecast Service'),
  ('PY_CROSTON', 'Croston', 'CROSTON', 'PYTHON', '1.0.0', false, false, array['INTERMITTENT','LUMPY'], '{"alpha":0.1}'::jsonb, '간헐 수요 전용'),
  ('PY_SBA', 'SBA', 'CROSTON_VARIANT', 'PYTHON', '1.0.0', false, false, array['INTERMITTENT','LUMPY'], '{"alpha":0.1,"bias_adjustment":0.5}'::jsonb, '간헐 수요 전용'),
  ('PY_TSB', 'TSB', 'CROSTON_VARIANT', 'PYTHON', '1.0.0', false, false, array['INTERMITTENT','LUMPY'], '{"alpha":0.1}'::jsonb, '간헐 수요 전용'),
  ('PY_XGBOOST', 'XGBoost', 'TREE_BOOSTING', 'PYTHON', '1.0.0', false, false, array['SMOOTH','ERRATIC'], '{"lags":3,"n_estimators":100,"max_depth":3}'::jsonb, 'Python Forecast Service')
on conflict (model_id) do update set engine=excluded.engine, applicable_demand_type=excluded.applicable_demand_type, parameters=excluded.parameters, description=excluded.description;
