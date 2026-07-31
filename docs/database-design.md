# Database Design

## MongoDB

- `conversations`: user id, query, extracted intent, response summary, timestamps.
- `search_history`: normalized query, filters, provider coverage, result references.
- `embedding_metadata`: vector id, source type, source id, model, created timestamp.

## MySQL

- `products`: canonical product identity, brand, variant, attributes.
- `offers`: provider product id, price, discount, seller, delivery, warranty, product URL.
- `users`: auth subject, profile, preferences.

## Vector Database

- Product embeddings for semantic matching.
- Offer embeddings for bank/exchange/EMI retrieval.
- Conversation memory embeddings for follow-up questions.
