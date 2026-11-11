// Creates a realistic demo project so judges can see Chesterton work in seconds.
import api, { route } from '@forge/api';

const doc = (...paras) => ({ type: 'doc', version: 1, content: paras.map((t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })) });

async function j(method, path, body) {
  const res = await api.asApp().requestJira(path, {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

export async function seedDemo() {
  const me = await j('GET', route`/rest/api/3/myself`);
  let project;
  try {
    project = await j('GET', route`/rest/api/3/project/PAY`);
  } catch {
    project = await j('POST', route`/rest/api/3/project`, {
      key: 'PAY',
      name: 'Payments',
      projectTypeKey: 'software',
      projectTemplateKey: 'com.pyxis.greenhopper.jira:gh-simplified-kanban-classic',
      leadAccountId: me.accountId,
      assigneeType: 'UNASSIGNED',
    });
  }
  const meta = await j('GET', route`/rest/api/3/issue/createmeta/PAY/issuetypes`);
  const types = (meta.issueTypes ?? meta.values ?? []).map((t) => t.name);
  const pick = (...names) => names.find((n) => types.includes(n)) ?? types.find((t) => t !== 'Epic' && t !== 'Subtask' && t !== 'Sub-task') ?? 'Task';

  const create = async (summary, description, type) =>
    (await j('POST', route`/rest/api/3/issue`, { fields: { project: { key: 'PAY' }, summary, issuetype: { name: type }, description: doc(...description) } })).key;
  const comment = (key, ...text) => j('POST', route`/rest/api/3/issue/${key}/comment`, { body: doc(...text) });
  const link = (inward, outward) => j('POST', route`/rest/api/3/issueLink`, { type: { name: 'Relates' }, inwardIssue: { key: inward }, outwardIssue: { key: outward } });

  const incident = await create('INCIDENT: customers charged twice after card timeout', [
    'Production outage on 14 March. When the card network timed out, our client retried the charge and 312 customers were charged twice.',
    'Rollback at 18:40. Postmortem: retries must be idempotent and wait for the bank before retrying.',
  ], pick('Bug', 'Task'));

  const guard = await create('Keep 2 s wait + idempotency key before retrying card charges', [
    'Adds an idempotency key to every charge and waits 2 seconds before a retry.',
    'This looks slow and odd, but it is intentional: see the linked incident.',
  ], pick('Story', 'Task'));
  await comment(guard, 'We decided to keep the 2 second delay because the bank API rate-limits retries and returns duplicate approvals if we retry faster. Do not remove this without talking to payments on-call.');
  await comment(guard, 'Security review: the idempotency key is also required for PCI compliance logging.');
  await link(incident, guard);

  const cleanup = await create('Clean up: remove the "weird" 2 s sleep in ChargeService to speed up checkout', [
    'Checkout feels slow. ChargeService has a hard-coded 2 second sleep before retries. Can we just delete it?',
  ], pick('Task', 'Story'));
  await link(guard, cleanup);

  const safe = await create('Rename "Pay now" button to "Complete purchase"', ['Copy change requested by marketing.'], pick('Task', 'Story'));

  const decision = await create('Use EUR as base currency for all reports', ['Finance asked for a single base currency.'], pick('Task', 'Story'));
  await comment(decision, 'We agreed on EUR because our acquiring bank settles in EUR; changing this breaks reconciliation.');

  return { project: 'PAY', created: [incident, guard, cleanup, safe, decision], tryThis: cleanup };
}
