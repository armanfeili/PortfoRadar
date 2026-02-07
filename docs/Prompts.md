# Coding Agent Prompt Template

You are my coding agent. First, read every file I attach completely and treat them as the source of truth for project requirements and current state.

**Project**: PortfoRadar (NestJS + TypeScript, CommonJS; Nest CLI defaults; no "type": "module")

**Reference files**: @README.md @docs/DEVELOPMENT_PHASES.md

---

## Target Work

[DESCRIBE YOUR TASK HERE]

---

## Engineering Goals

- Implement the task correctly and cleanly like a careful human engineer
- Keep changes production-lean, maintainable, and consistent with existing patterns
- Avoid breaking API changes unless explicitly requested; if unavoidable, update docs and maintain backward compatibility where reasonable

## Operational Constraints

- Use NestJS CLI defaults (CommonJS). Keep existing project structure
- Add only dependencies needed for the current task
- Do not commit — I will commit
- If a task requires external accounts/secrets, implement everything possible in code + docs + CI using placeholders, and clearly list what I must do manually

## Output Format (MANDATORY)

1. **Key takeaways** from the attached files (3–6 bullets)
2. **Exact commands** you ran
3. **File tree** (top 2 levels)
4. **For each file created/edited**: what changed + full contents
5. **Verification steps** (commands + expected results)
6. **Suggested commit message** (only; don't commit)

Stop after completing this task.
