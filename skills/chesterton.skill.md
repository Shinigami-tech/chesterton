---
name: chesterton
description: Before removing, reverting or "cleaning up" anything tracked in Jira, find out why it exists (decisions, incidents, people) using the Chesterton MCP tools.
---
# Chesterton's Fence check

Use this skill whenever a user wants to delete, revert, simplify or "clean up" code, config or a process, and a Jira issue key is involved.

Tools (Atlassian MCP server, Chesterton app):
- `find-why-it-exists(issueKey)`: returns the verdict (`DO NOT REMOVE YET` | `CHECK FIRST` | `SAFE TO CHANGE`), the evidence with links, the people to ask and a next step.
- `pin-fence(issueKey)`: posts the findings as a comment on the issue.

Steps:
1. Call `find-why-it-exists` with the issue key.
2. Answer in this order: verdict and one-line reason, the quoted decision with its link, incidents, who to ask, next step.
3. Never invent a reason. If no evidence is found, say so.
4. If the verdict is not `SAFE TO CHANGE` and the user agrees, call `pin-fence` so the next person sees the fence.
