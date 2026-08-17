# TODOs

## 백엔드 응답 스키마 확정 후 가정 타입 갱신

**What:** `docs/designs/lol-match-viewer.md`의 "API 응답 타입 (가정)" 섹션과 `features/matches/types.ts`(구현 후)를 실제 백엔드 응답으로 검증하고 필요시 수정.

**Why:** `/plan-eng-review`에서 백엔드 스키마가 전혀 확인되지 않은 상태로 리뷰가 진행돼, 라이브 여부 필드명, 시리즈 포맷 필드 존재 여부, 취소/연기 경기 표현 방식을 모두 가정으로 문서화했다. 구현 시작 전 실제 `GET localhost:9031/matches?range=today` 응답을 한 번 호출해보지 않으면 타입이 실제와 어긋날 위험이 있다.

**Pros:** 구현 중간에 타입을 다시 뜯어고치는 것을 방지. `sortMatches.ts`의 라이브 판별 로직이 잘못된 필드에 의존하는 것을 조기에 방지.

**Cons:** 백엔드가 아직 해당 range로 실제 데이터를 못 내려줄 수도 있음(개발 환경 상태에 따라 다름) — 이 경우 가정 타입으로 우선 진행하고 이 TODO를 유지.

**Context:** 설계 문서(`docs/designs/lol-match-viewer.md`)의 "API 응답 타입 (가정)" 섹션이 시작점. `useMatches.ts` 구현 직전에 처리하는 게 가장 자연스럽다.

**Depends on / blocked by:** 없음. `features/matches/api/useMatches.ts` 구현(Next Steps 3번) 착수 전에 처리하는 것을 권장.

## 태블릿/데스크톱 반응형 대응

**What:** 매치 리스트 뷰를 DESIGN.md의 3단계 반응형 규칙(Mobile <744px, Tablet 744-1128px, Desktop 1128-1440px)에 맞춰 태블릿·데스크톱에서도 자연스럽게 보이도록 확장.

**Why:** `/plan-design-review`에서 v1은 390px 모바일 뷰포트만 확정하기로 결정했다("모바일 웹페이지"라는 원 요청에 맞춤). 하지만 데스크톱 브라우저로 접속하는 사용자도 있을 수 있고, DESIGN.md에 이미 반응형 규칙이 정의돼 있어 확장 비용이 낮다.

**Pros:** 더 넓은 접근성. 이미 존재하는 DESIGN.md 토큰을 활용하므로 새 디자인 결정이 거의 필요 없음.

**Cons:** 매치 카드 레이아웃(1열 리스트)을 넓은 화면에서 어떻게 배치할지(그리드? 여전히 1열?) 추가 디자인 판단이 필요.

**Context:** `docs/designs/lol-match-viewer.md`의 "v1 스코프 밖 — 반응형/접근성 상세" 섹션이 시작점. DESIGN.md "Responsive Behavior" 표를 참고.

**Depends on / blocked by:** v1 모바일 구현이 먼저 끝난 뒤 진행 권장.

## 키보드 내비게이션 / 스크린리더 접근성

**What:** 탭 전환, 매치 카드, 재시도 버튼에 대한 키보드 전용 탐색 경로와 스크린리더용 ARIA 랜드마크/라이브 리전(특히 라이브 상태 변경 시 announce) 추가.

**Why:** `/plan-design-review`에서 터치 타겟 크기(44px)와 색상 대비는 기본 요구사항으로 이번 스코프에 포함했지만, 키보드만으로 전체 탐색이 가능한지와 스크린리더가 탭/라이브 상태를 제대로 읽어주는지는 문서화되지 않았다.

**Pros:** 접근성 향상. 특히 라이브 상태 변경을 스크린리더 사용자에게 announce하는 `aria-live` 리전은 이 앱의 핵심 가치(실시간성)와 직결됨.

**Cons:** 개인 사이드 프로젝트 규모에서 우선순위가 낮을 수 있음 — 실제 사용자 수요에 따라 판단.

**Context:** `docs/designs/lol-match-viewer.md`의 "v1 스코프 밖 — 반응형/접근성 상세" 섹션이 시작점.

**Depends on / blocked by:** v1 모바일 구현이 먼저 끝난 뒤 진행 권장.
