---
name: pr-fix-conventions
version: '1.0.0'
author: jump-section
tags: [jump-section, conventions, shared]
---

# PR 수정 컨벤션 (jump-section)

`fix-build`, `fix-lint`, `fix-review-comment` 스킬이 공유하는 규칙이다. 이 문서는
`.claude/skills/pr-fix-conventions/SKILL.md`(Claude Code 쪽)와 내용을 동기화한다 — 한쪽을 고치면
다른 쪽도 반드시 같이 갱신한다. 이 저장소를 자동으로 수정하는 모든 주체(Claude Code 세션, Hermes
자신)는 이 컨벤션을 동일하게 따른다.

## 브랜치 규칙

- **오직 요청 payload로 받은 head 브랜치에만** 커밋한다. `main`, `master`, `develop`, `release/**`
  패턴에는 절대 checkout/commit/push하지 않는다.
- 커밋/푸시는 반드시 `scripts/hermes-safe-push.sh`를 통해서만 한다. 이 스크립트가 브랜치 패턴과
  `--force` 플래그를 하드 체크한다 — 이 프롬프트의 지시만으로는 보안 경계가 되지 않는다.

## 코드 컨벤션 (CLAUDE.md 발췌)

- TypeScript strict mode 준수, `any` 타입 사용 금지
- Prettier: 2 스페이스, 세미콜론, 싱글쿼트, `printWidth: 100`, `trailingComma: 'all'`
- Public API 하위 호환성 유지 — 시그니처 제거/변경 금지

## 절차: Branch → Experiment → Evaluate → Merge/Revert

모든 fix-\* 스킬은 이 루프로 구조화한다:

1. **Branch** — payload로 받은 head 브랜치를 기준으로 스크래치 워킹 디렉터리에 클론한다(실제 PR
   브랜치를 직접 건드리지 않는다).
2. **Experiment** — GitHub MCP로 PR/체크런/리뷰 코멘트를 직접 조회해 원인을 진단하고 수정을
   시도한다.
3. **Evaluate** — `pnpm format && pnpm build && pnpm test`를 실행한다. 실패하면 2번으로 돌아가
   원인을 다시 진단한다(최대 재시도 횟수 초과 시 포기).
4. **Merge** — 평가를 통과했을 때만 `scripts/hermes-safe-push.sh`로 실제 head 브랜치에 커밋/푸시하고,
   GitHub MCP로 PR 코멘트를 남긴다.
5. **Revert** — 평가에 계속 실패하면 스크래치 작업물을 버리고 push하지 않는다. `status: "error"`로
   보고한다. 애초에 고칠 내용이 없었다면 `status: "no_changes"`로 보고한다.

## 완료 보고 (콜백)

작업의 마지막 필수 단계로, 다음 형식의 `curl`을 정확히 실행해 n8n에 결과를 보고한다(정확한 URL/시크릿은
각 스킬의 payload에 포함되어 전달된다):

```
curl -s -X POST "$CALLBACK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Hermes-Callback-Secret: $CALLBACK_SECRET" \
  -d '{
    "correlation_id": "...",
    "command": "fix-build|fix-lint|fix",
    "repo": {"owner": "...", "name": "..."},
    "comment": {"id": 0},
    "status": "success|no_changes|error",
    "commit": {"sha": "...", "changed_files": [...]},
    "error": null
  }'
```

`repo`/`comment.id`는 원래 요청 payload에서 그대로 echo한다 — n8n이 별도 상태 저장 없이 어느
코멘트에 반응(🚀/-1)을 달아야 하는지 이 필드만으로 알 수 있게 하기 위함이다. `command`가 `fix`이면
리뷰 코멘트 답장(`createForPullRequestReviewComment`)이고, 그 외(`fix-build`/`fix-lint`)는 일반 PR
코멘트(`createForIssueComment`)다.

이 curl을 빠뜨리면 n8n 쪽에 결과가 전혀 전달되지 않는다 — 반드시 마지막에 실행한다.
