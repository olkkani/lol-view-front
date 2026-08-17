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

## 폴링 재정렬 시 스크롤 위치 보존 (D2) 실제 구현

**What:** `docs/designs/lol-match-viewer.md`의 D2 규칙 — 폴링으로 라이브→종료 전환돼도 뷰포트에 보이는 카드는 즉시 움직이지 않고, 새로고침/탭 재클릭 시에만 재정렬 — 을 실제로 구현.

**Why:** 최종 전체 브랜치 리뷰(`/plan-eng-review` → subagent-driven-development 실행 후 최종 리뷰)에서 발견. `MatchList.tsx`가 `data` 변경마다 무조건 재정렬하고 있어, D2가 문서에는 있지만 실제로는 구현되지 않은 상태다. Task 6의 브리핑이 "애니메이션 없음"과 "스크롤 중 재정렬 안 함"을 하나로 뭉뚱그려 다뤄서, 어느 태스크도 D2를 명시적으로 책임지지 않았다.

**Pros:** 실사용 중 스크롤하다가 카드가 갑자기 밑으로 사라지는 나쁜 경험을 방지. 설계 문서와 실제 동작의 불일치 해소.

**Cons:** 구현 방법(정렬 결과를 ref에 freeze하고 range 변경/수동 refetch 시에만 재계산 등)에 대한 설계 판단이 필요 — 단순 수정이 아님.

**Context:** `src/features/matches/components/MatchList.tsx`의 `useMemo(() => sortMatches(...), [data, range])`가 현재 매 데이터 변경마다 재정렬하는 지점. `docs/designs/lol-match-viewer.md` D2 항목과 UI 규칙의 "스크롤 위치 보존" 섹션 참고.

**Depends on / blocked by:** 없음. 아래 "재정렬 통합 테스트 개선" TODO와 함께 처리하는 게 자연스러움(동작을 고치면서 테스트도 실제 동작을 검증하도록 같이 손보기).

## 재정렬 통합 테스트가 실제 in-place 업데이트를 검증하지 않음

**What:** `MatchList.test.tsx`의 "reorders a match from live-pinned to time-sorted position" 테스트가 `rerender` 시 새 `QueryClient`를 매번 생성해서 사실상 "새 마운트"를 테스트하고 있음 — 실제 폴링(같은 클라이언트, 캐시 데이터 업데이트)을 재현하지 않음. 또한 "라이브 경기가 킥오프 시각과 무관하게 최상단에 고정된다"는 핵심 동작이 `MatchList` 레벨에서는 전혀 검증되지 않고 `sortMatches.test.ts`의 고립된 유닛 테스트에만 존재함.

**Why:** 최종 전체 브랜치 리뷰에서 발견. 이 앱의 가장 특징적인 동작(라이브 우선 고정)이 컴포넌트 통합 레벨에서 무증거 상태.

**Pros:** 실제 폴링 시나리오(같은 QueryClient, in-place 캐시 업데이트)를 검증. 회귀 방지.

**Cons:** 위 "D2 스크롤 위치 보존" TODO와 동작이 바뀌면 이 테스트도 다시 손봐야 하므로, 두 TODO를 같이 처리하는 게 효율적 — 동작을 안 바꾼 채 테스트만 고치는 건 낭비.

**Context:** `src/features/matches/components/MatchList.test.tsx`의 마지막 테스트. 같은 `QueryClient` 인스턴스를 재사용하도록 고치고, 킥오프 시각이 늦은 라이브 경기가 이른 예정 경기보다 위에 렌더되는지 확인하는 별도 assertion 추가.

**Depends on / blocked by:** 위 "폴링 재정렬 시 스크롤 위치 보존 (D2) 실제 구현"과 함께 처리 권장.

## 사소한 후속 정리 항목 모음

**What:** 최종 전체 브랜치 리뷰에서 나온 Minor 항목들 — 한 번에 훑어보고 처리할 만한 낮은 우선순위 정리.

**Why:** 개별 TODO로 만들기엔 너무 작지만, 기록은 남겨둬야 나중에 잊히지 않음.

**Pros / Cons:** 각 항목이 저비용·저위험이라 별도 pros/cons 불필요.

**Context — 항목별:**
- `vitest.config.ts`가 여전히 deprecated `__dirname` 사용 (vite.config.ts는 이미 `import.meta.dirname`로 수정됨) — 통일 필요.
- `MatchCard.tsx`의 취소 판정이 `status` 필드를 전혀 안 쓰고 킥오프 시각+스코어 부재로만 추론 — 백엔드 스키마 확정 TODO와 함께 재검토.
- 킥오프 시각 표시가 `toLocaleTimeString`으로 브라우저 로컬 타임존을 씀 — 설계 문서는 KST 가정이므로 `timeZone: 'Asia/Seoul'` 명시 필요.
- 팀 로고 `<img>`에 `onError` 폴백 없음 — URL이 깨지면 깨진 이미지 아이콘 노출 (Open Questions에 이미 기록된 항목).
- 테스트 파일 3곳(`sortMatches.test.ts`, `MatchCard.test.tsx`, `MatchList.test.tsx`)에 거의 동일한 `makeMatch` 픽스처 팩토리가 중복 — 4번째 복사가 생기면 `test/fixtures.ts`로 추출 고려.
- `fetchMatches.ts`의 `http://localhost:9031`이 하드코딩됨 — 배포 시 깨짐. `import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:9031'`로 미리 대비 가능(배포 자체는 스코프 밖이지만 한 줄 비용).

**Depends on / blocked by:** 없음. 각각 독립적으로 아무 때나 처리 가능.

## 키보드 내비게이션 / 스크린리더 접근성

**What:** 탭 전환, 매치 카드, 재시도 버튼에 대한 키보드 전용 탐색 경로와 스크린리더용 ARIA 랜드마크/라이브 리전(특히 라이브 상태 변경 시 announce) 추가.

**Why:** `/plan-design-review`에서 터치 타겟 크기(44px)와 색상 대비는 기본 요구사항으로 이번 스코프에 포함했지만, 키보드만으로 전체 탐색이 가능한지와 스크린리더가 탭/라이브 상태를 제대로 읽어주는지는 문서화되지 않았다.

**Pros:** 접근성 향상. 특히 라이브 상태 변경을 스크린리더 사용자에게 announce하는 `aria-live` 리전은 이 앱의 핵심 가치(실시간성)와 직결됨.

**Cons:** 개인 사이드 프로젝트 규모에서 우선순위가 낮을 수 있음 — 실제 사용자 수요에 따라 판단.

**Context:** `docs/designs/lol-match-viewer.md`의 "v1 스코프 밖 — 반응형/접근성 상세" 섹션이 시작점.

**Depends on / blocked by:** v1 모바일 구현이 먼저 끝난 뒤 진행 권장.
