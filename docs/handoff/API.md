# 제주 농산물 물류비 지원 예측 API

`jeju_engine`을 프론트엔드에 연결하는 HTTP API다(FastAPI). **데이터는 갱신하지 않는다.** `data/`에 있는 2026-10-31까지의 저장 데이터만 쓴다.

## 실행
```bash
pip install -r requirements.txt          # Python 3.9 이상
uvicorn api.app:app --reload --port 8000     # 패키지 최상위 폴더에서
```
- 자동 문서: http://localhost:8000/docs (요청을 바로 보내 볼 수 있다)
- 명세 파일: `docs/openapi.json`
- 엔드포인트별 실제 응답: `docs/api_examples/`

| 환경변수 | 기본값 | 뜻 |
|---|---|---|
| `CORS_ORIGINS` | `*` | 허용할 프론트 주소. 쉼표로 여러 개. 배포 때는 실제 주소로 제한 |
| `JEJU_API_WARMUP` | `1` | 서버 시작 때 최신 예측·다시보기를 미리 계산 (약 1초) |

## 응답 규칙
모든 응답(오류 포함)은 엔진과 같은 틀이다.
```json
{"function": "...", "ok": true, "error": null, "data_end": "2026-10-31",
 "model_version": "ewm3-2025-06", "result": {...}, "warnings": [...], "sources": [...]}
```

| HTTP | 언제 | 본문 |
|---|---|---|
| 200 | 정상 응답. `판정 불가`, `공고 확정`도 여기에 포함 (오류가 아니라 답의 한 종류) | `ok: true` |
| 400 | 입력 오류: 없는 품목, 형식이 틀린 날짜·월, 데이터보다 미래인 기준일, 필수 값 누락 | `ok: false`, `error`에 사유 |
| 404 | `/api/tools/{name}`에 Agent 도구가 아닌 이름을 넣었을 때 | `ok: false` |
| 500 | 서버 오류 | `ok: false` |

## 엔드포인트
| 메서드·경로 | 엔진 함수 | 용도 |
|---|---|---|
| `GET /api/health` | — | 서버 상태, 데이터 기준일, 함수 목록 |
| `GET /api/functions` | — | 함수 11개 명세 (`functions.json`) |
| `GET /api/support?item=&ym=&as_of=&mode=` | `predict_support` | 품목 하나의 지원 가능성 |
| `GET /api/support/all?ym=&as_of=&mode=` | `predict_support("전체")` | 4개 품목 비교 (확률 높은 순) |
| `GET /api/support/replay?item=&ym=` | `replay_support` | 한 달 동안의 판정 변화 (거래일마다 한 건) |
| `GET /api/market/{item}/{level}?start=&end=` | `get_market_data` | `level`: status(이번 달 현황), daily(일별), monthly(월별) |
| `GET /api/config/{topic}?item=&season=` | `get_config` | `topic`: summary, items, requirements, documents, schedule, model, all |
| `POST /api/eligibility` | `check_eligibility` | 신청 요건 사전 점검. 본문 `{item, ym, user_info}` |
| `POST /api/docs-check` | `check_docs` | 준비·누락 서류. 본문 `{item, ym, docs, applicant_type}` |
| `GET /api/volume?item=&period=30d` | `analyze_volume` | 최근 N일 vs 직전 N일 거래량 |
| `GET /api/season?item=` | `analyze_season` | 월별 거래 집중 시기 |
| `POST /api/tools/{name}` | Agent 도구 7개 | 채팅 단계에서 도구를 이름으로 호출. 본문은 함수 인자 |

품목(`item`)은 `양배추`, `월동무`, `당근`, `조생양파` 중 하나이다. 경로에 한글을 넣을 때는 URL 인코딩한다(브라우저 `fetch`는 자동으로 처리).

## 기준일과 시연
- `as_of`를 생략하면 데이터 마지막 날(2026-10-31)이 기준일이다. 이때 대상 월은 2026-11이다.
- 과거 날짜를 기준으로 보여주려면 `mode=replay&as_of=YYYY-MM-DD`를 붙인다. 그 시점에 알 수 있던 정보만 쓴다(그 달을 뺀 환산 비율, 공고 결과 무시).
  - 예: `GET /api/support?item=양배추&ym=2026-03&as_of=2026-03-14&mode=replay`
- `mode=live`(기본)에서 이미 공고가 난 달(2023/24, 2025/26 시즌)을 물으면 예측 대신 `status: 공고 확정`과 `announced`(공식 월평균·지원 여부)를 준다.
- 데이터 마지막 날보다 뒤인 `as_of`는 400이다.

## 화면별 호출 (현재 대시보드 기준)
| 화면 영역 | 호출 |
|---|---|
| 상단 품목 칩 | `GET /api/support/all` |
| 이번 달 지원 가능성 카드 | `GET /api/support?item=` |
| 출하 증빙 준비 카드 | `GET /api/config/schedule`, `GET /api/config/documents` |
| 신청 전 확인 정보 | `GET /api/config/requirements` |
| 월별 가격 차트 | `GET /api/market/{item}/monthly` |
| 지난 결과 | `GET /api/market/{item}/monthly` (공고된 달은 `official_per_spec`, `eligible`) |
| 날짜 슬라이더 데모 | `GET /api/support/replay?item=&ym=` |
| 데이터 기준일 표시 | 모든 응답의 `data_end` |

라벨 문구(예: "아직 몰라요"), 차트에 그릴 값, 확률 표시 방식은 프론트와 합의한 뒤 정한다. API는 엔진의 코드값(`status`, `verdict`, `p_below`)만 준다.

## 캐시
데이터가 고정이라 같은 요청의 결과는 프로세스 안에 계속 캐시한다(최대 5,000건). 서버를 다시 시작하면 비워진다. 오류 응답은 캐시하지 않는다.

## 서버 점검
`python scripts/check_server.py --spawn`은 서버를 직접 띄워 17개 항목을 실제 HTTP로 확인하고 끝나면 끈다. 서버를 이미 켜 두었다면 `--spawn` 없이 실행한다(표준 라이브러리만 사용).

## 소비자 시나리오 점검
사용 흐름별 점검과 그 과정에서 고친 내용은 `docs/SCENARIOS.md`에 있다.

## 채팅 (초안)
답변 문구와 카드 형식은 `docs/CHAT_SPEC.md`, 질문 유형별 응답 예시는 `docs/chat_examples/`에 있다.

## 아직 없는 것
- **채팅 API** (`POST /api/agent/chat`): 답변 문구와 카드 형식을 프론트와 합의한 뒤 만든다. 도구 호출은 `/api/tools/{name}`이 이미 준비돼 있다.
- **데이터 갱신**: 하지 않는다.
