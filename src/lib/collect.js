// Fetches the raw history around an issue from Jira and Confluence (as the calling user).
import api, { route } from '@forge/api';

async function json(res) {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

function mapLinks(issue) {
  return (issue.fields?.issuelinks ?? []).map((l) => {
    const other = l.outwardIssue ?? l.inwardIssue;
    return {
      key: other?.key,
      summary: other?.fields?.summary ?? '',
      issuetype: other?.fields?.issuetype?.name ?? '',
      status: other?.fields?.status?.name ?? '',
      linkType: l.outwardIssue ? l.type?.outward : l.type?.inward,
    };
  }).filter((l) => l.key);
}

export async function collectHistory(issueKey) {
  const jira = api.asApp().requestJira;
  const issue = await json(
    await jira(route`/rest/api/3/issue/${issueKey}?fields=summary,description,status,issuetype,created,reporter,assignee,issuelinks`),
  );
  const comments = (await json(await jira(route`/rest/api/3/issue/${issueKey}/comment?maxResults=100&orderBy=created`))).comments ?? [];

  const linked = mapLinks(issue);

  // One more hop through linked issues (max 5) to catch "guard -> incident" chains.
  const neighbors = await Promise.all(linked.slice(0, 5).map(async (l) => {
    try {
      const ni = await json(await jira(route`/rest/api/3/issue/${l.key}?fields=summary,issuetype,issuelinks`));
      const nc = (await json(await jira(route`/rest/api/3/issue/${l.key}/comment?maxResults=50`))).comments ?? [];
      return { key: l.key, comments: nc, linked: mapLinks(ni) };
    } catch {
      return { key: l.key, comments: [], linked: [] };
    }
  }));

  let pages = [];
  try {
    const cql = `text ~ "${issueKey}" order by lastmodified desc`;
    const res = await api.asApp().requestConfluence(route`/wiki/rest/api/search?cql=${cql}&limit=5`);
    if (res.ok) {
      const body = await res.json();
      const base = body._links?.base ?? '';
      pages = (body.results ?? []).map((r) => ({
        title: r.content?.title ?? r.title ?? 'Untitled',
        excerpt: (r.excerpt ?? '').replace(/@@@(end)?hl@@@/g, ''),
        url: base + (r.url ?? r.content?._links?.webui ?? ''),
        lastModified: r.lastModified,
      }));
    }
  } catch {
    // Confluence not available on this site: continue with Jira only.
  }

  const self = issue.self ?? '';
  const baseUrl = self.split('/rest/')[0];
  return { issue, comments, linked, pages, neighbors, baseUrl };
}
