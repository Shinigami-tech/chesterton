import Resolver from '@forge/resolver';
import { collectHistory } from './lib/collect';
import { buildFenceReport } from './lib/analyze';
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

// Jira issue panel resolver
const resolver = new Resolver();
resolver.define('getReport', async ({ context }) => {
  const issueKey = context?.extension?.issue?.key;
  if (!issueKey) return { error: 'No issue in context.' };
  return buildFenceReport(await collectHistory(issueKey));
});
resolver.define('seedDemo', async () => {
  try {
    return await seedDemo();
  } catch (e) {
    return { error: String(e?.message ?? e) };
  }
});
export const handler = resolver.getDefinitions();
