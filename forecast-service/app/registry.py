from .models.advanced import CrostonModel, ExponentialSmoothingModel, HoltModel, HoltWintersModel, ProphetModel, SarimaModel, SbaModel, TsbModel, XGBoostModel

MODEL_REGISTRY = {model.model_id: model for model in [ExponentialSmoothingModel(), HoltModel(), HoltWintersModel(), SarimaModel(), ProphetModel(), CrostonModel(), SbaModel(), TsbModel(), XGBoostModel()]}

def list_models() -> list[dict]:
    return [{"model_id": model_id, "engine": "PYTHON", "applicable_demand_type": list(model.applicable_demand_types), "version": model.model_version} for model_id, model in MODEL_REGISTRY.items()]
