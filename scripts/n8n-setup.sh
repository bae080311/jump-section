#!/bin/bash
# jump-section n8n AI Pipeline 초기 설정 스크립트

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
N8N_DIR="$ROOT_DIR/.n8n"

echo "=== jump-section n8n AI Pipeline 설정 ==="
echo ""

# 1. 필수 도구 확인
check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "[ERROR] $1 이(가) 설치되어 있지 않습니다."
    echo "  설치: $2"
    exit 1
  fi
}

check_command docker "https://docs.docker.com/get-docker/"
check_command ngrok "brew install ngrok/ngrok/ngrok"

if ! docker info &>/dev/null; then
  echo "[ERROR] Docker가 실행 중이지 않습니다. Docker Desktop을 시작해주세요."
  exit 1
fi

# 2. .env 파일 확인/생성
ENV_FILE="$N8N_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "[INFO] .n8n/.env 파일을 생성합니다..."
  ENCRYPTION_KEY=$(openssl rand -hex 32)
  cat > "$ENV_FILE" <<EOF
# Anthropic API Key (https://console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-여기에_키_입력

# Google Gemini API Key (https://aistudio.google.com/apikey)
GEMINI_API_KEY=여기에_Gemini_키_입력

# GitHub Fine-grained Personal Access Token
# 필요 권한: contents(RW), issues(RW), pull-requests(RW), metadata(R)
# 발급: https://github.com/settings/tokens?type=beta
GITHUB_TOKEN=ghp_여기에_토큰_입력

# GitHub Webhook Secret (임의 문자열, GitHub Webhook 설정에도 동일하게 입력)
GITHUB_WEBHOOK_SECRET=$(openssl rand -hex 20)

# n8n 설정
N8N_USER=admin
N8N_PASSWORD=changeme123
N8N_ENCRYPTION_KEY=$ENCRYPTION_KEY

# ngrok URL (n8n 시작 후 아래 스크립트가 자동으로 채웁니다)
WEBHOOK_URL=http://localhost:5678
EOF
  echo "[OK] .n8n/.env 파일 생성 완료"
  echo ""
  echo "[!] .n8n/.env 파일을 열어 ANTHROPIC_API_KEY와 GITHUB_TOKEN을 입력해주세요."
  echo "    입력 후 이 스크립트를 다시 실행하세요."
  echo ""
  echo "    파일 위치: $ENV_FILE"
  exit 0
fi

# 3. API 키 입력 여부 확인
source "$ENV_FILE"
if [[ "$ANTHROPIC_API_KEY" == sk-ant-여기에* ]] || [[ "$GITHUB_TOKEN" == ghp_여기에* ]] || [[ "$GEMINI_API_KEY" == 여기에* ]]; then
  echo "[ERROR] .n8n/.env 파일에 실제 API 키를 입력해주세요."
  echo "  파일 위치: $ENV_FILE"
  exit 1
fi

# 4. n8n 시작
echo "[1/4] n8n Docker 컨테이너 시작..."
cd "$N8N_DIR"
docker compose up -d
echo "[OK] n8n 시작 완료"

# 5. ngrok 터널 시작
echo "[2/4] ngrok 터널 시작..."
pkill -f "ngrok http 5678" 2>/dev/null || true
ngrok http 5678 --log=stdout >/tmp/jump-section-ngrok.log 2>&1 &
NGROK_PID=$!

# ngrok이 준비될 때까지 대기
for i in {1..10}; do
  sleep 1
  NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tunnels = data.get('tunnels', [])
    https = [t for t in tunnels if t['proto'] == 'https']
    print(https[0]['public_url'] if https else tunnels[0]['public_url'] if tunnels else '')
except: print('')
" 2>/dev/null)
  if [ -n "$NGROK_URL" ]; then
    break
  fi
done

if [ -z "$NGROK_URL" ]; then
  echo "[ERROR] ngrok URL을 가져올 수 없습니다. ngrok 계정 인증을 확인해주세요:"
  echo "  ngrok config add-authtoken YOUR_TOKEN"
  echo "  (토큰 발급: https://dashboard.ngrok.com)"
  kill $NGROK_PID 2>/dev/null
  exit 1
fi

echo "[OK] ngrok URL: $NGROK_URL"

# 6. docker-compose.yml의 WEBHOOK_URL 업데이트
echo "[3/4] WEBHOOK_URL 업데이트..."
sed -i '' "s|WEBHOOK_URL=.*|WEBHOOK_URL=$NGROK_URL|" "$ENV_FILE"
docker compose up -d
echo "[OK] n8n 재시작 완료 (WEBHOOK_URL 적용)"

# 7. 설정 완료 안내
echo ""
echo "[4/4] 설정 완료!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " n8n UI: http://localhost:5678"
echo " 아이디: ${N8N_USER:-admin} / 비밀번호: ${N8N_PASSWORD:-changeme123}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "다음 단계:"
echo ""
echo "1. n8n UI 접속 → Credentials 등록"
echo "   [Claude API]  (Credential 이름: Claude API)"
echo "   - Type: Header Auth"
echo "   - Name: x-api-key"
echo "   - Value: $ANTHROPIC_API_KEY"
echo "   - (추가 헤더) anthropic-version: 2023-06-01"
echo ""
echo "   [Gemini API]  (Credential 이름: Gemini API)"
echo "   - Type: Query Auth"
echo "   - Name: key"
echo "   - Value: $GEMINI_API_KEY"
echo ""
echo "   [GitHub Token]  (Credential 이름: GitHub Token)"
echo "   - Type: Header Auth"
echo "   - Name: Authorization"
echo "   - Value: Bearer $GITHUB_TOKEN"
echo ""
echo "2. n8n UI → Import Workflow (3개 파일)"
echo "   - .n8n/workflows/planning-pipeline.json"
echo "   - .n8n/workflows/development-pipeline.json"
echo "   - .n8n/workflows/code-review-pipeline.json"
echo ""
echo "3. GitHub Repository 설정"
echo "   Webhooks (Settings → Webhooks):"
echo "   - $NGROK_URL/webhook/issue-labeled  (Events: Issues)"
echo "   - $NGROK_URL/webhook/pr-review      (Events: Pull requests)"
echo ""
echo "   Labels (Settings → Labels):"
echo "   - ai-implement   (AI 개발 파이프라인 트리거)"
echo "   - ai-proposal    (AI 기획 생성 이슈)"
echo "   - ai-implementing (처리 중 표시)"
echo ""
echo "⚠️  ngrok 무료 플랜은 재시작 시 URL이 변경됩니다."
echo "    재시작 후 이 스크립트를 다시 실행하고 GitHub Webhook URL을 업데이트하세요."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
