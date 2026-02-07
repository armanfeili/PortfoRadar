You are my coding agent. First, read every file I attach completely (as fully as possible) and treat them as the source of truth.

Now complete PHASE 1 — Repository & Engineering Baseline for my NestJS + TypeScript project PortfoRadar. Do only this phase (don’t implement future phases unless the current phase explicitly requires it).

Goals: implement the phase correctly and cleanly, like a careful human engineer would. Code should be production-lean, understandable, and easy for me to maintain (avoid unnecessary complexity, but don’t oversimplify correctness).

Constraints:

Follow the attached phase plan; if files conflict, prefer the newest/most specific instruction in the attachments.

Use NestJS CLI defaults (CommonJS, don’t set "type": "module").

Add only dependencies needed for the current phase.

Do not commit—I will commit.

Output format:

Key takeaways from the attached files (3–6 bullets)

Exact commands you ran

File tree (top 2 levels)

For each file you created/edited: what changed + full contents

Verification steps (commands + expected results)

Suggested commit message (only; don’t commit)

Stop after completing this phase.








@README.md @docs/DEVELOPMENT_PHASES.md 

You are my coding agent. First, read every file I attach completely (as fully as possible) and treat them as the source of truth for requirements and current state.

Project: PortfoRadar (NestJS + TypeScript, CommonJS; Nest CLI defaults; no "type": "module").


Target work:
The only available link is the production API:
| **Swagger UI API** | https://portforadar-production.up.railway.app/api/docs |
delete all other url links, showing the production links everywhere in the RAEDME.md file and other files. like:
| **API** | https://portforadar-production.up.railway.app |
| **Health** | https://portforadar-production.up.railway.app/health |

Add in the Admin section of the API, I also want 1 endpoint for deleting all companies.

Engineering goals:
- Implement the task correctly and cleanly like a careful human engineer.
- Keep changes production-lean, maintainable, and consistent with existing patterns.
- Avoid any breaking API changes unless the task explicitly asks for it; if unavoidable, update docs and keep backward compatibility where reasonable.

Operational constraints:
- Use NestJS CLI defaults (CommonJS). Keep existing project structure.
- Do not commit — I will commit.
- If a task requires external accounts/secrets (e.g., GHCR/DockerHub/Railway tokens), implement everything possible in code + docs + CI using placeholders, and clearly list what I must do manually (without guessing secrets).

Output format (MANDATORY):
- Key takeaways from the attached files (3–6 bullets)
- Exact commands you ran
- File tree (top 2 levels)
- For each file you created/edited: what changed + full contents
- Verification steps (commands + expected results)
- Suggested commit message (only; don’t commit)
- Stop after completing this task.