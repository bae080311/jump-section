#!/usr/bin/env bash
# post-pr-coverage.sh 회귀 테스트. 프레임워크 없이 문자열/종료코드만 검증한다.
# 실행: bash .claude/scripts/post-pr-coverage.test.sh
#
# 훅 전체를 돌리지 않는다(coverage+build+bench 를 실행해 몇 분 걸린다). 실제로 깨졌던
# 두 가지만 고정한다:
#   1. 벤치 추출이 실측값을 버렸다 — PR 코멘트의 Benchmark 섹션이 넉 달간 비어 있었고,
#      ANSI 코드만 확인하고 데이터 누락을 놓쳤다.
#   2. 파이프라인이 set -e 로 조용히 중단됐다 — 훅이 안 돈 것과 구별되지 않았다.
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1

HOOK=.claude/scripts/post-pr-coverage.sh
FAILED=0
check() {
  local desc=$1 fn=$2
  if eval "$fn"; then
    printf '  ok   %s\n' "$desc"
  else
    printf '  FAIL %s\n' "$desc"
    FAILED=1
  fi
}

# vitest 4 의 실제 `pnpm bench` 출력 형태. 실측 행은 `·` 로 시작하고 비교 요약은
# `N.NNx faster than` 이다 — 둘 다 'bench'/'ops/sec'/'✓' 를 포함하지 않아서,
# 그 패턴으로 grep 하면 표가 통째로 사라진다.
FIXTURE=$(
  cat <<'EOF'
> jump-section@1.0.0 bench /repo
> vitest bench --run

 RUN  v4.0.16 /repo

 ✓ packages/core/src/__bench__/ScrollManager.bench.ts > ScrollManager 벤치마크 11364ms
     name                            hz     min     max    mean     rme   samples
   · registerSection       1,795,078.17  0.0004  2.8685  0.0006  ±1.14%    897540
   · getActiveId          50,897,820.27  0.0000  0.0146  0.0000  ±0.06%  25448911

 BENCH  Summary

  getActiveId - packages/core/src/__bench__/ScrollManager.bench.ts
    2.62x faster than registerSection
EOF
)

# ── 1. 추출 로직이 실측값을 살려두는가
extract() { printf '%s\n' "$FIXTURE" | tail -24; }

check '추출 결과에 hz 수치가 남는다' \
  '[[ "$(extract)" == *"50,897,820.27"* ]]'
check '추출 결과에 표 헤더가 남는다' \
  '[[ "$(extract)" == *"hz"* ]]'
check '추출 결과에 비교 요약이 남는다' \
  '[[ "$(extract)" == *"faster than"* ]]'

# 회귀 방지: 옛 grep 패턴을 되살리면 위 세 줄이 전부 사라진다는 것을 못박는다.
old_filter() { printf '%s\n' "$FIXTURE" | grep -E "(bench|ops/sec|✓|×)" || true; }
check '옛 grep 패턴은 실측값을 버렸다 (재도입 금지 근거)' \
  '[[ "$(old_filter)" != *"50,897,820.27"* ]]'

# ── 2. 조용한 중단 방지 장치가 스크립트에 남아 있는가
check 'ERR trap 이 있다 (중단이 stderr 에 드러난다)' \
  'grep -q "trap .*ERR" "$HOOK"'
check 'NO_COLOR 를 스크립트 전체에 export 한다' \
  'grep -qE "^export NO_COLOR=1 FORCE_COLOR=0" "$HOOK"'
# 주석은 제외한다 — 왜 뺐는지 설명하려고 옛 패턴을 본문에 적어두고 있다.
check '벤치 추출에 grep 패턴 필터를 쓰지 않는다 (주석 제외)' \
  '! grep -vE "^[[:space:]]*#" "$HOOK" | grep -qE "grep -E .\(bench"'

# ── 3. 게이트: gh pr create 가 아닌 명령은 아무 일도 하지 않고 통과
gate() {
  printf '{"tool_input":{"command":"ls -la"}}' | bash "$HOOK" >/dev/null 2>&1
}
check 'gh pr create 가 아니면 즉시 종료(exit 0)' 'gate'

if [[ $FAILED -eq 0 ]]; then
  echo "전체 통과"
else
  echo "실패한 케이스가 있습니다"
fi
exit $FAILED
