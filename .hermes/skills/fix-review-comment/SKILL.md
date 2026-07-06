---
name: fix-review-comment
version: '1.0.0'
author: jump-section
tags: [jump-section, webhook, review]
---

# fix-review-comment

jump-section 저장소 PR 리뷰 코멘트에 `/fix`로 답장이 달렸을 때(n8n 웹훅 `POST /webhooks/fix`으로
트리거) 리뷰 코멘트의 의도를 반영해 코드를 수정한다. `.hermes/skills/pr-fix-conventions/SKILL.md`의
규칙을 반드시 따른다.

## 입력 (webhook payload)

```json
{
  "correlation_id": "cf-...",
  "command": "fix",
  "repo": { "owner": "...", "name": "...", "clone_url": "..." },
  "pr": { "number": 0, "title": "...", "url": "..." },
  "branch": { "head_ref": "...", "head_sha": "..." },
  "comment": { "id": 0, "path": "...", "in_reply_to_id": 0 },
  "callback": { "url": "...", "secret_env": "HERMES_CALLBACK_SECRET" }
}
```

## 절차 (Branch → Experiment → Evaluate → Merge/Revert)

1. **Branch**: `branch.head_ref`를 스크래치 디렉터리에 클론한다.
2. **Experiment**: GitHub MCP로 `comment.in_reply_to_id` 원본 리뷰 코멘트(본문, `diff_hunk`,
   `comment.path`)와 PR의 다른 변경 파일을 조회한다. 코멘트 의도가 명확하고 수정 방향이 확실한
   경우에만 수정한다. 모호하면 수정하지 않고 그 이유를 답장에 남긴다. 여러 파일에 걸친 수정이
   필요하면 모두 모아 한 번에 처리한다.
3. **Evaluate**: `pnpm format && pnpm build && pnpm test`. 실패하면 재진단(최대 3회).
4. **Merge**: 통과 시 `scripts/hermes-safe-push.sh <owner> <repo> <head_ref>`로 커밋(`fix: apply
review comment suggestion\n\n<변경 요약>`)하고 push. GitHub MCP(리뷰 코멘트 답장 API)로
   `comment.id`에 답장한다.
5. **Revert**: 의도가 불명확하거나 evaluate가 계속 실패하면 push하지 않고 `status: "error"`로
   보고하며, 답장으로 이유를 남긴다.

## 완료 보고

`pr-fix-conventions` 스킬에 정의된 콜백 curl을 마지막 필수 단계로 정확히 실행한다.
