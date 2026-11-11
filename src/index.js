import Resolver from '@forge/resolver';
import { collectHistory, pinNote } from './lib/collect';
import { buildFenceReport, fenceNote } from './lib/analyze';
import { seedDemo } from './lib/seed';

const KEY_RE = /^[A-Z][A-Z0-9_]+-\d+$/;

// Rovo action: find-why-it-exists
export async function findWhy(payload) {
  const issueKey = String(payload?.issueKey ?? payload?.context?.jira?.issueKey ?? '').trim().toUpperCase();
  if (!KEY_RE.test(issueKey)) {
    return { error: 'Please give a Jira issue key like PROJ-123.' };
  }
  const report = buildFenceReport(await collectHistory(issueKey));
  return report;
}

// Rovo action / MCP tool: pin-fence
export async function pinFence(payload) {
  const issueKey = String(payload?.issueKey ?? payload?.context?.jira?.issueKey ?? '').trim().toUpperCase();
  if (!KEY_RE.test(issueKey)) {
    return { error: 'Please give a Jira issue key like PROJ-123.' };
  }
  const report = buildFenceReport(await collectHistory(issueKey));
  await pinNote(issueKey, fenceNote(report));
  return { pinned: true, issueKey, verdict: report.verdict };
}

// Jira issue panel resolver
const resolver = new Resolver();
resolver.define('getReport', async ({ context }) => {
  const issueKey = context?.extension?.issue?.key;
  if (!issueKey) return { error: 'No issue in context.' };
  return buildFenceReport(await collectHistory(issueKey));
});
resolver.define('pinNote', async ({ context }) => {
  const issueKey = context?.extension?.issue?.key;
  if (!issueKey) return { error: 'No issue in context.' };
  try {
    const report = buildFenceReport(await collectHistory(issueKey));
    await pinNote(issueKey, fenceNote(report));
    return { ok: true };
  } catch (e) {
    return { error: String(e?.message ?? e) };
  }
});
resolver.define('seedDemo', async ({ context }) => {
  try {
    return await seedDemo(context?.accountId);
  } catch (e) {
    return { error: String(e?.message ?? e) };
  }
});
export const handler = resolver.getDefinitions();
