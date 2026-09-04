---
name: productivity
description: Reusable productivity workflows for planning and handoffs — covering relentless design interviews and compacting conversations for other agents
---

# Productivity Patterns

Productivity workflows that operate outside the domain-specific frontend/backend skills — sharpening plans through rigorous questioning and preparing work for handoff to other agents.

## Skills

### [Grilling](./grilling/SKILL.md)

A relentless interview to stress-test a plan, decision, or idea. Works the design tree in rounds: asks the full frontier of answerable questions, each with a recommended answer, waits for the user, then recomputes the frontier. Facts are gathered by the agent, never asked of the user.

### [Grill Me](./grill-me/SKILL.md)

Entry point that simply runs a `/grilling` session — for when the user explicitly asks to be grilled about their plan.

### [Handoff](./handoff/SKILL.md)

Compacts the current conversation into a handoff document so a fresh agent can pick up the work. Saved to the OS temp directory, with a "suggested skills" section, references to existing artifacts instead of duplicated content, and sensitive data redacted.

### [Don't Waffle](./dont-waffle/SKILL.md)

A skill that encourages the agent to avoid waffling and be more concise in its responses.
