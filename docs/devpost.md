# Devpost submission: Chesterton (Codegeist 2026, Apps for Software Teams)

## Project name
Chesterton: know why it exists before you remove it

## Tagline
Every "weird" line of code has a reason. Chesterton finds it in Jira and Confluence before your clean-up ticket brings back last year's outage.

## Category
Apps for Software Teams

## Bonus prize
Best Agents (Rovo). The app also exposes its tools through the Atlassian MCP server (`rovo:mcp`).

## Inspiration
G. K. Chesterton wrote: don't take down a fence until you know why it was put up.

Every software team has fences:
- a hard-coded 2-second sleep;
- a feature flag nobody remembers;
- an approval step that "slows us down".

A new engineer opens a clean-up ticket, deletes it, and three weeks later the same production incident happens again. Usually the reason was written down. It sat in a Jira comment, a linked bug or a Confluence postmortem, and nobody had time to dig it up before changing things.

Team knowledge isn't missing. It's disconnected from the moment of change. That's exactly Codegeist 2026's theme: the right context in front of a team at the right moment.

## What it does
Chesterton answers one question before anyone changes anything: **why does this exist, and is it safe to remove?**

- **Jira issue panel: Chesterton's Fence.** Every issue gets a verdict:
  - 🔴 **DO NOT REMOVE YET**: an incident is tied to this work, directly or one link away.
  - 🟠 **CHECK FIRST**: a recorded decision explains why it exists.
  - 🟢 **SAFE TO CHANGE**: no decision or incident found.

  Below the verdict you get:
  - the evidence, with deep links to the exact comment, issue or Confluence page;
  - **who to ask**: the people who made or explained the decision and the owners of the linked guard (bots are filtered out);
  - a concrete **next step**.
- **Two-hop reasoning.** The danger is rarely on the ticket itself. In our demo, the clean-up ticket PAY-3 ("remove the weird 2 s sleep") links to a guard story PAY-2, and the guard exists because of incident PAY-1 (customers charged twice). Chesterton follows the chain and says DO NOT REMOVE YET.
- **📌 Pin this fence.** One click posts the findings as a comment on the issue, so the knowledge travels with the work and the next person sees it without running anything.
- **Chesterton Rovo agent.**
  - Ask in Rovo Chat: "Is it safe to remove PAY-3?" or "Who decided the EUR base currency and why?"
  - The agent calls the `find-why-it-exists` action and answers with the verdict, the quoted decision with a link, incidents, people and a next step.
  - It is instructed never to invent a reason.
  - It can also pin the result with the `pin-fence` action.
- **Atlassian MCP server.**
  - The same two tools are exposed through `rovo:mcp`, so a developer's own coding agent (in an IDE or CLI) can run a Chesterton check before it deletes code.
  - We ship an open `skills/chesterton.skill.md` that third-party agents can load.
- **One-click demo data.** The Jira admin page *Chesterton setup* creates a realistic Payments project, so judges can see it working in 60 seconds.

## How we built it
- **Forge app, Node.js 22 runtime, UI Kit (native render).** Modules:
  - `rovo:agent`;
  - two `action` modules (`find-why-it-exists`, `pin-fence`);
  - `rovo:mcp`;
  - `jira:issuePanel`;
  - `jira:adminPage`.
- **Context collection (`collect.js`).**
  - Via `requestJira`: the issue, its comments and links, and for up to 5 linked issues their comments, owners and links (the second hop).
  - Via `requestConfluence`: a CQL search `text ~ "KEY"` that finds ADRs, postmortems and runbooks mentioning the issue.
- **Analysis (`analyze.js`)** is pure and deterministic, so the panel, the agent and the MCP tool give the same answer.
  - Decision language ("we decided", "because", "intentional", "do not remove") and incident language ("outage", "rollback", "postmortem", "charged twice") are scored and weighted.
  - An incident needs strong evidence (a score of at least 2, or a Bug/Incident issue type), so a passing mention doesn't cause a false alarm.
  - Evidence is ranked, capped at 8, and every item links to its source.
- **Runs on Atlassian.** The app makes no egress to external services and stores no data outside the Atlassian platform. Forge reports the deployed version as eligible for the Runs on Atlassian program.
- **Tests.** 10 unit tests (`node:test`) cover verdict logic, two-hop chains, bot filtering, false-alarm protection and the pinned note format.

## How it meets the main technology requirement
- It is built entirely on Forge.
- It integrates Jira (issue panel, admin page, REST API for issues, comments, links and comment creation), Confluence (CQL search) and Rovo (agent, actions, MCP server).

## Challenges we ran into
- **False alarms.** The first version flagged any issue whose description mentioned the word "incident". We introduced a strength threshold and type-based detection and covered both with tests.
- **The danger is one hop away.** Looking only at the current issue said "SAFE" for the clean-up ticket, which was exactly the wrong answer. Adding a bounded second hop (5 neighbours) fixed it without slowing the panel.
- **Bots polluting "who to ask".** App-authored comments listed the app itself as a person. We now filter `accountType: app` and instead surface the human owners of linked guard issues.

## Accomplishments that we're proud of
- In the demo, a "harmless" clean-up ticket is correctly traced to a past double-charge incident two links away, with links to every source.
- One analysis engine serves three surfaces: the Jira panel, the Rovo agent and the MCP tools for external coding agents.

## What we learned
- Context beats generation. The most useful thing the AI can do here is find and cite what the team already wrote, not guess.
- Forge's `rovo:mcp` module turns an in-product feature into a tool that any agent can call, with Atlassian handling the auth and permissions.

## What's next for Chesterton
- **Bitbucket PR guard:** when a pull request deletes a guarded line, comment with the fence and the people to ask.
- Teamwork Graph integration to follow decisions across Loom, Slack and Google Drive connectors.
- **Fence registry:** a Confluence page that lists every DO NOT REMOVE fence in a project.
- A Marketplace listing.

## Built with
forge, rovo, rovo-mcp, jira, confluence, ui-kit, javascript, node.js

## Testing instructions (for judges)
1. Install Chesterton with the installation link on your Jira (and optionally Confluence) site.
2. Go to **Jira settings → Apps → Chesterton setup** and click **Create demo data**. This creates project **PAY** with 5 linked issues.
3. Open **PAY-3** ("Clean up: remove the weird 2 s sleep…"). On a fresh install, click the **apps icon** under the issue title and choose **Chesterton's Fence** (Jira remembers it afterwards). The panel shows 🔴 DO NOT REMOVE YET and traces PAY-3 → PAY-2 → incident PAY-1.
4. Click **📌 Pin this fence to the issue**. A comment with the verdict, evidence and next step appears on PAY-3.
5. Open **PAY-4** (button rename). The verdict is 🟢 SAFE TO CHANGE.
6. Open **PAY-5**. The verdict is 🟠 CHECK FIRST (the EUR decision).
7. **Rovo** (needs a site with Rovo, e.g. a Forge demo site from `forge site provision`): open **Ask Rovo → ☰ → View all agents → Chesterton** and ask "Is it safe to remove PAY-3?".
8. **MCP (optional):** an org admin enables the app's tools under *Atlassian Administration → Connected apps*. Then connect any MCP client to `https://mcp.atlassian.com/forge/34df2211-5119-4409-b3ae-5695d71792b4`.

No external accounts, API keys or configuration are needed.

## Links
- Code: https://github.com/Shinigami-tech/chesterton
- Installation link: https://developer.atlassian.com/console/install/34df2211-5119-4409-b3ae-5695d71792b4?signature=AYABeLZBDmn7jLPi32mWhSfOVcgAAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4CxqLTo9l4lqXuFjNim1xJM%2Bp%2F3TVP9xHS2BrU5DRRucBo6fG09DTRBAslqWkbgqO1gAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDKQauWFKVdoQdm0pyAIBEIA7pj4FDCfB%2FhgHAvV0FOrYOHjGgx8Se%2BQdVjfbIiSdhcG44QgKvCeu5tR7LpcyfPsmqpGQbPX%2FQz%2B7HcgAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHi9bVMAkme4qVQX1fQHo6ePw3H40A7cGfz7yrmSfBWMXgE3NJziQFFIJiL8EscJfgRmAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMbAFKnpk4gN63PmvOAgEQgDsUUAUWX8LaOh8npj7WOMIkHa02iYBx5mBHjc4aZ4EqiafeBvj52Wto%2B35MHKh5OKDI%2FfKrr09%2BRTX6igAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeDYASx0XCjkny4iLV6vz%2BKtEGSGT6kdt0QRpkn6D%2FlVEAXNkRRYYoobBQQVo9XlJt7gAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAxsPx3LzYpz%2FdoOTTgCARCAO6mdFaIw2HIg4s7bdUp1l8eFsYy%2BZWEqVRBypJhWUYVxJDSBHP9Kl17lLg%2BCpWCWBfJ5Cbuons9RSaI9AgAAAAAMAAAQAAAAAAAAAAAAAAAAAHjcmNHQ%2FoqBF%2BZpPLVbefr%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADJKm4%2Fcp%2Fr4OdnsQGs5qf%2FR5IIgUE46Kaut6d2s2BnA1GFZSuHPWlYl63deA9bubEuAjuKeWZmhiYOO69OqjFwp%2BTQ%3D&product=jira&product=confluence
