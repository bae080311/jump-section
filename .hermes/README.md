# Hermes Agent 연동 (comment-fix 파일럿)

`/fix-build`, `/fix-lint`, `/fix` PR 코멘트 커맨드의 실제 코드 진단/수정/커밋/PR코멘트를
[Hermes Agent](https://github.com/NousResearch/hermes-agent)가 수행한다. n8n은 트리거 릴레이와
결과 반응(🚀/-1)만 담당한다. 전체 배경/설계 근거는 저장소 루트 `CLAUDE.md`의
"AI 파이프라인 거버넌스" 절을 참고한다.

## 배포

- `.hermes/fly.toml` — n8n(`.n8n/fly.toml`)과 분리된 별도 Fly.io 앱(`jump-section-hermes`, 같은
  `nrt` 리전). 오케스트레이션(n8n, 저위험)과 실제 셸/git-push 실행(Hermes, 고위험)의 블라스트
  레이디어스를 분리하기 위함이다.
- `[http_service]`를 의도적으로 선언하지 않는다 — 8644 포트를 퍼블릭에 노출하지 않고, n8n에서만
  Fly 프라이빗 네트워크(6PN)로 `jump-section-hermes.internal:8644`에 접근한다.
- 터미널 백엔드는 파일럿 단계에서 `local` + `concurrency: 1`. Docker-in-Fly-Machine(Firecracker
  microVM 위 중첩 가상화)의 안정성이 불확실해 1차 도입은 보류했다. 볼륨이 늘어나면
  Docker/Modal/Daytona 기반 per-job 격리를 재검토한다.

## 설정

- `.hermes/config.template.yaml`을 저장소에 커밋해 라우트↔스킬 매핑이 PR 리뷰를 거치게 한다. 실제
  배포 시 환경변수를 치환해 `~/.hermes/config.yaml`로 사용한다.
- 실제 시크릿은 `.hermes/.env`(gitignore 처리, `.n8n/.env`와 동일 패턴)에 둔다. 필요한 값:
  - `HERMES_GATEWAY_PORT`, `HERMES_WEBHOOK_SECRET`, `HERMES_CALLBACK_SECRET`
  - `HERMES_GITHUB_PAT` — 이 파이프라인 전용 fine-grained PAT, 별도 머신 계정으로 발급(기존 n8n용
    `GITHUB_TOKEN`과 분리). 권한: `Contents(RW)`, `Pull requests(RW)`, `Issues(RW)`, `Checks(R)`,
    `Metadata(R)`만. **Administration, Workflows(write), Organization 권한은 절대 부여하지 않는다.**

## 스킬

`.hermes/skills/`에 4개 스킬이 있다: `pr-fix-conventions`(공유 규칙), `fix-build`, `fix-lint`,
`fix-review-comment`. 각 스킬은 Branch → Experiment → Evaluate → Merge/Revert 루프로 구조화되어
있으며, 커밋/푸시는 반드시 `scripts/hermes-safe-push.sh`를 통해서만 수행한다(보호 브랜치/force-push
하드 차단). `pr-fix-conventions`는 `.claude/skills/pr-fix-conventions/SKILL.md`(Claude Code 쪽)와
내용을 동기화한다 — 한쪽을 고치면 다른 쪽도 같이 갱신한다.

Closed learning loop(`curator.enabled: true`, `consolidate: true`)를 켜서 반복되는 CI 에러 패턴에
대해 Hermes가 스스로 파생 스킬을 만들고 통합하도록 허용한다. 주간 `hermes curator run`은
`config.template.yaml`의 `cron` 항목으로 예약되어 있다.

## post-pr-coverage.sh와의 관계

`.claude/scripts/post-pr-coverage.sh`는 Claude Code의 `PostToolUse` 훅으로 `gh pr create`가 포함된
명령이 실행될 때만 발동한다. 이번 파일럿(comment-fix)은 기존에 열려 있는 PR의 head 브랜치에
커밋만 추가하며 `gh pr create`를 호출하지 않으므로 이 훅과 트리거 조건이 겹치지 않는다. Hermes가
향후 새 PR을 만드는 파이프라인(예: 이슈 자동 구현)까지 맡게 되면 이 구분을 다시 검토해야 한다.

## n8n 쪽 설정 (`.n8n/workflows/`)

- `comment-fix-pipeline.json`(재구성)과 `hermes-fix-callback.json`(신규)을 n8n UI에서 Import한다
  (`scripts/n8n-setup.sh` 안내와 동일한 방식).
- n8n 인스턴스(`.n8n/fly.toml` 또는 `.n8n/.env`)에 아래 환경변수가 필요하다:
  - `GITHUB_WEBHOOK_SECRET` — 이미 존재(GitHub Actions -> n8n 서명 검증용, 신규로 실제 사용 시작)
  - `HERMES_BASE_URL` — 예: `http://jump-section-hermes.internal:8644` (Fly 6PN)
  - `HERMES_CALLBACK_URL` — 예: `https://jump-section-n8n.fly.dev/webhook/hermes-fix-callback`
  - `HERMES_WEBHOOK_SECRET`, `HERMES_CALLBACK_SECRET` — 서로 다른 값으로 각각 발급
- GitHub 저장소 Actions Secrets에 `GITHUB_WEBHOOK_SECRET`을 추가해야 `slash-fix.yml`의 서명 계산이
  동작한다(기존에는 `.n8n/.env`에만 있고 Actions 쪽엔 없어서 검증이 아예 안 되던 갭이었다).

## 필수 선행 조건 (배포 전 확인)

1. GitHub 저장소 브랜치 보호 규칙(`main`에 PR 필수 + force-push 금지)이 켜져 있는지 확인 — PAT
   스코프만으로는 `git push origin main`을 막을 수 없는 최종 방어선이다.
2. `.github/workflows/slash-fix.yml`의 n8n 웹훅 호출에 HMAC 서명이 추가되어 있는지 확인
   (`GITHUB_WEBHOOK_SECRET`이 실제로 검증에 쓰이는지 — 이전에는 생성만 되고 쓰이지 않던 갭이었다).

## 알려진 한계 (후속 과제)

- **타임아웃 워치독 미구현**: Hermes가 콜백을 영영 보내지 않는 경우(프로세스 장애 등) 현재는 아무
  반응도 달리지 않는 조용한 실패로 남는다. n8n Data Store 등으로 `correlation_id`를 잠깐 저장해두고
  Wait 노드로 N분 후 미수신 시 "⚠️ 응답 없음" 반응을 다는 보조 워크플로우는 이번 파일럿에는
  포함하지 않았다 — 실제 n8n 인스턴스에서 Data Store 가용 여부를 확인한 뒤 추가한다.
