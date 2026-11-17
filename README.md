# 바당 PASS — 프론트엔드

제주 농산물 물류비 지원 예측 서비스 **바당 PASS**의 프론트엔드. 물류비 지원 예측 API(백엔드 `jeju_engine` + FastAPI)를 화면에 연결한 대시보드입니다.
화면 구성은 Figma 대시보드(node 1:844)를 따르고, API 사용법과 규칙은 백엔드 전달 문서(`docs/handoff/`)를 따릅니다.

React + Vite + TypeScript. 차트는 외부 라이브러리 없이 SVG로 그립니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
```

### 목업 모드와 실제 서버 모드

| 모드 | 설정 | 데이터 |
|---|---|---|
| 목업 (기본) | `.env` 없음 | `src/mocks/api/` = 백엔드가 준 `docs/api_examples` (실제 서버 응답) |
| 실제 서버 | `.env`에 `VITE_API_BASE=http://localhost:8000` | 백엔드 FastAPI |

```bash
cp .env.example .env    # 그리고 VITE_API_BASE 줄의 주석을 푼다
```

백엔드 실행 (백엔드 전달문서 3절):

```bash
cd jeju_backend && pip install -r requirements.txt && uvicorn api.app:app --port 8000
```

오른쪽 위 표시가 `목업 데이터`면 목업 모드, `API 연결`이면 실제 서버에 연결된 상태입니다.
목업에 예시가 없는 요청(예: 월동무 월별 시세)은 "목업 예시에 없는 요청이에요"라고 표시되며, 실제 서버를 연결하면 보입니다.

## 화면 ↔ API (전달문서 4절)

| 화면 | 호출 | 파일 |
|---|---|---|
| 상단 품목 칩 | `GET /api/support/all` | `App.tsx` |
| 지원 가능성 카드 | `GET /api/support?item=` | `components/Home.tsx` |
| 출하 증빙 준비 | `GET /api/config/schedule` | `components/Home.tsx` |
| 신청 전 확인 정보 | `GET /api/config/requirements` | `components/Home.tsx` |
| 월별 가격 차트 | `GET /api/market/{item}/monthly` | `components/Home.tsx` |
| 시연 날짜 슬라이더 | `GET /api/support/replay`, `mode=replay&as_of=` | `App.tsx` |
| 지난 결과 | `GET /api/market/{item}/monthly` (공고된 달) | `components/Results.tsx` |
| 신청 안내 | `GET /api/config/{summary,schedule,items,documents,requirements}` | `components/Apply.tsx` |
| 채팅 | `POST /api/agent/chat` (아직 없음 → 예시 답변) | `components/Chat.tsx` |
| 채팅 카드 버튼 | `POST /api/tools/{tool}` | `components/Chat.tsx`, `lib/cards.ts` |

API 호출은 모두 `src/api/endpoints.ts`에 있습니다.

## 전달문서 "반드시 지킬 것" 반영 위치

| # | 규칙 | 반영 |
|---|---|---|
| 1 | `data_end`를 기준일로 표시 | 기준일 바: "데이터 2026-10-31까지 (갱신 안 함)" |
| 2 | 서비스는 live, 시연은 replay | 상단 `최신 데이터 / 시연` 전환. 시연은 항상 `mode=replay&as_of=` |
| 3 | 오류는 `ok:false`일 때만, `error` 문장 그대로 표시 | `api/client.ts` `ApiError` |
| 4 | 금액은 원/공고 규격 | `lib/format.ts` `SPEC_NAME`, 카드마다 "가락시장 8kg 망 기준" |
| 5 | 확률 숫자 숨김, 라벨·색은 ui.json | `config/ui.json`, `lib/rules.ts` |
| 6 | 판정 → 배지 | `lib/rules.ts` `supportBadge` |
| 7 | 고지 문구 | 홈 하단, 채팅 지원 가능성·비교·공고 카드 뒤 |
| 8 | 경고 → 쉬운 문구 | `lib/rules.ts` `plainWarnings` (CHAT_SPEC 6절 표) |
| 9 | 신청 시작일 두 값 | `lib/rules.ts` `applyPeriod` → "4월 14일 또는 4월 21일 ~ 4월 28일 (시작일 확인 필요)" |
| 10 | 서비스 이름 | `ui.json`의 `service_name` = "바당 PASS" (null이면 임시 이름으로 돌아감) |

## 설정 바꾸기

배지 라벨·색, 확률 표시 여부, 서비스 이름은 `src/config/ui.json`만 고치면 됩니다. 백엔드의 같은 파일과 값을 맞춰야 합니다.

## 아직 남은 것

- 채팅 API `POST /api/agent/chat`: 백엔드에 생기면 코드 수정 없이 자동으로 실제 답변을 씁니다. 그 전에는 질문을 규칙으로 분류해 `docs/chat_examples`의 예시 답변을 보여주고, 채팅 위에 `예시 답변` 표시가 붙습니다.
- 메뉴의 `검색`, `내 정보`: Figma에 있지만 기능이 정해지지 않아 비활성화했습니다.

