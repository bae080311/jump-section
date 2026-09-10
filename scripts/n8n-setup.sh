#!/usr/bin/env bash
# 로컬 n8n 부트스트랩. 관측·알림 워크플로우(.n8n/workflows/)만 돌리는 용도다.
#
# 저장소를 바꾸는 자동화는 GitHub Actions 가 맡는다(.github/workflows/). n8n 은 GitHub
# Actions 가 구조적으로 못 하는 일 하나를 담당한다 — 워크플로우마다 알림 스텝을 심지 않고
# 한 곳에서 모든 실패를 관측하는 것.
#
# 터널(ngrok)은 필요 없다. 모든 워크플로우가 GitHub API 를 폴링하는 outbound 방식이다.
set -euo pipefail

N8N_DIR="$(cd "$(dirname "$0")/.." && pwd)/.n8n"
ENV_FILE="$N8N_DIR/.env"

command -v docker >/dev/null || { echo "[ERROR] docker 가 필요합니다." >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "[ERROR] docker compose 가 필요합니다." >&2; exit 1; }

# ── 1. .env 생성 (없을 때만)
if [ ! -f "$ENV_FILE" ]; then
  echo "[1/3] .n8n/.env 생성"
  cat > "$ENV_FILE" <<EOF
# n8n 크리덴셜 암호화 키. 한 번 정하면 바꾸지 않는다 — 바꾸면 저장된 크리덴셜을 못 읽는다.
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)

# GitHub Personal Access Token (fine-grained). 필요 권한은 읽기 전용이다:
#   Actions(Read), Metadata(Read)
# n8n 은 저장소를 수정하지 않으므로 쓰기 권한을 주지 않는다.
# 발급: https://github.com/settings/tokens?type=beta
GITHUB_TOKEN=여기에_토큰_입력

# Discord 채널 웹훅 URL (채널 설정 → 연동 → 웹훅)
DISCORD_WEBHOOK_URL=여기에_웹훅_URL_입력
EOF
  echo "    생성됨: $ENV_FILE"
  echo ""
  echo "[!] GITHUB_TOKEN 과 DISCORD_WEBHOOK_URL 을 입력한 뒤 이 스크립트를 다시 실행하세요."
  exit 0
fi

# ── 2. 값 확인
# shellcheck source=/dev/null
set -a; source "$ENV_FILE"; set +a
for v in GITHUB_TOKEN DISCORD_WEBHOOK_URL; do
  if [ -z "${!v:-}" ] || [[ "${!v}" == 여기에* ]]; then
    echo "[ERROR] $ENV_FILE 의 $v 를 실제 값으로 채워주세요." >&2
    exit 1
  fi
done
echo "[1/3] .env 확인 완료"

# ── 3. 기동
echo "[2/3] 컨테이너 기동"
docker compose --project-directory "$N8N_DIR" up -d

echo "[3/3] 대기"
for _ in $(seq 1 30); do
  if curl -sf -o /dev/null http://127.0.0.1:5678/healthz 2>/dev/null; then
    echo "    n8n 응답 확인"
    break
  fi
  sleep 2
done

cat <<'GUIDE'

──────────────────────────────────────────────
 n8n UI: http://127.0.0.1:5678   (루프백 전용)
──────────────────────────────────────────────

다음 단계:

1. UI 접속 → 최초 1회 계정 생성 (로컬 전용이라 외부에서 접근 불가)

2. Import from File 로 워크플로우를 가져온다:
     .n8n/workflows/ci-failure-alert.json

3. Import 후 반드시 Activate 한다. Import ≠ Activate 다.

4. 크리덴셜은 등록하지 않는다 — 노드가 $env.* 를 .n8n/.env 에서 직접 읽는다.

동작 확인:
  - 워크플로우를 열고 "Execute Workflow" 를 눌러 수동 실행한다.
  - 첫 실행은 의도적으로 아무 알림도 보내지 않는다(과거 실패 전체가 쏟아지지 않게
    기준선만 세운다). 두 번째 실행부터 새 실패만 Discord 로 간다.
  - dedup 로직 회귀 테스트: node .n8n/workflows/ci-failure-alert.test.mjs

맥이 꺼져 있는 동안에는 알림이 지연된다(유실되지는 않는다 — 폴링이라 다음 기동 때
못 본 실패를 따라잡는다).
GUIDE
