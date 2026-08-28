from __future__ import annotations

from typing import Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .registry import MODEL_REGISTRY, list_models
from .repository import Repository

app = FastAPI(title="SCM Python Forecast Service", version="1.0.0")

class ForecastRequest(BaseModel):
    model_ids: list[str] | None = None
    item_ids: list[str] | None = None
    triggered_email: str | None = None
    note: str | None = None

class BacktestRequest(BaseModel):
    forecast_run_id: str = Field(min_length=1)
    triggered_email: str | None = None

@app.get("/health")
def health() -> dict[str, str]: return {"status": "ok", "service": "python-forecast"}

@app.get("/models")
def models() -> list[dict[str, Any]]: return list_models()

@app.post("/forecast/run")
def forecast_run(request: ForecastRequest) -> dict[str, Any]:
    repo = Repository()
    settings = repo.settings()
    horizon = settings.get("forecast_horizon")
    if not settings.get("train_start") or not settings.get("train_end") or not horizon: raise HTTPException(422, "FORECAST_TRAIN_SETTING_REQUIRED")
    model_ids = request.model_ids or list(MODEL_REGISTRY.keys())
    unknown = [model_id for model_id in model_ids if model_id not in MODEL_REGISTRY]
    if unknown: raise HTTPException(400, f"UNKNOWN_MODEL:{','.join(unknown)}")
    configs = {row["model_id"]: row for row in repo.model_configs(model_ids)}
    missing = [model_id for model_id in model_ids if model_id not in configs]
    if missing: raise HTTPException(422, f"MODEL_CONFIG_REQUIRED:{','.join(missing)}")
    run_id = repo.start_run(request.triggered_email, settings, model_ids)
    try:
        train = repo.train_demand()
        item_ids = request.item_ids or sorted(train["item_id"].unique().tolist())
        total_rows = 0
        for model_id in model_ids:
            model = MODEL_REGISTRY[model_id]
            config = configs[model_id]
            for item_id in item_ids:
                item_train = train[train["item_id"] == item_id].sort_values("period")
                output = model.forecast(item_train, int(horizon), config.get("parameters") or {})
                total_rows += repo.save_results(run_id, model_id, str(config["version"]), config.get("parameters") or {}, output, [item_id])
        repo.finish_run(run_id, "SUCCESS", len(item_ids), total_rows)
        return {"run_id": run_id, "status": "SUCCESS", "n_items": len(item_ids), "n_rows": total_rows}
    except Exception as exc:
        repo.finish_run(run_id, "FAILED", message=str(exc))
        raise HTTPException(500, f"FORECAST_FAILED:{exc}") from exc

@app.post("/backtest/run")
def backtest_run(request: BacktestRequest) -> dict[str, str]:
    return {"backtest_run_id": Repository().run_backtest(request.forecast_run_id, request.triggered_email)}
