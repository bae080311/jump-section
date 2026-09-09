#!/usr/bin/env bash
# 보호 브랜치 패턴의 단일 진실 원천(SSOT).
#
# 이 패턴은 CLAUDE.md "AI 파이프라인 거버넌스" 공통 규칙을 코드로 강제하는 모든 지점에서
# 쓰인다. 이전에는 같은 정규식이 4곳에 하드코딩돼 있었고, 그건
# .claude/flywheel/learnings.md #4("같은 규칙을 두 벌 두고 수동 동기화에 의존해 실제로
# 어긋남")가 기록한 실패 패턴이다. 새 강제 지점을 추가할 때는 패턴을 복사하지 말고 이
# 파일을 source 한다.
#
# 사용법: source "$(dirname "${BASH_SOURCE[0]}")/protected-branches.sh"
PROTECTED_PATTERN='^(main|master|develop|release/.*)$'
