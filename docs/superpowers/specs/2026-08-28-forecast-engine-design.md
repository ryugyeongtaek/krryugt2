# Forecast Engine Baseline(SQL) 설계

## 목표

학습 구간만 사용하는 SQL Baseline Forecast 실행 파이프라인을 만들고, 모델 정의·버전·실행·결과를 보존해 STEP 7 Backtest와 이후 구매 추천에서 재사용한다.

## 데이터 경계

Forecast는 `core.v_train_demand`를 월 단위 Grid로 집계한다. `raw.usage_history`와 `core.v_test_actual`을 Forecast 계산 경로에서 사용하지 않으며, test actual과 미래 값으로 파라미터를 보정하지 않는다.

## 모델 레지스트리

`core.model_config`에 모델 ID, 이름, family, engine, version, enabled, is_default, applicable_demand_type, parameters, description, updated_at, updated_by를 저장한다. 기본 등록 모델은 `MA_3M`, `MA_6M`, `WMA_3M`, `PY_SAME_MONTH`, `SEASONAL_NAIVE`이며 WMA parameters에는 최근순 `[3,2,1]`을 저장한다. Forecast 실행 시 `core.model_version`에 모델 정의와 parameters를 JSON snapshot으로 복사한다.

## Baseline 계산

- MA: 최근 3개월 또는 6개월의 학습 Grid 실제 수요 평균
- WMA: 최근 3개월을 오래된 순서의 1,2,3 가중치로 계산한 가중 평균
- PY_SAME_MONTH: 학습 종료월에서 12개월 전 같은 월의 실제 수요
- SEASONAL_NAIVE: 각 미래 월의 12개월 전 실제 학습 수요

필요한 과거 관측이 없으면 예측 행을 만들지 않고 reason code를 저장한다. Forecast horizon은 `core.forecast_setting.forecast_horizon`으로 관리한다.

## 실행과 결과

`core.run_baseline_forecast()`는 ADMIN만 호출할 수 있다. 설정과 enabled 모델을 읽고, RUNNING run과 model_version snapshot을 만든 뒤, 모델별 SKU/기간 결과를 `core.forecast_result`에 저장하고 행 수를 집계해 SUCCESS로 끝낸다. 예외는 FAILED 상태와 오류 메시지로 보존한다. 결과의 복합키는 `run_id, model_id, item_id, period`이고 model_version, predicted_qty, p50, p80, p90, sigma, basis, reason_code를 저장한다.

## 구간과 stale

과거 적합값은 각 모델이 필요한 lookback을 충족하는 학습 Grid 월에 대해서만 만든다. residual은 `actual - fitted`이며 SKU/모델별 residual 표본이 2개 이상일 때만 sigma를 계산한다. P50은 point forecast, P80/P90은 DB parameters의 정규근사 z-score를 사용하며 sigma가 없으면 NULL이다.

run의 `data_snapshot_at`은 실행 시점의 학습 데이터 `loaded_at`과 forecast 설정 변경 시점을 기준으로 저장한다. analytics run View는 이후 학습 데이터 또는 설정 시점이 snapshot보다 최신이면 `is_stale = true`로 표시한다. 기존 결과는 삭제하지 않는다.

## 권한과 화면

ADMIN만 model_config 변경과 Forecast 실행을 할 수 있다. 일반 인증 사용자는 analytics 결과를 조회할 수 있다. 화면은 `analytics.v_model_config`, `analytics.v_forecast_run`, `analytics.v_forecast_result`, `analytics.v_forecast_run_kpi`만 조회한다.
