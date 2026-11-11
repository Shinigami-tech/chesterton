# Chesterton: demo video script (target 2:45, hard limit under 5:00)

Record the screen at 1080p with the Jira site in English and the browser at 100% zoom. Use a calm voice-over and quiet, royalty-free background music (YouTube Audio Library).

| Time | On screen | Voice-over |
|---|---|---|
| 0:00–0:15 | Black screen, text: *"Don't take down a fence until you know why it was put up." G. K. Chesterton* | "Every team has a weird line of code. A two-second sleep. A flag nobody remembers." |
| 0:15–0:35 | Jira PAY-3: "Clean up: remove the weird 2 s sleep…" | "A new engineer picks up this clean-up ticket. Looks harmless. Delete the sleep, checkout gets faster. Last time someone did this, 312 customers were charged twice." |
| 0:35–0:45 | Thumbnail / logo | "This is Chesterton. It tells you why something exists before you remove it." |
| 0:45–1:25 | Scroll to the Chesterton's Fence panel on PAY-3. Hover the red verdict, then the evidence, then Ask before changing. | "Right inside the issue: DO NOT REMOVE YET. Chesterton followed the links two hops away: this ticket, to the guard story PAY-2, to the incident PAY-1. It quotes the decision: the bank rate-limits retries. It links every source, tells you who to ask, and gives a safe next step." |
| 1:25–1:40 | Click 📌 Pin this fence → the success message → scroll to the new comment | "One click pins the fence to the issue, so the next person sees it without running anything." |
| 1:40–1:55 | Open PAY-4 (green), then PAY-5 (orange) | "A copy change? Safe to change. A currency decision? Check first, here's who made it and why." |
| 1:55–2:25 | Rovo Chat → Chesterton agent → type "Is it safe to remove PAY-3?" → answer | "The same brain lives in Rovo. Ask the Chesterton agent in plain English. It cites, it never invents a reason, and it can pin the result for you." |
| 2:25–2:40 | manifest.yml (rovo:agent, action, rovo:mcp) + skills/chesterton.skill.md | "And through the Atlassian MCP server, your own coding agent can run a Chesterton check before it deletes code. Built on Forge, runs on Atlassian, no data leaves the platform." |
| 2:40–2:50 | Thumbnail + GitHub URL | "Chesterton. Know why it exists before you remove it." |

Before recording, run *Create demo data* on a fresh site so the PAY issues are clean, and delete old pinned comments.
