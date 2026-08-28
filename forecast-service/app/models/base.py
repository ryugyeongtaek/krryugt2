from __future__ import annotations

from abc import ABC, abstractmethod
import pandas as pd


class ForecastModel(ABC):
    model_id: str
    model_version: str = "1.0.0"
    applicable_demand_types: tuple[str, ...] = ("SMOOTH", "ERRATIC", "INTERMITTENT", "LUMPY")

    @abstractmethod
    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict) -> pd.DataFrame:
        """학습 DataFrame과 horizon으로 period/predicted_qty 결과를 반환합니다."""


def result_frame(periods: pd.DatetimeIndex, values: list[float | None], model_id: str, reason: str | None = None) -> pd.DataFrame:
    return pd.DataFrame({
        "period": periods,
        "predicted_qty": values,
        "p50": values,
        "p80": [None] * len(values),
        "p90": [None] * len(values),
        "sigma": [None] * len(values),
        "basis": [model_id] * len(values),
        "reason_code": [reason] * len(values),
    })
