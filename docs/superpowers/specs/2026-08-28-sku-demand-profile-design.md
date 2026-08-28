# SKU Demand Profile 설계

## 목표

STEP 3의 `core.v_train_demand`만 사용해 SKU별 월간 수요 특성을 SQL에서 계산하고, STEP 6 Forecast 모델 후보 선택에 사용할 수 있는 표준 Demand Type과 분석 화면을 제공한다.

## 범위와 데이터 경계

- 입력은 `core.v_train_demand`와 `core.forecast_setting`이다.
- `raw.usage_history`와 `core.v_test_actual`은 Demand Profile 계산에서 직접 또는 간접적으로 사용하지 않는다.
- 수요 집계 단위는 forecast 설정의 기간 경계를 월 단위로 정렬한 학습기간 Grid이다.
- Grid에서 관측이 없는 월은 `quantity = 0`, `is_gap_period = true`로 표시한다. 원본 관측의 `NULL` 수량은 0으로 치환하지 않으며 계산에서 제외하고 reason code를 남긴다.

## SQL 계산 모델

새 마이그레이션은 다음 View를 추가한다.

1. `analytics.v_sku_demand_profile`
2. `analytics.v_demand_profile_kpi`

내부 CTE는 학습 설정, 월별 Grid, 관측값, SKU별 통계를 분리한다. `generate_series`로 학습 시작월부터 종료월까지의 월을 만들고, `core.v_train_demand`를 월별로 집계한 뒤 SKU별 Grid와 LEFT JOIN한다.

### 통계 정의

- `n_periods`: 학습기간 월 수
- `n_nonzero_periods`: `quantity > 0`인 월 수
- `adi`: `n_periods / n_nonzero_periods`; 발생 월이 없으면 `NULL`
- `cv`: 양수 수요의 표준편차 / 평균; 양수 표본이 2개 미만이거나 평균이 0이면 `NULL`
- `cv_squared`: `cv * cv`; CV가 없으면 `NULL`
- `zero_demand_rate`: Grid 중 수요량이 0인 월 비율
- `trend`: 월 순번에 대한 `regr_slope(quantity, period_index)`; 월이 2개 미만이면 `NULL`
- `recent_change_rate`: 학습 종료월 기준 설정된 최근 기간의 양수 수요 평균과 그 직전 동일 길이 구간 평균의 변화율; 두 구간이 충분하지 않거나 이전 평균이 0이면 `NULL`
- `peak_period`: 최고 수요량 월 중 가장 이른 월

### Demand Type

ADI와 CV²가 모두 계산된 경우에만 다음 기준을 적용한다.

| 조건 | 코드 |
|---|---|
| ADI < 1.32, CV² < 0.49 | `SMOOTH` |
| ADI >= 1.32, CV² < 0.49 | `INTERMITTENT` |
| ADI < 1.32, CV² >= 0.49 | `ERRATIC` |
| ADI >= 1.32, CV² >= 0.49 | `LUMPY` |

계산 불가 시 `demand_type = NULL`이고 `reason_code`에 `NO_DEMAND_PERIOD`, `INSUFFICIENT_NONZERO_SAMPLES`, `NULL_SOURCE_QTY`, 또는 `TRAIN_SETTING_REQUIRED` 중 해당 사유를 기록한다.

### Seasonality

학습 Grid의 월 수가 24개월 미만이면 `seasonality = NULL`, `reason_code = INSUFFICIENT_PERIODS`로 반환한다. 24개월 이상일 때에만 월별 평균 대비 반복 패턴을 SQL에서 계산해 `seasonality`를 제공한다. 데이터가 부족한 상태를 `false`로 표현하지 않는다.

### Stability

`demand_type`과 계산 가능 상태를 조합한 화면용 안정성 값으로 `STABLE`, `VARIABLE`, `UNAVAILABLE`을 반환한다. 이는 Demand Type 분류 기준을 변경하지 않는 보조 표시값이다.

## KPI View

`analytics.v_demand_profile_kpi`는 Profile View를 집계해 `total_items`, 각 Demand Type 건수, `n_croston_needed`(INTERMITTENT + LUMPY), `n_calculation_unavailable`을 한 행으로 반환한다.

## 애플리케이션 구조

- `lib/scm-model.ts`: 행 타입과 `null` 보존 정규화 함수
- `lib/scm.ts`: `analytics.v_sku_demand_profile`, `analytics.v_demand_profile_kpi` 조회 함수
- `app/analysis/demand-profile/page.tsx`: 서버에서 analytics 조회 및 인증
- `components/analysis/demand-profile-table.tsx`: 저장된 결과를 필터링하는 클라이언트 테이블
- `lib/menu.ts`: `/analysis/demand-profile` USER/ADMIN 공통 메뉴 등록

필터는 이미 계산된 결과에 대해서만 Demand Type, 계산 가능 여부, SKU 검색을 적용한다. React/TypeScript에서는 ADI, CV², Trend, Seasonality를 계산하지 않는다.

## 권한과 배포

- `analytics` View는 authenticated 사용자에게 SELECT를 허용한다.
- `anon`은 접근하지 못한다.
- SQL 마이그레이션은 기존 테이블을 drop하지 않고 새 View와 필요한 설정 컬럼만 추가한다.
- 적용 전 `npm test`, `npm run build`를 실행하고, 적용 후 View 컬럼·행 수·KPI·학습기간 경계를 읽기 전용 쿼리로 확인한다.

## 테스트 기준

- 네 가지 Demand Type 경계가 정확히 분류된다.
- 수요가 전혀 없는 SKU는 임의 ADI/CV² 없이 reason code를 갖는다.
- 양수 표본 부족과 학습기간 부족이 숫자로 보정되지 않는다.
- 24개월 미만 Seasonality는 `NULL + INSUFFICIENT_PERIODS`다.
- test 기간 행은 Profile 결과에 영향을 주지 않는다.
- 애플리케이션 코드에 `raw.usage_history` 직접 조회가 없고 `core.v_test_actual`을 사용하지 않는다.
