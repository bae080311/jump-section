#!/usr/bin/env bash
# PreToolUse hook: 보호 브랜치(main/master/develop/release/**)로의 git push를 차단한다.
# CLAUDE.md "AI 파이프라인 거버넌스" 공통 규칙. GitHub Actions에서 도는 에이전트도 같은 저장소의
# 이 훅을 쓰므로, 로컬 세션과 CI 자율 실행에 동일하게 적용된다.
# 회귀 테스트: bash .claude/scripts/block-protected-push.test.sh
set -euo pipefail

INPUT=$(cat)

if command -v jq &>/dev/null; then
  CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
else
  CMD=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")
fi

# "git ... push ..." 조각을 모두 추출한다. git과 push 사이에 옵션이 끼는 형태(git -C <path> push,
# git --git-dir=... push)도 잡되, &|; 로 구분된 다른 명령까지 넘어가지는 않는다.
SEGMENTS=$(echo "$CMD" | grep -oE 'git[^&|;]*[[:space:]]push([[:space:]][^&|;]*)?' || true)

# push 명령이 없으면 통과
[[ -n "$SEGMENTS" ]] || exit 0

# 보호 브랜치 패턴은 SSOT에서 가져온다 (scripts/protected-branches.sh)
# shellcheck source=scripts/protected-branches.sh
source "$(dirname "${BASH_SOURCE[0]}")/../../scripts/protected-branches.sh"

# 조각이 여러 개면 하나라도 보호 브랜치를 가리키는 순간 차단한다(fail-closed).
while IFS= read -r SEG; do
  [[ -n "$SEG" ]] || continue

  # 강제 푸시 계열은 무조건 차단. 전체 명령($CMD)이 아니라 push 조각($SEG)만 검사한다 —
  # 전체를 보면 "pnpm build -f && (git) push origin feat/x" 처럼 무관한 -f 를 오탐한다.
  # refspec 앞의 + 도 강제 푸시다 (예: push origin +HEAD:feat/x).
  if [[ "$SEG" == *"--force"* \
     || "$SEG" =~ [[:space:]]-f([[:space:]]|$) \
     || "$SEG" =~ [[:space:]]\+[^[:space:]]*: ]]; then
    echo "[block-protected-push] 강제 푸시(--force/-f/+refspec)는 허용되지 않습니다." >&2
    exit 2
  fi

  # --mirror/--all 은 브랜치 인자와 무관하게 모든 ref(보호 브랜치 포함)를 밀어낸다
  if [[ "$SEG" == *"--mirror"* || "$SEG" =~ [[:space:]]--all([[:space:]]|$) ]]; then
    echo "[block-protected-push] --mirror/--all 은 보호 브랜치까지 포함하므로 차단합니다." >&2
    exit 2
  fi

  # 옵션(-u, --tags 등)을 제외한 마지막 인자를 브랜치로 간주
  TARGET_BRANCH=$(echo "$SEG" | tr ' ' '\n' | grep -v '^-' | tail -1 || true)

  # refspec (예: local:remote) 형태인 경우 remote 브랜치만 추출
  TARGET_BRANCH=${TARGET_BRANCH#*:}

  # 브랜치가 명시되지 않은 "git push"/"git push origin" 형태면 현재 체크아웃된 브랜치를 확인
  if [[ -z "$TARGET_BRANCH" || "$TARGET_BRANCH" == "push" || "$TARGET_BRANCH" == "origin" ]]; then
    TARGET_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
  fi

  if [[ "$TARGET_BRANCH" =~ $PROTECTED_PATTERN ]]; then
    echo "[block-protected-push] 보호 브랜치(${TARGET_BRANCH})에는 직접 push할 수 없습니다. PR을 통해 머지하세요." >&2
    exit 2
  fi
done <<< "$SEGMENTS"

exit 0
