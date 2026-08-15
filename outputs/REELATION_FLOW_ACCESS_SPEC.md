# REELATION — FLOW / ACCESS / PRIVACY SPEC v1

## 0. 최상위 원칙

Reelation은 사주 결과를 보여주는 앱이 아니라, 사주를 보이지 않는 계산 엔진으로 사용해 사용자의 인간관계를 영화처럼 보여주는 링크 기반 Personal OTT 서비스다.

```text
Movie      = 사용자의 인생 영화
Owner      = Main Character이자 영화 소유자
Cast       = Owner의 영화에 참여한 사람
Role       = 영화 속 출연 비중
Life Role  = Owner의 삶에서 수행하는 관계 기능
Genre      = 두 사람의 관계를 영화로 해석한 결과
Theme      = Movie Genre를 표현하는 UI 토큰
```

전체 탐색 피드는 MVP에 포함하지 않는다. 모든 공개 영화 유입은 Owner가 공유한 링크를 기준으로 한다.

---

## 1. 사용자 상태

```ts
type ViewerState =
  | 'ANONYMOUS'
  | 'AUTHENTICATED_WITHOUT_MOVIE'
  | 'OWNER'
  | 'AUTHENTICATED_VISITOR'
  | 'PARTICIPATING_FRIEND';
```

- `ANONYMOUS`: 로그인하지 않은 공개 영화 관람자
- `AUTHENTICATED_WITHOUT_MOVIE`: 로그인했으나 자신의 Movie가 없는 사용자
- `OWNER`: 현재 Movie의 소유자
- `AUTHENTICATED_VISITOR`: 다른 사용자의 공개 Movie를 보는 로그인 사용자
- `PARTICIPATING_FRIEND`: 해당 Movie에 Cast로 연결된 사용자

권한은 URL이나 프론트엔드 상태가 아니라 서버에서 확인한 사용자 ID와 Movie 소유권으로 결정한다.

---

## 2. 신규 Owner Journey

```text
Landing
→ 카카오 로그인
→ 약관 및 개인정보 동의
→ 닉네임·공개명 입력
→ 생년월일·성별·출생시간 입력
→ 사주 계산
→ Movie 생성(DRAFT)
→ 영화 해석 생성(GENERATING)
→ Main Character 및 포스터 생성
→ Movie 완료(COMPLETED)
→ 공개 링크 활성화
→ 친구 초대
```

### 상태 전이

```text
DRAFT
  └─ 생성 요청 → GENERATING
GENERATING
  ├─ 필수 산출물 완료 → COMPLETED
  └─ 실패 → DRAFT + generation error 기록
COMPLETED
  ├─ Cast 변경 → UPDATED
  ├─ 명시적 재생성 → GENERATING
  └─ 삭제/보관 → ARCHIVED
UPDATED
  ├─ 현재 Movie 계속 공개
  ├─ 명시적 재생성 → GENERATING
  └─ 삭제/보관 → ARCHIVED
```

`UPDATED`는 Movie 콘텐츠가 잘못되었다는 뜻이 아니다. Cast와 Ranking이 바뀌었지만 기존 포스터와 AI Movie version은 유효하다는 뜻이다.

---

## 3. 친구 참여 Journey

```text
공유 링크 클릭
→ 공개 Movie 감상(로그인 불필요)
→ “나는 어떤 역할일까?” 선택
→ 카카오 로그인
→ 기존 참여 여부 확인
→ 닉네임·공개명·생년월일·성별·출생시간 입력
→ 관계 계산 및 Character 결정
→ Owner Movie의 Cast 생성
→ Ranking transaction 실행 및 저장
→ 본인 전용 결과 공개
→ 자신의 Reelation 생성 여부 선택
```

로그인 전 입력 폼을 먼저 보여줄 수는 있지만, 생년월일을 전송하거나 Cast를 생성하기 전에 반드시 로그인해야 한다.

### 중복 참여

동일 Movie에서 다음 중 하나가 일치하면 중복으로 처리한다.

- `participant_user_id`
- 로그인 전 임시 참여의 안전한 submission fingerprint

중복 시 새 Cast를 만들지 않는다.

```text
이미 이 영화에 참여했어요.
[기존 캐릭터 보기]
[내 Reelation 보기/만들기]
```

철회한 참여자는 자동 복구하지 않는다. 새 동의와 Owner Movie의 활성 상태를 확인한 뒤 별도의 재참여 절차를 사용한다.

---

## 4. 로그인 전후 기능 정책

| 기능 | 비로그인 | 로그인 Visitor | 참여 친구 | Owner |
|---|---:|---:|---:|---:|
| 공개 Movie 감상 | O | O | O | O |
| 공개 Cast/Top Cast 보기 | O | O | O | O |
| 참여 CTA 진입 | O | O | O | O |
| 생년월일 제출 | X | O | 재제출 X | 직접 Cast 등록만 O |
| Cast 생성 | X | O | 중복 X | O |
| 본인 관계 결과 보기 | X | 참여 후 O | O | Owner 상세 O |
| 다른 Cast의 상세 분석 | X | X | X | O |
| Movie 관리·재생성·삭제 | X | X | X | O |
| 자신의 Movie 생성 | X | O | O | O |

비로그인 사용자에게 로그인 필요 상태를 빈 화면으로 보여주지 않는다. 공개 Movie는 계속 보존하고 참여 버튼에서 로그인으로 전환한다.

---

## 5. 데이터 공개 범위

### PUBLIC — 공유 링크 보유자

```text
Owner 공개명
Movie 제목
Movie 장르
Movie 포스터
Movie tagline
Cast 공개명
Cast Character 이미지 또는 avatar
Influence Score
Influence Rank
총 Cast 수
```

### OWNER PRIVATE — Movie Owner만

```text
Cast Tier
Life Role
Relationship Genre
Category Scores / Ranks
Detail Scores / Ranks
Filmography
AI Narrative
분석 상태 및 실패 상태
직접 등록한 Cast의 수정/삭제 관리 데이터
```

### PARTICIPANT PRIVATE — 참여자 본인만

```text
해당 Movie 속 자신의 Cast Tier
자신의 Life Role
자신의 Influence Score / Rank
자신과 Owner 사이의 Relationship Genre
자신에게 허용된 관계 설명
참여 동의 및 철회 상태
```

### STRICT PRIVATE — 원본 입력 주체 외 공개 금지

```text
생년월일
출생시간
출생지
사주 원본 구조
submission fingerprint
Invite raw token
내부 prompt / model request
```

### 중요 결정

`Cast Role`은 의미가 모호하므로 Public에 바로 공개하지 않는다.

- `Cast Tier(주연/조연/단역/카메오)`: Owner와 해당 참여자만
- `Influence Score / Rank`: Public
- 공개 테스트 후 Tier 공개 여부를 별도 feature flag로 결정

이 정책은 이전 Reelation 개인정보 명세의 더 엄격한 기준을 유지한다.

---

## 6. 닉네임과 공개명

```text
nickname    = 계정/내부 표시명
public_name = 해당 Movie에서 공개할 이름
real_name   = MVP 저장 금지
```

표시 우선순위:

```text
public_name → nickname → “익명의 출연진”
```

공개명은 1~40자이며, 공백만 입력할 수 없다. Owner는 Invite 참여자의 공개명을 임의로 실명으로 변경할 수 없다.

---

## 7. Movie Version과 AI Cache

AI 결과는 `Movie` 행을 덮어쓰지 않고 immutable `MovieVersion`으로 저장한다.

```text
movie_version
prompt_version
model_version
input_hash
generation_reason
movie_payload
poster_status
poster_image_key
created_at
```

### 자동 재생성하지 않는 사건

- Cast 추가·삭제·철회
- Influence Ranking 변경
- Invite 생성·비활성화
- 공개명 변경

이 사건은 Movie 상태만 `UPDATED`로 변경한다.

### 재생성 가능한 사건

- 최초 Movie 생성
- Owner의 `새로운 영화 만들기`
- Owner의 `새로운 해석 보기`
- Owner 사주 원본 변경 후 명시적 확인

동일한 `movie_id + input_hash + prompt_version + model_version` 조합이 이미 성공했다면 캐시를 재사용한다.

### 재생성 확인문

```text
현재 영화와 공유 링크는 유지됩니다.
새로운 버전을 만들면 완성 후 최신 버전으로 전환할 수 있어요.
```

생성 실패 시 기존 완료 버전을 계속 공개한다. 실패한 새 버전 때문에 공개 Movie를 빈 화면으로 만들지 않는다.

---

## 8. Birth 정보 수정

Owner 또는 참여자가 생년월일·출생시간을 변경하면 기존 분석을 조용히 덮어쓰지 않는다.

```text
정보 수정
→ 영향받는 Movie/Relationship 목록 계산
→ “결과 재계산이 필요합니다” 안내
→ 사용자 확인
→ 새 사주 Profile version 생성
→ 관계 점수 transaction
→ Owner Movie는 UPDATED
→ Movie AI 재생성은 별도 선택
```

출생시간 `모름`은 허용한다. 분석 결과에는 `STANDARD` confidence를 저장하고 UI에 정확도 안내를 표시한다.

---

## 9. Ranking 갱신

페이지를 열 때 Ranking을 계산하지 않는다.

```text
Cast 생성/분석 완료
→ 해당 Board의 전체 raw score 조회
→ raw score 기준 정렬
→ 동점 규칙 적용
→ Ranking rows transaction upsert
→ Public projection 갱신
→ Movie 상태 UPDATED
```

표시 점수는 정수지만 정렬에는 반올림 전 raw float를 사용한다.

동점 규칙:

```text
raw score DESC
impact DESC
longevity DESC
cast created_at ASC
cast id ASC
```

분석 실패한 Cast는 Ranking에 포함하지 않으며 `분석 중` 또는 `다시 시도` 상태로 표시한다.

---

## 10. 이미지 정책

### MVP 필수

- Owner Movie Poster: AI 생성 1개
- Main Character visual: 60갑자 Character Still 사용
- Cast visual: 기존 60갑자 Character Still 사용

Cast마다 외부 AI 이미지 생성 API를 호출하지 않는다. 이미 보유한 60갑자 × 성별 asset을 deterministic key로 선택한다.

### 상태

```text
PENDING
GENERATING
DONE
FAILED
```

Poster 실패 시 Main Character Still과 Genre Theme으로 fallback poster를 즉시 렌더링한다.

---

## 11. 삭제와 보관

### Movie 삭제 기본값

즉시 hard delete하지 않고 `ARCHIVED` 처리한다.

```text
Movie status = ARCHIVED
Public Reel is_active = false
모든 Invite = DISABLED
공개 링크 접근 차단
Owner UI에서 복구 유예 상태 표시
```

개인정보 삭제 요청이나 유예기간 만료 시 hard delete job을 실행한다.

### Hard delete 순서

```text
Invite 비활성화
→ Public projection 삭제
→ AI poster/storage 삭제
→ MovieVersion 삭제
→ Relationship/Narrative/Ranking 삭제
→ Cast/Participation 삭제 또는 사용자 소유 데이터 분리
→ Birth Profile orphan 확인 후 삭제
→ Movie/Board 삭제
```

참여자가 자신의 참여를 철회하면 Owner의 관계 상세와 공개 Cast projection에서 제거한다. Owner가 참여자의 원본 생년월일을 보존할 수 없다.

---

## 12. 공유와 OG

공유 URL은 DB primary key가 아닌 `public_id` 또는 안전한 Invite token을 사용한다.

### 일반 Movie 공유

```text
🎬 {public_name}님의 인생 영화
“{movie_title}”
당신은 이 영화에서 어떤 역할일까요?
```

### OG 이미지

```text
AI Movie Poster 또는 fallback poster
Movie title
Owner public name
Reelation logo
```

OG에는 생년월일, 사주, 관계 상세, 비공개 Role을 포함하지 않는다.

카카오 공유는 `share_clicked` 기록 후 공개 Reel URL만 전달한다.

---

## 13. Loading / Error / Empty State

### Movie 생성

```text
당신의 영화를 제작 중입니다.
1. 주인공 분석 중
2. 영화의 장르를 찾는 중
3. 포스터 제작 중
```

서버의 실제 job 상태를 기준으로 표시하며 가짜 완료 진행률을 사용하지 않는다.

### Cast 없음

```text
아직 출연진이 없습니다.
친구를 초대해 첫 번째 장면을 시작해보세요.
```

### Poster 실패

```text
포스터 제작이 잠시 멈췄어요.
영화와 출연진은 정상적으로 볼 수 있습니다.
[다시 시도]
```

### Invite 오류

- 존재하지 않음
- 만료됨
- 비활성화됨
- Movie 보관됨
- 중복 참여
- 저장 실패

각 상태는 빈 화면이 아니라 전용 메시지와 안전한 다음 행동을 제공한다.

---

## 14. Analytics 계약

```text
login_success
reelation_created
movie_created
invite_created
invite_opened
birth_submitted
cast_created
poster_generated
ranking_viewed
share_clicked
```

이벤트에는 생년월일·출생시간·사주 원본·닉네임을 넣지 않는다.

공통 필드:

```text
event_name
movie_id (nullable)
board_id (nullable)
actor_user_id (nullable)
anonymous_session_id (nullable, 회전 가능)
properties (비식별 metadata)
created_at
```

클라이언트가 DB에 직접 insert하지 않고 검증된 서버 endpoint를 통해 기록한다.

---

## 15. URL과 View Mode

```text
/reel/{publicId}
  Owner 로그인 일치 → Owner View
  그 외 → Visitor Public Single Page

/reel/{publicId}/cast/{castPublicId}
  참여자 본인 또는 Owner만 허용된 상세 projection

/movie/{movieId}
  Owner 전용 Movie version 관리
```

내부 UUID와 외부 공개 ID를 분리한다. 요청의 `movieId`, `boardId`, `castId`를 신뢰하지 않고 서버에서 소유권과 연결 관계를 다시 확인한다.

---

## 16. 기술 구조

현재 배포된 Vanilla frontend를 즉시 전면 교체하지 않는다.

```text
Current MVP Frontend: Static ES Modules
Backend: Supabase / PostgreSQL / Edge Functions
Auth: Kakao OAuth via Supabase Auth
Rule Engine: deterministic TypeScript
LLM: narrative and structured movie copy only
Image API: Movie Poster only
Storage: Supabase Storage
```

Next.js 전환은 SSR 기반 동적 OG, 서버 렌더링, 운영 규모가 실제로 필요해질 때 별도 migration project로 결정한다. 현재 MVP에 React/Next.js 전환을 섞지 않는다.

---

## 17. 구현 Phase

### Foundation — 완료/진행 중

- Owner / Visitor 분리
- Private birth data / Public projection 분리
- Invite token hash 및 중복 참여 차단
- Movie / MovieVersion / Theme schema
- Cast 변경 시 Movie `UPDATED`

### 다음 구현

1. 로그인 필수 참여 전환
2. Movie generation job 및 상태 API
3. Ranking transaction/RPC
4. AI Poster job + Storage + fallback
5. 카카오 공유 및 동적 OG
6. Birth 수정 및 version 재계산
7. Archive / hard-delete workflow
8. 서버 Analytics endpoint

### 이후

- Full 만세력 Engine
- Genre Theme 자동 선택
- 알림
- Admin
- 공개 탐색은 사용자 검증 후 재논의

---

## 18. Codex Critical Rules

1. 비로그인 사용자는 공개 Movie를 볼 수 있지만 Cast를 생성할 수 없다.
2. Owner/Visitor 판단을 frontend route만으로 하지 않는다.
3. 생년월일·출생시간·사주 원본을 Public projection에 넣지 않는다.
4. Cast 추가로 MovieVersion이나 AI Poster를 자동 재생성하지 않는다.
5. Ranking은 분석 완료 시 transaction으로 저장하며 페이지 진입 때 계산하지 않는다.
6. 실패한 새 MovieVersion 때문에 기존 완료 Movie를 숨기지 않는다.
7. `CastTier`, `LifeRole`, `RelationshipGenre`, `RelationshipCategory`, `MovieGenre`, `MovieTheme`을 합치지 않는다.
8. 공개 URL에 내부 primary key를 노출하지 않는다.
9. Client가 보낸 board/movie/cast ID를 신뢰하지 않는다.
10. 기능 화면에 영화 용어를 억지로 적용하지 않는다. 영화 언어는 결과 콘텐츠에 사용한다.
