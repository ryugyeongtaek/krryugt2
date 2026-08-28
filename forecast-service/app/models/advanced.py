from __future__ import annotations

import numpy as np
import pandas as pd

from .base import ForecastModel, result_frame


class ExponentialSmoothingModel(ForecastModel):
    model_id = "PY_EXPONENTIAL_SMOOTHING"

    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict) -> pd.DataFrame:
        from statsmodels.tsa.holtwinters import SimpleExpSmoothing
        values = train_df["qty"].dropna().astype(float)
        periods = pd.date_range(train_df["period"].max() + pd.offsets.MonthBegin(1), periods=horizon, freq="MS")
        if values.empty: return result_frame(periods, [None] * horizon, self.model_id, "INSUFFICIENT_HISTORY")
        fitted = SimpleExpSmoothing(values, initialization_method="estimated").fit(optimized=True)
        return result_frame(periods, fitted.forecast(horizon).tolist(), self.model_id)


class HoltModel(ForecastModel):
    model_id = "PY_HOLT"

    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict) -> pd.DataFrame:
        from statsmodels.tsa.holtwinters import Holt
        values = train_df["qty"].dropna().astype(float)
        periods = pd.date_range(train_df["period"].max() + pd.offsets.MonthBegin(1), periods=horizon, freq="MS")
        if len(values) < 2: return result_frame(periods, [None] * horizon, self.model_id, "INSUFFICIENT_HISTORY")
        fitted = Holt(values, initialization_method="estimated").fit(optimized=True)
        return result_frame(periods, fitted.forecast(horizon).tolist(), self.model_id)


class HoltWintersModel(ForecastModel):
    model_id = "PY_HOLT_WINTERS"

    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict) -> pd.DataFrame:
        from statsmodels.tsa.holtwinters import ExponentialSmoothing
        values = train_df["qty"].dropna().astype(float)
        periods = pd.date_range(train_df["period"].max() + pd.offsets.MonthBegin(1), periods=horizon, freq="MS")
        season_length = int(params.get("seasonal_periods", 12))
        if len(values) < season_length * 2: return result_frame(periods, [None] * horizon, self.model_id, "INSUFFICIENT_SEASONAL_HISTORY")
        fitted = ExponentialSmoothing(values, trend="add", seasonal="add", seasonal_periods=season_length, initialization_method="estimated").fit()
        return result_frame(periods, fitted.forecast(horizon).tolist(), self.model_id)


class SarimaModel(ForecastModel):
    model_id = "PY_SARIMA"

    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict) -> pd.DataFrame:
        from statsmodels.tsa.statespace.sarimax import SARIMAX
        values = train_df["qty"].dropna().astype(float)
        periods = pd.date_range(train_df["period"].max() + pd.offsets.MonthBegin(1), periods=horizon, freq="MS")
        if len(values) < int(params.get("min_periods", 12)): return result_frame(periods, [None] * horizon, self.model_id, "INSUFFICIENT_HISTORY")
        order = tuple(params.get("order", [1, 1, 1]))
        seasonal_order = tuple(params.get("seasonal_order", [0, 0, 0, 0]))
        fitted = SARIMAX(values, order=order, seasonal_order=seasonal_order, enforce_stationarity=False, enforce_invertibility=False).fit(disp=False)
        return result_frame(periods, fitted.forecast(horizon).tolist(), self.model_id)


class ProphetModel(ForecastModel):
    model_id = "PY_PROPHET"

    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict) -> pd.DataFrame:
        from prophet import Prophet
        values = train_df[["period", "qty"]].dropna().rename(columns={"period": "ds", "qty": "y"})
        periods = pd.date_range(train_df["period"].max() + pd.offsets.MonthBegin(1), periods=horizon, freq="MS")
        if len(values) < int(params.get("min_periods", 12)): return result_frame(periods, [None] * horizon, self.model_id, "INSUFFICIENT_HISTORY")
        model = Prophet(yearly_seasonality=params.get("yearly_seasonality", True), weekly_seasonality=False, daily_seasonality=False)
        model.fit(values)
        future = pd.DataFrame({"ds": periods})
        return result_frame(periods, model.predict(future)["yhat"].tolist(), self.model_id)


class CrostonModel(ForecastModel):
    model_id = "PY_CROSTON"
    applicable_demand_types = ("INTERMITTENT", "LUMPY")

    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict) -> pd.DataFrame:
        values = train_df["qty"].fillna(0).astype(float).to_numpy()
        periods = pd.date_range(train_df["period"].max() + pd.offsets.MonthBegin(1), periods=horizon, freq="MS")
        nz = np.flatnonzero(values > 0)
        if len(nz) == 0: return result_frame(periods, [None] * horizon, self.model_id, "NO_NONZERO_DEMAND")
        demand = values[nz]
        intervals = np.diff(np.r_[-1, nz])
        alpha = float(params.get("alpha", 0.1))
        z, p = demand[0], intervals[0]
        for d, interval in zip(demand[1:], intervals[1:]):
            z, p = z + alpha * (d - z), p + alpha * (interval - p)
        point = z / p if p else None
        return result_frame(periods, [point] * horizon, self.model_id, None if point is not None else "INTERVAL_UNAVAILABLE")


class SbaModel(CrostonModel):
    model_id = "PY_SBA"

    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict) -> pd.DataFrame:
        result = super().forecast(train_df, horizon, params)
        result["basis"] = self.model_id
        result["p50"] = result["predicted_qty"].map(lambda value: value * (1 - float(params.get("bias_adjustment", 0.5))) if value is not None else None)
        result["predicted_qty"] = result["p50"]
        return result


class TsbModel(CrostonModel):
    model_id = "PY_TSB"


class XGBoostModel(ForecastModel):
    model_id = "PY_XGBOOST"

    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict) -> pd.DataFrame:
        from xgboost import XGBRegressor
        values = train_df["qty"].dropna().astype(float).to_numpy()
        periods = pd.date_range(train_df["period"].max() + pd.offsets.MonthBegin(1), periods=horizon, freq="MS")
        lags = int(params.get("lags", 3))
        if len(values) <= lags: return result_frame(periods, [None] * horizon, self.model_id, "INSUFFICIENT_HISTORY")
        x = np.array([values[i-lags:i] for i in range(lags, len(values))])
        y = values[lags:]
        model = XGBRegressor(n_estimators=int(params.get("n_estimators", 100)), max_depth=int(params.get("max_depth", 3)), objective="reg:squarederror")
        model.fit(x, y)
        history = list(values)
        forecasts = []
        for _ in range(horizon):
            prediction = float(model.predict(np.array([history[-lags:]]))[0])
            forecasts.append(prediction)
            history.append(prediction)
        return result_frame(periods, forecasts, self.model_id)
