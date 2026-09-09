#!/usr/bin/env bash
# block-protected-push.sh 회귀 테스트. 프레임워크 없이 exit code만 검증한다.
# 실행: bash .claude/scripts/block-protected-push.test.sh
#
# 보호 브랜치 가드는 보안 경계이므로, 파싱을 고칠 때마다 여기에 케이스를 추가한다.
cd "$(dirname "$0")/../.." || exit 1

HOOK=.claude/scripts/block-protected-push.sh
FAILED=0

# expect_exit <기대코드> <설명> <명령>
expect_exit() {
  local want=$1 desc=$2 cmd=$3 got
  got=$(printf '{"tool_input":{"command":%s}}' "$(printf '%s' "$cmd" | python3 -c 'import sys,json;print(json.dumps(sys.stdin.read()))')" \
    | bash "$HOOK" >/dev/null 2>&1; echo $?)
  if [[ "$got" == "$want" ]]; then
    printf '  ok   %-52s (exit %s)\n' "$desc" "$got"
  else
    printf '  FAIL %-52s (기대 %s, 실제 %s)\n' "$desc" "$want" "$got"
    FAILED=1
  fi
}

echo "차단(exit 2) 되어야 하는 경우:"
expect_exit 2 '보호 브랜치 직접 push'        'git push origin main'
expect_exit 2 'release/* 브랜치'             'git push origin release/1.0'
expect_exit 2 'refspec 로 우회'              'git push origin HEAD:main'
expect_exit 2 '트레일링 옵션 뒤 보호 브랜치'  'git push origin develop --tags'
expect_exit 2 '--force 플래그'               'git push --force origin feat/x'
expect_exit 2 '-f 단축 플래그'                'git push -f origin feat/x'
expect_exit 2 'git -C 로 우회'               'git -C . push origin main'
expect_exit 2 'git --git-dir 로 우회'        'git --git-dir=.git push origin master'
expect_exit 2 '체인 뒤쪽에 숨은 보호 push'    'pnpm test && git push origin main'
expect_exit 2 '앞 조각이 오탐이어도 뒤를 검사' 'git commit -m "will push later" && git push origin main'
expect_exit 2 '+refspec 강제 푸시'            'git push origin +HEAD:feat/x'
expect_exit 2 '--mirror 는 모든 ref 를 밀어냄' 'git push --mirror origin'
expect_exit 2 '--all 은 모든 브랜치를 밀어냄'  'git push --all origin'

echo "통과(exit 0) 되어야 하는 경우:"
expect_exit 0 'push 아님'                    'ls -la'
expect_exit 0 'push 없는 git 명령'            'git status'
expect_exit 0 '일반 기능 브랜치'              'git push origin feat/my-feature'
expect_exit 0 'ai/* 브랜치 upstream 설정'     'git push -u origin ai/issue-42-foo'
expect_exit 0 '브랜치명에 push 포함'          'git push origin feat/main-push'
# push 조각이 아닌 곳의 -f 는 강제 푸시가 아니다 (조각 단위로 검사해야 통과한다)
expect_exit 0 '무관한 -f 뒤의 정상 push'      'pnpm build -f && git push origin feat/x'
expect_exit 0 'rm -f 뒤의 정상 push'          'rm -f tmp.log && git push origin feat/x'

# 현재 체크아웃 브랜치 폴백: 보호 브랜치 위에서 인자 없는 push는 막혀야 한다
# 보호 브랜치 패턴은 SSOT에서 가져온다 — 테스트가 자체 사본을 갖지 않도록
# shellcheck source=scripts/protected-branches.sh
source scripts/protected-branches.sh
CURRENT=$(git branch --show-current 2>/dev/null || echo '')
if [[ "$CURRENT" =~ $PROTECTED_PATTERN ]]; then
  expect_exit 2 "인자 없는 push (현재=$CURRENT)" 'git push'
else
  expect_exit 0 "인자 없는 push (현재=$CURRENT)" 'git push'
fi

if [[ $FAILED -eq 0 ]]; then
  echo "전체 통과"
else
  echo "실패한 케이스가 있습니다"
fi
exit $FAILED
