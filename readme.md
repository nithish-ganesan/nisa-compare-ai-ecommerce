# NiSa AI Commerce Engine

NiSa AI Commerce Engine is an AI-powered shopping comparison POC. The app lets a user search in natural language, extracts the product intent, calls a live shopping-search backend, ranks offers, and shows sale discovery plus comparison results in a responsive commerce dashboard.

Current live frontend:

```text
https://nisa-ecommerce.web.app
https://nisa.ecommerce.nithishg.com
```

## Tech Used

- React 19, Vite, and TypeScript for the frontend.
- Axios for API communication.
- Framer Motion for UI transitions.
- Three.js / React Three Fiber for the animated commerce assistant scene.
- Lucide React for UI icons.
- Node.js, Express, and Firebase Functions style structure for the API in `functions/`.
- Render Web Service for the currently used production API.
- SerpAPI Google Shopping adapter for live product comparison data.
- Firebase Hosting for public frontend deployment.
- Firebase CLI / Firebase Hosting rewrites for SPA hosting.
- Legacy Spring Boot 3 / Java 21 backend skeleton in `backend/` for local/reference architecture.
- Docker and Docker Compose files for local container-based runs.
- Firestore-ready auth/session code remains in the backend, but the current POC UI does not require login.

## Current POC Flow

- The frontend opens directly without login or registration.
- Daily sales are loaded from the backend `/sales` endpoint.
- Product search uses the backend `/compare` endpoint.
- Production frontend uses this Render API URL from `frontend/.env.production`:

```bash
VITE_API_URL=https://nisa-compare-ai-ecommerce.onrender.com/api/v1
```

## Project Structure

```text
frontend/   React + Vite application
functions/  Node.js Express API used by Render/Firebase Functions style deployment
backend/    Legacy Spring Boot reference backend
docs/       Architecture and design notes
data/       Sample product data
```

## Run The Frontend Locally

Install dependencies and build:

```bash
cd frontend
npm install
npm run build
```

Start the local static server:

```bash
npm run start
```

Open:

```text
http://127.0.0.1:5175
```

For Vite dev mode:

```bash
cd frontend
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## Run The Node API Locally

The active API is in `functions/`.

```bash
cd functions
npm install
npm run lint
npm start
```

Required environment variables for live product search:

```bash
NISA_MEMORY_STORE=true
NISA_JWT_SECRET=replace-with-at-least-32-random-characters
SERPAPI_KEY=your-serpapi-key
NISA_ALLOWED_ORIGINS=https://nisa-ecommerce.web.app,https://nisa.ecommerce.nithishg.com,http://127.0.0.1:5173,http://127.0.0.1:5175
```

Local API URL:

```text
http://127.0.0.1:8080/api/v1
```

## API Endpoints

Current public POC endpoints:

```http
GET  /api/v1/health
GET  /api/v1/sales
POST /api/v1/compare
```

Auth endpoints still exist in the backend code for future use, but the current UI does not call them:

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
```

## Deploy Backend To Render

Create or update a Render Web Service from this GitHub repository.

Use these settings:

```text
Root directory: functions
Build command: npm install
Start command: npm start
Branch: develop
Auto-Deploy: enabled
```

Set Render environment variables:

```bash
NISA_MEMORY_STORE=true
NISA_JWT_SECRET=replace-with-at-least-32-random-characters
SERPAPI_KEY=your-serpapi-key
NISA_ALLOWED_ORIGINS=https://nisa-ecommerce.web.app,https://nisa.ecommerce.nithishg.com,http://127.0.0.1:5173,http://127.0.0.1:5175
```

If Render does not deploy automatically after a git push, confirm that the service is connected to the same GitHub repo and watching the `develop` branch.

## Deploy Frontend To Firebase Hosting

Make sure `frontend/.env.production` points to the Render API:

```bash
VITE_API_URL=https://nisa-compare-ai-ecommerce.onrender.com/api/v1
```

Build and deploy:

```bash
cd frontend
npm install
npm run build
cd ..
npx firebase-tools deploy --only hosting --project nisa-ecommerce --non-interactive
```

Firebase Hosting serves `frontend/dist`. The project currently uses Render for the API because Firebase Functions deployment requires the Firebase project to be upgraded to the Blaze pay-as-you-go plan.

## Push Changes To Develop

After making changes:

```bash
git status
git add .
git commit -m "Your commit message"
git push origin develop
```

Render should deploy automatically from `develop` when auto-deploy is enabled.

## Docker

Run the containerized local stack:

```bash
docker compose up
```

## Security Notes

- Do not commit real API keys, JWT secrets, Firebase service credentials, or provider credentials.
- Keep `SERPAPI_KEY` only in Render/Firebase environment variables.
- Keep `NISA_JWT_SECRET` stable if auth is re-enabled later.
- Add every public frontend origin to `NISA_ALLOWED_ORIGINS` so browser search calls are not blocked by CORS.

## Documentation

- [Architecture](docs/architecture.md)
- [Database Design](docs/database-design.md)
- [Sequence Diagram](docs/sequence.md)
