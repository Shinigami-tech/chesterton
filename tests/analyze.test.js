import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFenceReport, adfToText, scoreText } from '../src/lib/analyze.js';

const adf = (t) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }] });
const alice = { accountId: 'a', displayName: 'Alice' };
const bob = { accountId: 'b', displayName: 'Bob' };

test('adfToText flattens ADF', () => {
  assert.equal(adfToText(adf('hello world')).trim(), 'hello world');
});

test('no evidence => SAFE TO CHANGE', () => {
  const r = buildFenceReport({ issue: { key: 'PAY-1', fields: { summary: 'Rename button', reporter: alice } } });
  assert.equal(r.verdict, 'SAFE TO CHANGE');
  assert.deepEqual(r.askPeople.map((p) => p.name), ['Alice']);
});

test('decision comment => CHECK FIRST and author listed', () => {
  const r = buildFenceReport({
    issue: { key: 'PAY-2', fields: { summary: 'Add 2s retry delay', reporter: alice } },
    comments: [{ id: '10', author: bob, created: '2026-03-01', body: adf('We decided to keep the delay because the bank API rate-limits us.') }],
  });
  assert.equal(r.verdict, 'CHECK FIRST');
  assert.ok(r.askPeople.some((p) => p.name === 'Bob'));
  assert.match(r.evidence[0].url, /focusedCommentId=10/);
});

test('linked incident => DO NOT REMOVE YET, incident ranked first', () => {
  const r = buildFenceReport({
    issue: { key: 'PAY-3', fields: { summary: 'Duplicate charge guard', reporter: alice } },
    comments: [{ id: '1', author: bob, body: adf('this is intentional') }],
    linked: [{ key: 'INC-42', summary: 'Customers charged twice - production outage', issuetype: 'Incident', linkType: 'is caused by' }],
  });
  assert.equal(r.verdict, 'DO NOT REMOVE YET');
  assert.equal(r.evidence[0].source.startsWith('INC-42'), true);
});

test('scoreText detects decision and incident language', () => {
  assert.ok(scoreText("don't remove this, it's a workaround").decision >= 2);
  assert.ok(scoreText('rollback after the outage').incident >= 2);
});

test('clean-up ticket one link away from a guarded fix => DO NOT REMOVE YET', () => {
  const r = buildFenceReport({
    issue: { key: 'PAY-3', fields: { summary: 'Remove the weird 2 s sleep', reporter: alice } },
    linked: [{ key: 'PAY-2', summary: 'Keep 2 s wait', issuetype: 'Story', linkType: 'relates to' }],
    neighbors: [{ key: 'PAY-2', comments: [{ id: '7', author: bob, body: adf('We decided to keep the delay because the bank rate-limits retries.') }],
      linked: [{ key: 'PAY-1', summary: 'INCIDENT: customers charged twice', issuetype: 'Bug' }, { key: 'PAY-3', summary: 'self' }] }],
  });
  assert.equal(r.verdict, 'DO NOT REMOVE YET');
  assert.ok(r.evidence.some((e) => e.source.startsWith('PAY-1 (via PAY-2)')));
  assert.ok(r.askPeople.some((p) => p.name === 'Bob'));
});

test('a description that merely mentions "incident" is not counted as an incident', () => {
  const r = buildFenceReport({ issue: { key: 'X-1', fields: { summary: 'see the linked incident', reporter: alice } } });
  assert.notEqual(r.verdict, 'DO NOT REMOVE YET');
});
