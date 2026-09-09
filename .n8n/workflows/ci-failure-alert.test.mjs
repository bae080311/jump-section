// ci-failure-alert.json 의 dedup 로직 회귀 테스트. 프레임워크 없이 assert 만 쓴다.
// 실행: node .n8n/workflows/ci-failure-alert.test.mjs
//
// 워크플로우 JSON 에서 Code 노드의 코드를 직접 꺼내 실행하므로 사본이 어긋나지 않는다.
// 이 로직이 틀리면 도입 즉시 과거 실패 전체가 Discord 로 쏟아지거나(기준선 누락),
// 아무것도 알리지 않는다(필터 반전) — 둘 다 조용히 잘못되므로 테스트로 고정한다.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wf = JSON.parse(
  readFileSync(new URL('./ci-failure-alert.json', import.meta.url), 'utf8'),
);

const jsCode = wf.nodes.find((n) => n.type === 'n8n-nodes-base.code').parameters.jsCode;

/** n8n 런타임 전역을 흉내내 Code 노드를 실행한다. */
function run(store, runs) {
  const fn = new Function(
    '$getWorkflowStaticData',
    '$input',
    `return (function(){${jsCode}})()`,
  );
  return fn(
    () => store,
    { first: () => ({ json: { workflow_runs: runs } }) },
  );
}

const mkRun = (id) => ({
  id,
  name: 'CI',
  run_number: id,
  head_branch: 'main',
  event: 'push',
  html_url: `https://example.com/${id}`,
  head_sha: 'abcdef1234',
  head_commit: { message: `commit ${id}\n본문` },
  actor: { login: 'someone' },
  created_at: '2026-09-09T00:00:00Z',
});

let failed = 0;
const check = (desc, fn) => {
  try {
    fn();
    console.log(`  ok   ${desc}`);
  } catch (e) {
    console.log(`  FAIL ${desc}\n       ${e.message}`);
    failed = 1;
  }
};

check('첫 실행: 아무것도 알리지 않고 기준선만 세운다', () => {
  const store = {};
  const out = run(store, [mkRun(30), mkRun(10), mkRun(20)]);
  assert.equal(out.length, 0, '첫 실행에서 알림이 나갔다');
  assert.equal(store.lastSeenRunId, 30, '기준선이 최대 id 가 아니다');
});

check('첫 실행 + 실패 이력 없음: 기준선 0, 알림 없음', () => {
  const store = {};
  const out = run(store, []);
  assert.equal(out.length, 0);
  assert.equal(store.lastSeenRunId, 0);
});

check('새 실패만 알린다', () => {
  const store = { lastSeenRunId: 20 };
  const out = run(store, [mkRun(30), mkRun(25), mkRun(20), mkRun(10)]);
  assert.deepEqual(
    out.map((i) => i.json.runNumber),
    [25, 30],
    '새 실패만, 오래된 것부터 나와야 한다',
  );
  assert.equal(store.lastSeenRunId, 30);
});

check('새 실패가 없으면 조용하다', () => {
  const store = { lastSeenRunId: 30 };
  const out = run(store, [mkRun(30), mkRun(20)]);
  assert.equal(out.length, 0);
  assert.equal(store.lastSeenRunId, 30, '변화가 없으면 기준선도 그대로여야 한다');
});

check('같은 목록을 두 번 폴링해도 한 번만 알린다 (중복 방지)', () => {
  const store = { lastSeenRunId: 10 };
  const runs = [mkRun(20), mkRun(10)];
  assert.equal(run(store, runs).length, 1, '첫 폴링에서 1건이어야 한다');
  assert.equal(run(store, runs).length, 0, '두 번째 폴링에서 중복 알림이 나갔다');
});

check('커밋 메시지는 첫 줄만, 120자로 자른다', () => {
  const store = { lastSeenRunId: 1 };
  const long = mkRun(2);
  long.head_commit.message = `${'가'.repeat(200)}\n두번째 줄`;
  const [item] = run(store, [long]);
  assert.equal(item.json.commitMessage.length, 120);
  assert.ok(!item.json.commitMessage.includes('두번째'));
});

check('head_commit / actor 가 없어도 죽지 않는다', () => {
  const store = { lastSeenRunId: 1 };
  const bare = mkRun(2);
  delete bare.head_commit;
  delete bare.actor;
  const [item] = run(store, [bare]);
  assert.equal(item.json.commitMessage, '');
  assert.equal(item.json.actor, '?');
});

console.log(failed ? '실패한 케이스가 있습니다' : '전체 통과');
process.exit(failed);
