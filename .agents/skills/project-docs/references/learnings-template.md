# Learnings Template

Use one dated line for each durable, verified learning:

```text
YYYY-MM-DD - [scope] [status] Rule. Why: why it matters. Evidence: file, line, command, test or ADR.
```

Guidelines:

- Use an ISO date (`YYYY-MM-DD`) for the date of confirmation.
- Keep the learning to one line and state one precise rule or finding.
- Use `frontend`, `backend` or `cross-cutting` for the scope.
- Use `verified`, `durable-rule`, `pitfall`, `procedure`, `open` or
  `superseded` for the status.
- Link evidence with repository-relative Markdown links where possible.
- Record only durable, evidence-backed knowledge; keep planned behavior in
  the concept documents and PRDs.

Example:

```text
2026-09-09 - [backend] [verified] The prototype uses Hot Chocolate GraphQL with EF Core InMemory. Why: Changes must respect the implemented dependency and runtime surface. Evidence: [`Program.cs`](../../../../src/GettingStarted/Program.cs).
```
