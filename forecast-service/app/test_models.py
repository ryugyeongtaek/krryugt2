import pandas as pd
from .models.advanced import CrostonModel, ExponentialSmoothingModel, HoltModel


def train(values: list[float]) -> pd.DataFrame:
    return pd.DataFrame({"period": pd.date_range("2024-01-01", periods=len(values), freq="MS"), "qty": values})


def test_common_interface_returns_forecast_dataframe():
    result = ExponentialSmoothingModel().forecast(train([10, 11, 12, 13]), 2, {})
    assert list(result.columns) == ["period", "predicted_qty", "p50", "p80", "p90", "sigma", "basis", "reason_code"]
    assert len(result) == 2


def test_holt_insufficient_history_is_explicit():
    result = HoltModel().forecast(train([10]), 2, {})
    assert result["predicted_qty"].isna().all()
    assert (result["reason_code"] == "INSUFFICIENT_HISTORY").all()


def test_croston_is_limited_to_intermittent_types():
    assert CrostonModel().applicable_demand_types == ("INTERMITTENT", "LUMPY")
