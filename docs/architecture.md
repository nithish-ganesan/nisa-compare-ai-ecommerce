# Architecture

```mermaid
flowchart LR
  UI[React Vite UI] --> API[Spring Boot API]
  API --> LLM[LLM Abstraction]
  API --> Search[Shopping Search Service]
  API --> Compare[Comparison Engine]
  API --> Memory[Vector Memory Service]
  Search --> Providers[Amazon / Flipkart / Croma / Apple Providers]
  Compare --> Recommend[Recommendation Engine]
  Memory --> Vector[(Vector DB)]
```

## Current POC

- Frontend: React, TypeScript, Vite, Three.js, Framer Motion, Lucide icons.
- Backend: Spring Boot 3 WebFlux API skeleton with provider and recommendation abstractions.
- Data: deterministic sample product catalog for repeatable demos.
- AI layer: interface-ready extraction and recommendation services; external LLM keys can be added without changing the UI contract.

## Next Production Steps

- Replace `MockSearchProvider` with platform adapters.
- Add Spring AI provider implementations for OpenAI, Azure OpenAI, or Ollama.
- Persist conversation turns and embeddings in a vector database such as Qdrant or ChromaDB.
- Add JWT/OAuth2 security, rate limits, observability, and CI checks.
