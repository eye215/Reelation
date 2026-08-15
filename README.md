# Reelation MVP

PRD/FRD 기반의 브라우저 실행형 MVP입니다. 외부 의존성 없이 동작합니다.

```bash
python3 server.py
```

브라우저에서 `http://localhost:4173/board`를 엽니다.

## 구현 범위

- Casting Board, Cast 목록/추가/삭제, Person Detail
- 4개 장르 Filmography 및 장르별 화면
- 3명 이상일 때 deterministic Ranking
- 분리된 deterministic 분석/점수/배역 엔진
- 중앙 `SCORING_CONFIG` 기반 float 점수·Genre 공식·roleScore 경쟁
- `saju-v1` / `reelation-v1` 버전과 출생시간 기반 분석 신뢰도
- Invite 링크 활성화/비활성화 및 개인정보 안내
- 반응형 모바일/데스크톱 UI

데이터는 브라우저 `localStorage`에 저장됩니다. 데모 초기화는 My 화면에서 가능합니다.

## 연결된 서비스

- GitHub: `eye215/Reelation`
- Supabase project ref: `gnzcatibyrqbxxdnsdua`

실제 키는 Git에서 제외되는 `.env.local`에 저장됩니다. 새 환경에서는 `.env.example`을 복사해 설정하세요.

## 엔진 테스트

```bash
npm test
```
