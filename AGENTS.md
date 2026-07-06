# AGENTS.md

# Development Notes & AI Collaboration

This document describes the development approach followed for this project and the role AI tools played during implementation.

---

## Overview

This project was designed, implemented, integrated, and tested by the repository owner. AI tools were used as engineering assistants to accelerate development through discussion, code review, debugging, and documentation—not as autonomous developers.

---

## Development Workflow

The project was built incrementally:

1. Understand the assignment requirements and dataset.
2. Design the architecture and API.
3. Implement one feature at a time.
4. Review, refine, and test each feature.
5. Iterate until the implementation matched the intended behavior.

The focus throughout development was on maintainability, readability, and simplicity.

---

## Architecture

The backend follows a service-oriented architecture.

- Routes handle HTTP requests.
- Services contain business logic.
- Utility modules provide shared functionality.
- Application logic remains independent of the routing layer.

This keeps the codebase modular and makes individual components easier to extend and maintain.

---

## Key Implementations

### Search

Implemented a weighted search engine using metadata such as title, producer, genre, mood, tags, and description. Natural-language queries are expanded into structured signals before ranking results.

### Recommendations

Implemented a content-based recommendation engine that combines user interactions, recency weighting, metadata similarity, embedding similarity, and diversity constraints while generating explainable recommendation reasons.

---

## AI Collaboration

Claude was used selectively throughout development as a coding assistant.

Typical use cases included:

- discussing implementation approaches
- reviewing algorithms
- explaining unfamiliar concepts
- debugging issues
- suggesting refactors
- brainstorming improvements
- improving documentation

AI suggestions were treated as recommendations rather than final solutions. Any adopted code or design ideas were manually reviewed, modified where appropriate, integrated into the project, and tested before becoming part of the final implementation.

The architecture, implementation decisions, feature integration, debugging, and testing remain my own responsibility.

---

## Engineering Principles

- Keep routes thin and business logic inside services.
- Prefer modular and reusable code.
- Keep recommendations explainable.
- Avoid unnecessary complexity.
- Prioritize readability and maintainability.

---

## Testing

Every major feature was manually validated through API testing, frontend integration, recommendation verification, search relevance checks, interaction tracking, and edge-case testing before being finalized.

---

## Future Improvements

Potential future work includes persistent storage, neural embeddings, collaborative filtering, automated tests, and additional recommendation signals.
