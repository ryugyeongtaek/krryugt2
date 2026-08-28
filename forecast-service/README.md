# Python Forecast Service

Next.js와 독립적으로 실행하는 FastAPI 배치 서비스입니다. 학습 데이터는 Supabase `core.v_train_demand`만 읽고, 검증 Actual은 학습 경로에서 읽지 않습니다.

## 실행

```bash
cd forecast-service
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
set SUPABASE_URL=...
set SUPABASE_SERVICE_ROLE_KEY=...
uvicorn app.main:app --reload --port 8001
```

`SUPABASE_SERVICE_ROLE_KEY`는 이 서비스 서버에만 설정하며 브라우저나 Next.js public 환경변수에 넣지 않습니다.

## API

- `GET /health`
- `GET /models`
- `POST /forecast/run`
- `POST /backtest/run`

모델 계산 실패 시 해당 실행을 `FAILED`로 업데이트하고 오류 메시지를 저장합니다. 기존 `analytics` 조회 화면은 이 서비스가 중단되어도 계속 동작합니다.
