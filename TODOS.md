# TODOs

## prd 환경에서의 백엔드 프록시 방식 결정

**What:** `vite.config.ts`의 `server.proxy['/api']`는 dev 서버 전용이다. `vite build`로 만든 정적 파일은 이 프록시를 통과하지 않으므로, prd 배포 환경에서 프론트가 백엔드로 요청을 보낼 방법을 별도로 정해야 한다.

**Why:** profile별 base URL 분기(dev: `localhost:9031`, prd: 서버 주소 미정) 작업 중 발견. prd 서버 주소가 아직 확정되지 않아 이번엔 dev 프록시 배선까지만 구현하고 prd는 `.env.prod`에 빈 값 플레이스홀더로 남겨뒀다.

**Pros:** 지금 미리 결정하지 않아도 dev 환경은 완전히 동작한다 — 급하지 않음.

**Cons:** prd 서버 주소가 정해지는 시점에 반드시 결정해야 함 — 안 하면 배포된 프론트가 백엔드를 호출할 방법이 없음. 후보: (1) 배포 서버(Nginx 등)에서 `/api` 리버스 프록시, (2) 백엔드가 프론트 도메인에 CORS 허용, (3) `VITE_API_TARGET`을 절대 URL로 두고 프론트에서 직접 fetch(CORS 필요).

**Context:** `vite.config.ts`의 `server.proxy` 블록, `src/features/matches/api/fetchMatches.ts`의 `/api/matches` 상대 경로 fetch. `.env.example` 참고.

**Depends on / blocked by:** prd 백엔드 서버 주소 확정.

## ~~백엔드 응답 스키마 확정 후 가정 타입 갱신~~ (해결됨 2026-08-17)

실제 백엔드 응답을 `curl`로 확인 완료. 가정과 실제가 상당히 달랐음 — `id`는 number, `league` 필드 없음(`matchLabel`로 대체), 팀 정보는 `teams` 튜플이 아니라 `clubs` 배열(0개 또는 2개, 1개는 없음), `isLive` 필드는 없고 `matchState`("SCHEDULED"|"FINISHED"|"ONGOING")로 판별, `seriesFormat` 필드 없음. `types.ts`, `sortMatches.ts`, `MatchCard.tsx`와 관련 테스트를 실제 스키마에 맞춰 전면 갱신함(`docs/superpowers/plans/2026-08-17-real-backend-schema-migration.md` 참고).

CANCELLED/POSTPONED 등 다른 `matchState` 값이 실제로 존재하는지는 여전히 미확인 — 열린 유니온 타입으로 모델링해뒀으니 나중에 관측되면 `MatchState`에 값만 추가하면 됨.

## 설계 문서(docs/designs/lol-match-viewer.md)가 실제 백엔드 스키마와 어긋남

**What:** `docs/designs/lol-match-viewer.md`의 UI 규칙 섹션(72, 77, 78, 93, 136번 줄)과 열린 항목 D1(222번 줄)이 여전히 취소/연기 muted 배지와 시리즈 포맷(Bo3/Bo5) 표시를 명시하고 있다. 둘 다 이제 구현 불가능함이 확인됨 — 백엔드에 취소 필드도, `seriesFormat` 필드도 없다. 문서는 "대진 미정" 상태(실제로는 `upcoming` 탭 경기의 다수 케이스)도 전혀 언급하지 않는다.

**Why:** 실제 스키마 마이그레이션(`docs/superpowers/plans/2026-08-17-real-backend-schema-migration.md`)의 최종 전체 브랜치 리뷰에서 발견. 계획 헤더는 설계 문서의 "API 응답 타입 (가정)" 섹션만 상위 문서로 대체됐다고 명시했지만, UI 규칙 섹션 자체는 갱신되지 않아 지금 배포된 코드와 모순되는 내용을 담고 있다.

**Pros:** 문서와 실제 동작의 불일치를 해소 — 나중에 이 문서를 보고 취소 배지나 시리즈 포맷을 "아직 구현 안 된 것"으로 착각해 재구현 시도하는 걸 방지.

**Cons:** 문서 수정 작업 자체는 낮은 리스크·저비용이지만, 우선순위는 낮음.

**Context:** `docs/designs/lol-match-viewer.md` 72/77/78/93/136번 줄과 D1(222번 줄). "대진 미정" 상태는 `src/features/matches/components/MatchCard.tsx`의 `hasTeams` 분기 참고.

**Depends on / blocked by:** 없음.

## 태블릿/데스크톱 반응형 대응

**What:** 매치 리스트 뷰를 DESIGN.md의 3단계 반응형 규칙(Mobile <744px, Tablet 744-1128px, Desktop 1128-1440px)에 맞춰 태블릿·데스크톱에서도 자연스럽게 보이도록 확장.

**Why:** `/plan-design-review`에서 v1은 390px 모바일 뷰포트만 확정하기로 결정했다("모바일 웹페이지"라는 원 요청에 맞춤). 하지만 데스크톱 브라우저로 접속하는 사용자도 있을 수 있고, DESIGN.md에 이미 반응형 규칙이 정의돼 있어 확장 비용이 낮다.

**Pros:** 더 넓은 접근성. 이미 존재하는 DESIGN.md 토큰을 활용하므로 새 디자인 결정이 거의 필요 없음.

**Cons:** 매치 카드 레이아웃(1열 리스트)을 넓은 화면에서 어떻게 배치할지(그리드? 여전히 1열?) 추가 디자인 판단이 필요.

**Context:** `docs/designs/lol-match-viewer.md`의 "v1 스코프 밖 — 반응형/접근성 상세" 섹션이 시작점. DESIGN.md "Responsive Behavior" 표를 참고.

**Depends on / blocked by:** v1 모바일 구현이 먼저 끝난 뒤 진행 권장.

## ~~폴링 재정렬 시 스크롤 위치 보존 (D2) 실제 구현~~ (해결됨 2026-08-19)

`useFrozenMatches` 훅으로 해결. `docs/superpowers/plans/2026-08-19-match-status-sections.md` 참고.

## ~~재정렬 통합 테스트가 실제 in-place 업데이트를 검증하지 않음~~ (해결됨 2026-08-19)

`MatchList.test.tsx`의 재작성된 poll 테스트가 단일 `QueryClient`를 재사용하도록 수정됨. `docs/superpowers/plans/2026-08-19-match-status-sections.md` Task 4 참고.

## 사소한 후속 정리 항목 모음

**What:** 최종 전체 브랜치 리뷰에서 나온 Minor 항목들 — 한 번에 훑어보고 처리할 만한 낮은 우선순위 정리.

**Why:** 개별 TODO로 만들기엔 너무 작지만, 기록은 남겨둬야 나중에 잊히지 않음.

**Pros / Cons:** 각 항목이 저비용·저위험이라 별도 pros/cons 불필요.

**Context — 항목별:**
- `vitest.config.ts`가 여전히 deprecated `__dirname` 사용 (vite.config.ts는 이미 `import.meta.dirname`로 수정됨) — 통일 필요.
- ~~`MatchCard.tsx`의 취소 판정이 `status` 필드를 전혀 안 쓰고...`~~ (해결됨) — 실제로는 `status`/취소 필드 자체가 백엔드에 없었음. 이제 `matchState`(SCHEDULED/FINISHED/ONGOING) 기반으로 판별하고, 팀 미배정(`clubs: []`)은 별도 "대진 미정" 상태로 처리.
- 킥오프 시각 표시가 `toLocaleTimeString`으로 브라우저 로컬 타임존을 씀 — 설계 문서는 KST 가정이므로 `timeZone: 'Asia/Seoul'` 명시 필요.
- 팀 로고 `<img>`에 `onError` 폴백 없음 — URL이 깨지면 깨진 이미지 아이콘 노출 (Open Questions에 이미 기록된 항목).
- 테스트 파일 3곳(`sortMatches.test.ts`, `MatchCard.test.tsx`, `MatchList.test.tsx`)에 거의 동일한 `makeMatch` 픽스처 팩토리가 중복 — 4번째 복사가 생기면 `test/fixtures.ts`로 추출 고려.
- `fetchMatches.ts`의 `http://localhost:9031`이 하드코딩됨 — 배포 시 깨짐. `import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:9031'`로 미리 대비 가능(배포 자체는 스코프 밖이지만 한 줄 비용).
- `MatchCard.tsx`의 동점(FINISHED, 스코어 동일) 처리 — 현재 `clubA.score > clubB.score ? 0 : 1` 삼항연산이라 동점이면 항상 팀 A 스코어가 dim 처리됨(승자가 없는데 팀 B가 이긴 것처럼 표시). LoL 매치 스코어링 특성상 동점이 사실상 불가능해 낮은 우선순위지만, 고칠 경우 `winnerIndex = clubA.score === clubB.score ? null : (clubA.score > clubB.score ? 0 : 1)`.
- "대진 미정"(clubs: []) 카드가 킥오프 시각을 표시하지 않음 — `upcoming` 탭 경기의 다수(실측 15건 중 10건)가 이 상태인데 언제 경기인지 정보가 빠져있음. `startTime`은 이미 응답에 있으니 "대진 미정" 문구 옆에 시각을 같이 보여주는 게 자연스러움 — 다만 UI 판단이라 사용자 확인 필요.

**Depends on / blocked by:** 없음. 각각 독립적으로 아무 때나 처리 가능.

## 키보드 내비게이션 / 스크린리더 접근성

**What:** 탭 전환, 매치 카드, 재시도 버튼에 대한 키보드 전용 탐색 경로와 스크린리더용 ARIA 랜드마크/라이브 리전(특히 라이브 상태 변경 시 announce) 추가.

**Why:** `/plan-design-review`에서 터치 타겟 크기(44px)와 색상 대비는 기본 요구사항으로 이번 스코프에 포함했지만, 키보드만으로 전체 탐색이 가능한지와 스크린리더가 탭/라이브 상태를 제대로 읽어주는지는 문서화되지 않았다.

**Pros:** 접근성 향상. 특히 라이브 상태 변경을 스크린리더 사용자에게 announce하는 `aria-live` 리전은 이 앱의 핵심 가치(실시간성)와 직결됨.

**Cons:** 개인 사이드 프로젝트 규모에서 우선순위가 낮을 수 있음 — 실제 사용자 수요에 따라 판단.

**Context:** `docs/designs/lol-match-viewer.md`의 "v1 스코프 밖 — 반응형/접근성 상세" 섹션이 시작점.

**Depends on / blocked by:** v1 모바일 구현이 먼저 끝난 뒤 진행 권장.
