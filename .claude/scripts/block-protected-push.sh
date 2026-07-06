#!/usr/bin/env bash
# PreToolUse hook: 보호 브랜치(main/master/develop/release/**)로의 git push를 차단한다.
# CLAUDE.md "AI 파이프라인 거버넌스" 공통 규칙 — Hermes 쪽은 scripts/hermes-safe-push.sh가 동일하게 강제한다.
set -euo pipefail

INPUT=$(cat)

if command -v jq &>/dev/null; then
  CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
else
  CMD=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")
fi

# git push가 포함되지 않은 명령은 통과
if [[ "$CMD" != *"git push"* ]]; then
  exit 0
fi

# --force / --force-with-lease는 무조건 차단
if [[ "$CMD" == *"--force"* ]]; then
  echo "[block-protected-push] --force/--force-with-lease 푸시는 허용되지 않습니다." >&2
  exit 2
fi

PROTECTED_PATTERN='^(main|master|develop|release/.*)$'

# "git push <remote> <branch>" 형태에서 마지막 인자를 브랜치로 간주
TARGET_BRANCH=$(echo "$CMD" | grep -oE 'git push[^&|;]*' | head -1 | awk '{print $NF}')

# 브랜치가 명시되지 않은 "git push"/"git push origin" 형태면 현재 체크아웃된 브랜치를 확인
if [[ -z "$TARGET_BRANCH" || "$TARGET_BRANCH" == "push" || "$TARGET_BRANCH" == "origin" ]]; then
  TARGET_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
fi

if [[ "$TARGET_BRANCH" =~ $PROTECTED_PATTERN ]]; then
  echo "[block-protected-push] 보호 브랜치(${TARGET_BRANCH})에는 직접 push할 수 없습니다. PR을 통해 머지하세요." >&2
  exit 2
fi

exit 0
