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
  assert.equal(out.length, 1, '여러 건이어도 메시지는 1개여야 한다');
  assert.deepEqual(
    out[0].json.embeds.map((e) => e.footer.text),
    ['jump-section • run #25', 'jump-section • run #30'],
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

// ── 임베드 조립. 이전에는 HTTP 노드의 551자 한 줄 표현식이라 테스트가 불가능했다.
const embedOf = (item) => item.json.embeds[0];

check('Discord 임베드 형태로 나온다', () => {
  const [item] = run({ lastSeenRunId: 1 }, [mkRun(2)]);
  const e = embedOf(item);
  assert.equal(item.json.embeds.length, 1);
  assert.equal(item.json.content, undefined, '넘치지 않으면 content 를 붙이지 않는다');
  assert.equal(e.title, '🔴 CI 실패');
  assert.equal(e.url, 'https://example.com/2');
  assert.equal(e.color, 15158332);
  assert.deepEqual(
    e.fields.map((f) => f.name),
    ['브랜치', '트리거', '실행자'],
  );
  assert.equal(e.footer.text, 'jump-section • run #2');
});

check('description 은 짧은 sha + 커밋 첫 줄', () => {
  const [item] = run({ lastSeenRunId: 1 }, [mkRun(2)]);
  assert.equal(embedOf(item).description, '`abcdef1` commit 2');
});

check('커밋 메시지는 첫 줄만, 120자로 자른다', () => {
  const long = mkRun(2);
  long.head_commit.message = `${'가'.repeat(200)}\n두번째 줄`;
  const [item] = run({ lastSeenRunId: 1 }, [long]);
  const desc = embedOf(item).description;
  assert.ok(!desc.includes('두번째'), '두 번째 줄이 섞였다');
  assert.equal(desc.split('` ')[1].length, 120);
});

check('head_commit / actor 가 없어도 죽지 않는다', () => {
  const bare = mkRun(2);
  delete bare.head_commit;
  delete bare.actor;
  const [item] = run({ lastSeenRunId: 1 }, [bare]);
  const e = embedOf(item);
  assert.equal(e.description, '`abcdef1` ');
  assert.equal(e.fields.find((f) => f.name === '실행자').value, '?');
});

check('여러 건이 한꺼번에 깨져도 HTTP 호출은 1회 (묶기)', () => {
  const runs = [5, 4, 3, 2].map(mkRun);
  const out = run({ lastSeenRunId: 1 }, runs);
  assert.equal(out.length, 1, 'item 이 여러 개면 HTTP 노드가 그만큼 호출된다');
  assert.equal(out[0].json.embeds.length, 4);
});

check('임베드 10개를 넘으면 잘렸다는 사실을 알린다', () => {
  const runs = Array.from({ length: 13 }, (_, i) => mkRun(100 + i));
  const [item] = run({ lastSeenRunId: 1 }, runs);
  assert.equal(item.json.embeds.length, 10, 'Discord 상한은 임베드 10개다');
  assert.match(item.json.content, /13건 중 10건/);
  assert.match(item.json.content, /\+3건/);
});

console.log(failed ? '실패한 케이스가 있습니다' : '전체 통과');
process.exit(failed);
