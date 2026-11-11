# 🚧 Chesterton — know why it exists before you remove it

> *"Don't take down a fence until you know why it was put up."* (G. K. Chesterton)

Every team has a "weird" 2-second sleep, a strange config flag or an odd approval step.
Someone opens a clean-up ticket, deletes it, and three weeks later the same production incident happens again.
The reason was written down. It sat in a comment, a linked bug or a Confluence page that nobody had time to dig up.

**Chesterton is a Forge app for Jira and Confluence that digs it up for you, in seconds, before you change anything.**

Built for **Atlassian Codegeist 2026: Software Teams**.

## What it does

- **Jira issue panel: Chesterton's Fence.** Open any issue and get a verdict:
  - 🔴 **DO NOT REMOVE YET**: an incident is tied to this work (directly or one link away).
  - 🟠 **CHECK FIRST**: a recorded decision explains why it exists.
  - 🟢 **SAFE TO CHANGE**: no decision or incident found.

  The panel also shows:
  - the evidence, with links to the exact comment, issue or page;
  - **who to ask**: the people who decided, explained or own the linked guard (bots are filtered out);
  - **a safe next step**.
- **Two-hop reasoning.** The danger is often one link away. A clean-up ticket (PAY-3) links to a guard story (PAY-2), and the guard links to the incident that caused it (PAY-1). Chesterton follows that chain.
- **📌 Pin this fence.** One click posts the findings as a comment on the issue, so the next person sees the fence without running anything.
- **Rovo agent: Chesterton.** Ask in Rovo chat *"Is it safe to remove PAY-3?"* The agent calls the `find-why-it-exists` action and answers in this order:
  1. verdict;
  2. original decision, quoted with a link;
  3. incidents;
  4. people to ask;
  5. next step.

  It never invents a reason.
- **Confluence search.** Pages that mention the issue key (ADRs, postmortems, runbooks) are included as evidence.
- **One-click demo data** (Jira admin page *Chesterton setup*): creates a realistic *Payments* project with an incident, a guard, a clean-up ticket and decisions.

## Try it in 60 seconds

1. Install the app on your site, then open **Jira settings → Apps → Chesterton setup** and click **Create demo data**.
2. Open **PAY-3** (on a fresh install, click the apps icon under the title → *Chesterton's Fence*) *"Clean up: remove the weird 2 s sleep"*. Chesterton says **DO NOT REMOVE YET** and traces PAY-3 → PAY-2 → incident PAY-1.
3. Open **PAY-4** (a button rename). The verdict is **SAFE TO CHANGE**.
4. In Rovo chat, pick the **Chesterton** agent and ask: *"Who decided the EUR base currency and why?"*

## Architecture

```
Jira issue panel (UI Kit) ─┐
Rovo agent action ─────────┼─► collect.js ──► Jira REST (issue, comments, links, linked issues' comments & owners)
                           │                └► Confluence CQL search (text ~ "KEY")
                           └─► analyze.js (pure, unit-tested) ─► verdict + evidence + people + next step
```

- **Forge:** `rovo:agent`, `action`, `jira:issuePanel`, `jira:adminPage`, Node.js 22 runtime. Runs on Atlassian, and no data leaves the platform.
- **Analysis:** `src/lib/analyze.js` is pure and deterministic.
  - Decision and incident language is scored with regexes and weighted.
  - An incident needs strong evidence (a score of at least 2, or a Bug/Incident issue type), so a passing mention doesn't trigger a false alarm.
- **Tests:** `npm test` runs 10 unit tests with `node:test`.

## Develop

```bash
npm install
forge register && forge deploy && forge install -p Jira -s <site>.atlassian.net
npm test
```

## License

[MIT](LICENSE)
