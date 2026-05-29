# Session Context

Shared context for multi-step pipeline workflows. Tracks phase state across agent handoffs.

## Phases
- **Phase 0 (Pre-Flight Check)**: Validate inputs, check for existing drafts, set up session.
- **Phase 1 (Competitive Research)**: Competitive analyst researches top-ranking articles.
- **Phase 2 (Topic Research)**: Tech researcher gathers statistics and sources.
- **Phase 3 (Writing)**: Tech writer produces the article.
- **Phase 4 (Review & Fix)**: Reviewer scores; orchestrator applies fixes if needed.
- **Phase 5 (Delivery)**: Final validation, image fetch, save to content/.

## Rules
- Each agent updates only its own phase in the session context
- Don't delete or overwrite previous phases
- Orchestrator creates the session and cleans up on completion
- Self-assessed scores are invalid — only the reviewer's score counts
- Max 2 fix iterations per article
