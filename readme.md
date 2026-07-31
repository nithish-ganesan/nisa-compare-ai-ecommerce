# NiSa AI Commerce Engine

An AI-powered shopping comparison chatbot POC. The app extracts a product intent, searches provider-style offer data, ranks purchase options, and presents the result in a premium responsive chat and comparison experience.

## Implemented In This Repo

- React + Vite + TypeScript frontend
- Three.js / React Three Fiber animated assistant scene
- Framer Motion chat transitions
- Responsive dashboard, recommendation panel, and comparison grid
- Firebase Hosting deployment
- Node.js Firebase Functions API for auth, sale discovery, and comparison
- Firestore-backed users and sessions
- OAuth-style signed bearer tokens with persistent sessions until logout
- SerpAPI Google Shopping adapter for comparison results
- Legacy Spring Boot 3 / Java 21 backend skeleton kept as a local/reference implementation
- Clean provider, extraction, and recommendation service abstractions
- Swagger-ready API dependency
- Docker Compose for frontend/backend
- Architecture, database, and sequence documentation
- Sample product data

## Run Frontend

Recommended on this Windows machine:

```bash
cd frontend
npm.cmd run start
```

Open `http://127.0.0.1:5175`.

This serves the built app with a plain Node static server. It avoids Vite/esbuild dev-server process spawning, which can be blocked by Windows security policies.

Vite dev mode is still available for machines where `esbuild.exe` is allowed:

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

For local public-style testing, configure `VITE_API_URL` to point to a deployed API or run the Firebase emulator.

## Run Node Backend

The public-ready backend is implemented as Firebase Functions in `functions/`.

```bash
cd functions
npm install
npm run lint
```

For production deployment, create `functions/.env` with a stable secret:

```bash
NISA_JWT_SECRET=replace-with-at-least-32-random-characters
SERPAPI_KEY=your-serpapi-key
```

The comparison API does not generate product prices. It calls SerpAPI Google Shopping with `engine=google_shopping`, maps `shopping_results`, and displays the returned title, price, source, and seller link. If SerpAPI does not return a price, the UI shows `View on site`.

Firebase endpoints are exposed through Hosting rewrites:

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
GET  /api/v1/sales
POST /api/v1/compare
```

The older Java backend can still be run from `backend/` for local reference work, but it is no longer required for the Firebase POC.

## Docker

```bash
docker compose up
```

## Run Complete POC On Windows

```powershell
.\start-poc.ps1
```

This starts the Spring Boot backend and the static frontend server.

## Public Deployment: Firebase Hosting + Render API

Use this option when Firebase Hosting should stay on Spark/free tier and the private SerpAPI key should live in a backend service.

Deploy the API as a Render Web Service from this GitHub repo:

```text
Root directory: functions
Build command: npm install
Start command: npm start
```

Set these Render environment variables:

```bash
NISA_MEMORY_STORE=true
NISA_JWT_SECRET=replace-with-at-least-32-random-characters
SERPAPI_KEY=your-serpapi-key
NISA_ALLOWED_ORIGINS=https://nisa-ecommerce.web.app,http://127.0.0.1:5173
```

Then create `frontend/.env.production` with the Render API URL:

```bash
VITE_API_URL=https://your-render-backend.onrender.com/api/v1
```

Build and deploy only Firebase Hosting:

```bash
cd frontend
npm install
npm run build
cd ..
firebase deploy --only hosting --project nisa-ecommerce
```

## Public Deployment: Firebase Hosting + Functions

Create `frontend/.env.production`:

```bash
VITE_API_URL=/api/v1
```

Then build and deploy:

```bash
cd frontend
npm install
npm run build
cd ..
firebase deploy --only functions,hosting --project nisa-ecommerce
```

`firebase.json` serves `frontend/dist`, supports SPA refresh routes, and rewrites `/api/**` to the `api` Firebase Function in `asia-south1`.

Firebase Functions requires the Firebase project to be upgraded to the Blaze pay-as-you-go plan because Cloud Build and Cloud Functions APIs are used during deployment.

### Production Security Notes

- `NISA_JWT_SECRET` must be stable and secret. If it changes, existing sessions become invalid.
- Registered users and sessions are stored in Firestore by the Node Functions backend.
- Enable Firestore in the Firebase project before opening auth to public users.
- Do not commit real API keys, JWT secrets, Amazon keys, Flipkart keys, or Firebase service credentials.

## Documentation

- [Architecture](docs/architecture.md)
- [Database Design](docs/database-design.md)
- [Sequence Diagram](docs/sequence.md)

## Original Requirement Coverage

The README request called for a premium AI shopping assistant with LLM orchestration, vector database usage, provider-based product search, recommendation scoring, comparison UI, dashboard, authentication, DevOps, and production engineering practices.

This POC implements the runnable product experience and the backend architecture seams needed for production adapters. External live shopping providers, real LLM keys, vector database persistence, authentication providers, Kafka, Redis, and enterprise observability are represented as extension points rather than fully wired services.
