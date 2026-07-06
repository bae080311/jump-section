---
name: fix-lint
version: '1.0.0'
author: jump-section
tags: [jump-section, webhook, prettier, lint]
---

# fix-lint

jump-section 저장소 PR에 `/fix-lint` 코멘트가 달렸을 때(n8n 웹훅 `POST /webhooks/fix-lint`으로
트리거) Prettier 포맷을 적용한다. `.hermes/skills/pr-fix-conventions/SKILL.md`의 규칙을 반드시
따른다. 다른 fix-\* 스킬보다 도구 권한을 더 좁게 제한한다 — 로직 변경 없이 포맷만 수행한다.

## 입력 (webhook payload)

`fix-build`와 동일한 스키마(`correlation_id`, `repo`, `pr`, `branch`, `callback`).

## 절차 (Branch → Experiment → Evaluate → Merge/Revert)

1. **Branch**: `branch.head_ref`를 스크래치 디렉터리에 클론한다.
2. **Experiment**: `pnpm format`을 실행한다. 로직을 변경하는 수정은 하지 않는다 — 오직 포맷팅만.
3. **Evaluate**: `pnpm format`이 diff를 만들었는지 확인하고, `pnpm build && pnpm test`로 회귀가
   없는지 확인한다.
4. **Merge**: diff가 있고 평가를 통과했으면 `scripts/hermes-safe-push.sh <owner> <repo> <head_ref>`로
   커밋(`chore: apply prettier format\n\n<변경 파일 목록>`)하고 push. GitHub MCP로 PR에 코멘트한다.
5. **Revert**: `pnpm format`이 아무 변경도 만들지 않았으면 `status: "no_changes"`. 평가 실패 시
   push하지 않고 `status: "error"`.

## 완료 보고

`pr-fix-conventions` 스킬에 정의된 콜백 curl을 마지막 필수 단계로 정확히 실행한다.
