# Reelation UI/UX Design Guide v2

## Product principle

**영화처럼 꾸미지 않고, 내 인간관계를 영화처럼 보여준다.**

Reelation은 사주 리포트가 아니라 개인 OTT 경험이다. 사용자는 영화와 캐릭터를 먼저 보고, 분석 근거는 원할 때만 확인한다.

## Experience hierarchy

1. **MY MOVIE** — AI 포스터, 영화 제목, 장르, 주인공
2. **CASTING BOARD** — Main Character → Lead → Supporting → Featured → Cameo
3. **CAST DETAIL** — 역할, 영향도, 관계 장르, Story, Filmography
4. **TOP CAST** — 내 영화에 가장 큰 영향을 준 출연진

## Visual system

- Canvas: `#101011`
- Surface: `#19191B`, raised surface `#232326`
- Primary text: `#F7F7F5`, secondary text: `#99999F`
- Brand accent: `#F0445D`는 CTA와 상태에만 작게 사용
- 화면의 실제 색은 고정 테마가 아니라 60갑자 Character Still이 담당
- 기본 서체는 현대적인 Sans-serif, 로고만 Serif 허용
- 이미지 16–22px radius, 일반 surface 13–18px, pill은 태그에만 사용
- 장식용 필름·티켓·클래퍼보드·금색·과도한 grain 금지

## Mobile patterns

- 기준 폭 390px, 최대 앱 프레임 440px
- Hero poster 4:5에 가까운 비율, 텍스트는 하단 gradient 위에 배치
- Cast/Filmography는 horizontal rail과 다음 카드 peek으로 스와이프를 암시
- Cast Tier별 카드 크기 차등, 단 모든 Tier에서 인물 이미지 유지
- 고정 하단 내비게이션은 4개 목적지로 제한
- 한글 우선, 영어는 `MAIN CHARACTER`, `CAST`, `GENRE` 같은 metadata에만 사용

## Cast detail order

1. Full visual still
2. 이름 / Cast Tier / Life Role
3. 영향도 점수 및 `N명 중 N위`
4. My Movie Story
5. Relationship Genre + Dynamic tags
6. Filmography carousel
7. Director's Note

사주 원어·오행·합충 설명은 기본 결과에서 제거하고, 추후 `왜 이렇게 나왔나요?` 펼침 영역에서만 제공한다.

## Content rules

- 점수는 `NN점`
- 순위는 `N명 중 N위`, 보조로 `(상위 NN%)`
- `#N` 표기 금지
- 긴 해설보다 이름 → 역할 → 짧은 관계 문장 순으로 스캔 가능해야 함
- 점수는 결과의 주인공이 아니라 마지막 증거로 배치
