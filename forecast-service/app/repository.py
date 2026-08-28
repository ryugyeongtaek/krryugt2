from __future__ import annotations

import os
from datetime import datetime, timezone
from uuid import uuid4
import pandas as pd
from supabase import create_client


class Repository:
    def __init__(self):
        url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key: raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY_REQUIRED")
        self.client = create_client(url, key)

    def settings(self) -> dict:
        result = self.client.schema("core").table("forecast_setting").select("*").eq("setting_id", "default").single().execute()
        return result.data

    def train_demand(self) -> pd.DataFrame:
        result = self.client.schema("core").table("v_train_demand").select("item_id,use_date,qty,is_training_eligible").eq("is_training_eligible", True).execute()
        frame = pd.DataFrame(result.data or [])
        if frame.empty: return pd.DataFrame(columns=["item_id", "period", "qty"])
        frame["period"] = pd.to_datetime(frame["use_date"]).dt.to_period("M").dt.to_timestamp()
        return frame.groupby(["item_id", "period"], as_index=False)["qty"].sum()

    def start_run(self, user_email: str | None, settings: dict, model_ids: list[str]) -> str:
        run_id = str(uuid4())
        self.client.schema("core").table("forecast_run").insert({"run_id": run_id, "status": "RUNNING", "granularity": settings["granularity"], "train_start": settings["train_start"], "train_end": settings["train_end"], "horizon": settings["forecast_horizon"], "data_snapshot_at": datetime.now(timezone.utc).isoformat(), "models": model_ids, "n_models": len(model_ids), "triggered_email": user_email, "started_at": datetime.now(timezone.utc).isoformat()}).execute()
        return run_id

    def save_results(self, run_id: str, model_id: str, model_version: str, params: dict, result: pd.DataFrame, items: list[str]) -> int:
        version_id = str(uuid4())
        self.client.schema("core").table("model_version").insert({"model_version_id": version_id, "run_id": run_id, "model_id": model_id, "version": model_version, "parameters": params, "definition": {"engine": "PYTHON", "model_id": model_id}}).execute()
        rows = []
        for item_id in items:
            for row in result.to_dict("records"):
                rows.append({"run_id": run_id, "model_id": model_id, "model_version": version_id, "item_id": item_id, "period": pd.Timestamp(row["period"]).date().isoformat(), "predicted_qty": row["predicted_qty"], "p50": row["p50"], "p80": row["p80"], "p90": row["p90"], "sigma": row["sigma"], "basis": row["basis"], "reason_code": row["reason_code"]})
        if rows: self.client.schema("core").table("forecast_result").insert(rows).execute()
        return len(rows)

    def finish_run(self, run_id: str, status: str, n_items: int = 0, n_rows: int = 0, message: str | None = None):
        self.client.schema("core").table("forecast_run").update({"status": status, "n_items": n_items, "n_rows": n_rows, "finished_at": datetime.now(timezone.utc).isoformat(), "message": message}).eq("run_id", run_id).execute()

    def run_backtest(self, forecast_run_id: str, user_email: str | None) -> str:
        result = self.client.schema("core").rpc("run_backtest", {"p_forecast_run_id": forecast_run_id}).execute()
        return str(result.data)
