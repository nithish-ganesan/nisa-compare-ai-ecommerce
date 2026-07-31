# NiSa AI Commerce Engine

An AI-powered shopping comparison chatbot POC. The app extracts a product intent, searches provider-style offer data, ranks purchase options, and presents the result in a premium responsive chat and comparison experience.

## Implemented In This Repo

- React + Vite + TypeScript frontend
- Three.js / React Three Fiber animated assistant scene
- Framer Motion chat transitions
- Responsive dashboard, recommendation panel, and comparison grid
- Spring Boot 3 / Java 21 backend skeleton
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

The frontend calls `http://localhost:8080/api/v1/compare` when available. If the backend is not running, it falls back to deterministic local sample data so the POC remains usable.

## Run Backend

Java 21 and Maven are required.

```bash
cd backend
mvn -s settings.xml package -DskipTests
java -jar target/ai-commerce-engine-0.1.0.jar
```

Swagger UI:

```text
http://localhost:8080/swagger-ui.html
```

Compare API:

```http
POST /api/v1/compare
Content-Type: application/json

{ "query": "I want to buy iPhone 15 256GB Black" }
```

## Docker

```bash
docker compose up
```

## Run Complete POC On Windows

```powershell
.\start-poc.ps1
```

This starts the Spring Boot backend and the static frontend server.

## Public Deployment: Firebase Hosting + Cloud Run

Firebase Hosting can serve the React frontend, but the Spring Boot API must be hosted publicly too. The recommended setup is:

- Frontend: Firebase Hosting
- Backend: Google Cloud Run
- Auth/session secret: Cloud Run environment variable
- User persistence for production: Firestore, Cloud SQL, or another managed database

### Backend: Cloud Run

Build and deploy the backend container from the repo root:

```bash
gcloud run deploy nisa-commerce-api \
  --source backend \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars NISA_JWT_SECRET="replace-with-at-least-32-random-characters",NISA_ALLOWED_ORIGINS="https://your-firebase-project-id.web.app"
```

Copy the Cloud Run service URL after deployment. It will look similar to:

```text
https://nisa-commerce-api-xxxxx-uc.a.run.app
```

### Frontend: Firebase Hosting

Create `frontend/.env.production`:

```bash
VITE_API_URL=https://your-cloud-run-service-url/api/v1
```

Then build and deploy:

```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

`firebase.json` is already configured to serve `frontend/dist` and support SPA refresh routes.

### Production Security Notes

- `NISA_JWT_SECRET` must be stable and secret. If it changes, existing sessions become invalid.
- `NISA_ALLOWED_ORIGINS` should include only your Firebase/custom domains.
- The current POC keeps registered users and active sessions in memory. For real public use, move users and sessions to Firestore or Cloud SQL so accounts survive backend restarts and scale across instances.
- Do not commit real API keys, JWT secrets, Amazon keys, Flipkart keys, or Firebase service credentials.

## Documentation

- [Architecture](docs/architecture.md)
- [Database Design](docs/database-design.md)
- [Sequence Diagram](docs/sequence.md)

## Original Requirement Coverage

The README request called for a premium AI shopping assistant with LLM orchestration, vector database usage, provider-based product search, recommendation scoring, comparison UI, dashboard, authentication, DevOps, and production engineering practices.

This POC implements the runnable product experience and the backend architecture seams needed for production adapters. External live shopping providers, real LLM keys, vector database persistence, authentication providers, Kafka, Redis, and enterprise observability are represented as extension points rather than fully wired services.
