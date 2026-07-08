#!/usr/bin/env bash
# Hermes 전용 안전 push 래퍼. fix-build/fix-lint/fix-review-comment 스킬은 커밋/푸시를
# 반드시 이 스크립트로만 수행한다 (프롬프트 지시만으로는 보안 경계가 되지 않는다).
#
# 사용법: scripts/hermes-safe-push.sh <owner> <repo> <branch>
# 반드시 대상 브랜치를 체크아웃한 클론 디렉터리 안에서(cwd) 실행한다.
set -euo pipefail

OWNER="${1:?owner 필요}"
REPO="${2:?repo 필요}"
BRANCH="${3:?branch 필요}"

PROTECTED_PATTERN='^(main|master|develop|release/.*)$'
if [[ "$BRANCH" =~ $PROTECTED_PATTERN ]]; then
  echo "[hermes-safe-push] 보호 브랜치(${BRANCH})에는 push할 수 없습니다." >&2
  exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  echo "[hermes-safe-push] 현재 체크아웃된 브랜치(${CURRENT_BRANCH})가 대상 브랜치(${BRANCH})와 다릅니다." >&2
  exit 1
fi

# 다른 저장소로 오발송되는 것을 방지 (payload 검증 원칙: 내용은 신뢰하지 않는다)
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
REMOTE_URL_LOWER=$(echo "$REMOTE_URL" | tr '[:upper:]' '[:lower:]')
EXPECTED_LOWER=$(echo "${OWNER}/${REPO}" | tr '[:upper:]' '[:lower:]')
if [[ "$REMOTE_URL_LOWER" != *"$EXPECTED_LOWER"* ]]; then
  echo "[hermes-safe-push] origin(${REMOTE_URL})이 예상 저장소(${OWNER}/${REPO})와 일치하지 않습니다." >&2
  exit 1
fi

# --force 계열은 이 스크립트에서 절대 사용하지 않는다 (fast-forward만 허용)
git push origin "$BRANCH"
