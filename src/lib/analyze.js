// Pure analysis logic: turns raw Jira/Confluence data into a "fence report".
// No Forge imports here so it can be unit-tested with node --test.

const DECISION_PATTERNS = [
  /\bwe (?:decided|agreed|chose)\b/i, /\bdecision\b/i, /\bbecause\b/i, /\bthe reason\b/i,
  /\bdo ?n[o']t (?:remove|delete|revert|change)\b/i, /\bworkaround\b/i, /\bon purpose\b/i,
  /\bintentional(?:ly)?\b/i, /\bcompliance\b/i, /\blegal\b/i, /\bsecurity\b/i, /\bper (?:customer|client)\b/i,
];
const INCIDENT_PATTERNS = [/\bincident\b/i, /\boutage\b/i, /\bregress/i, /\bhotfix\b/i, /\brollback\b/i, /\bpostmortem\b/i, /\bsev ?[0-9]\b/i, /\bprod(?:uction)? (?:down|broke|issue)/i];

export function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text ?? '';
  const inner = (node.content ?? []).map(adfToText).join(node.type === 'paragraph' ? '' : ' ');
  return node.type === 'paragraph' || node.type === 'heading' ? inner + '\n' : inner;
}

export function scoreText(text) {
  const t = text ?? '';
  const decision = DECISION_PATTERNS.reduce((n, re) => n + (re.test(t) ? 1 : 0), 0);
  const incident = INCIDENT_PATTERNS.reduce((n, re) => n + (re.test(t) ? 1 : 0), 0);
  return { decision, incident };
}

function snippet(text, max = 240) {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max - 1) + '…' : clean;
}

/**
 * @param {object} input
 * @param {object} input.issue        Jira issue JSON (fields.summary, description, created, reporter, status, issuetype, issuelinks)
 * @param {object[]} input.comments   Jira comments (body ADF, author, created)
 * @param {object[]} input.linked     Linked issues (key, summary, issuetype, status, linkType)
 * @param {object[]} input.pages      Confluence pages (title, excerpt, url)
 * @param {string} input.baseUrl      Site base URL for links
 */
const by = (a) => (a?.displayName && a.accountType !== 'app' ? ` by ${a.displayName}` : '');

export function buildFenceReport({ issue, comments = [], linked = [], pages = [], neighbors = [], baseUrl = '' }) {
  const key = issue?.key ?? '?';
  const f = issue?.fields ?? {};
  const evidence = [];
  const people = new Map();
  const addPerson = (p, why) => {
    if (!p?.accountId || p.accountType === 'app') return; // bots can't explain decisions
    const cur = people.get(p.accountId) ?? { name: p.displayName ?? 'Unknown', reasons: new Set() };
    cur.reasons.add(why);
    people.set(p.accountId, cur);
  };
  addPerson(f.reporter, 'created the issue');
  addPerson(f.assignee, 'assignee');

  const desc = adfToText(f.description);
  const ds = scoreText(desc + ' ' + (f.summary ?? ''));
  if (ds.decision || ds.incident) {
    evidence.push({ kind: ds.incident >= 2 ? 'incident' : 'decision', source: `${key} description`, url: `${baseUrl}/browse/${key}`, date: f.created, text: snippet(desc || f.summary) , weight: ds.decision + 2 * ds.incident });
  }
  for (const c of comments) {
    const text = adfToText(c.body);
    const s = scoreText(text);
    if (s.decision || s.incident) {
      evidence.push({ kind: s.incident >= 2 ? 'incident' : 'decision', source: `${key} comment${by(c.author)}`, url: `${baseUrl}/browse/${key}?focusedCommentId=${c.id}`, date: c.created, text: snippet(text), weight: s.decision + 2 * s.incident });
      addPerson(c.author, 'explained the decision');
    }
  }
  for (const l of linked) {
    const typeName = (l.issuetype ?? '').toLowerCase();
    const s = scoreText(`${l.summary} ${typeName} ${l.linkType}`);
    const isIncident = s.incident > 0 || /incident|bug/.test(typeName);
    evidence.push({ kind: isIncident ? 'incident' : 'related', source: `${l.key} (${l.linkType})`, url: `${baseUrl}/browse/${l.key}`, date: l.created, text: snippet(l.summary, 140), weight: (isIncident ? 3 : 1) + s.decision });
  }
  for (const p of pages) {
    const s = scoreText(`${p.title} ${p.excerpt}`);
    evidence.push({ kind: s.incident ? 'incident' : s.decision ? 'decision' : 'related', source: `Confluence: ${p.title}`, url: p.url, date: p.lastModified, text: snippet(p.excerpt, 200), weight: 1 + s.decision + 2 * s.incident });
  }
  // Second hop: the danger is often one link away (a clean-up ticket linked to a guard that exists because of an incident).
  const seen = new Set([key, ...linked.map((l) => l.key)]);
  for (const n of neighbors) {
    addPerson(n.assignee, `owns ${n.key}`);
    for (const c of n.comments ?? []) {
      const text = adfToText(c.body);
      const s = scoreText(text);
      if (s.decision || s.incident) {
        evidence.push({ kind: s.incident >= 2 ? 'incident' : 'decision', source: `${n.key} comment${by(c.author)} (linked)`, url: `${baseUrl}/browse/${n.key}?focusedCommentId=${c.id}`, date: c.created, text: snippet(text), weight: s.decision + 2 * s.incident });
        addPerson(c.author, `explained the decision on ${n.key}`);
      }
    }
    for (const l of n.linked ?? []) {
      if (seen.has(l.key)) continue;
      seen.add(l.key);
      const typeName = (l.issuetype ?? '').toLowerCase();
      const s = scoreText(`${l.summary} ${typeName}`);
      if (s.incident > 0 || /incident|bug/.test(typeName)) {
        evidence.push({ kind: 'incident', source: `${l.key} (via ${n.key})`, url: `${baseUrl}/browse/${l.key}`, date: l.created, text: snippet(l.summary, 140), weight: 3 });
      }
    }
  }
  evidence.sort((a, b) => b.weight - a.weight);

  const incidents = evidence.filter((e) => e.kind === 'incident').length;
  const decisions = evidence.filter((e) => e.kind === 'decision').length;
  let verdict = 'SAFE TO CHANGE';
  let reason = 'No recorded decision or incident is tied to this work.';
  if (incidents > 0) {
    verdict = 'DO NOT REMOVE YET';
    reason = `${incidents} incident${incidents > 1 ? 's are' : ' is'} linked to this. It was likely put in place to stop that from happening again.`;
  } else if (decisions > 0) {
    verdict = 'CHECK FIRST';
    reason = `${decisions} recorded decision${decisions > 1 ? 's explain' : ' explains'} why this exists. Read ${decisions > 1 ? 'them' : 'it'} before changing.`;
  }

  return {
    key,
    summary: f.summary ?? '',
    status: f.status?.name ?? '',
    created: f.created ?? null,
    verdict,
    reason,
    evidence: evidence.slice(0, 8),
    askPeople: [...people.values()].map((p) => ({ name: p.name, why: [...p.reasons].join(', ') })).slice(0, 5),
    nextStep:
      verdict === 'DO NOT REMOVE YET'
        ? 'Talk to the people listed, check the linked incident, and add a test that covers it before changing anything.'
        : verdict === 'CHECK FIRST'
          ? 'Confirm with the decision owner that the original reason no longer applies, then record the new decision on this issue.'
          : 'Go ahead, and leave a comment explaining your change so the next person knows why.',
  };
}

/** Plain-text note Chesterton pins to the issue so the next person sees the fence without running anything. */
export function fenceNote(r) {
  const lines = [`Chesterton check: ${r.verdict}. ${r.reason}`];
  for (const e of r.evidence.slice(0, 4)) lines.push(`- ${e.kind === 'incident' ? 'Incident' : e.kind === 'decision' ? 'Decision' : 'Related'}: ${e.source}: ${e.text}`);
  if (r.askPeople.length) lines.push(`Ask before changing: ${r.askPeople.map((p) => p.name).join(', ')}.`);
  lines.push(`Next step: ${r.nextStep}`);
  return lines.join('\n');
}
