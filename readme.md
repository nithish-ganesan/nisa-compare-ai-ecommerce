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
- Lucide React for UI icons.
- Node.js and Express for the API in `functions/`.
- MongoDB Atlas with Mongoose for persistent customer accounts.
- bcrypt password hashing and JSON Web Tokens (JWT) for authentication sessions.
- Render Web Service for the currently used production API.
- Dockerfile for the Render Docker web service.
- SerpAPI Google Shopping adapter for live product comparison data.
- Firebase Hosting for public frontend deployment.
- Firebase CLI for SPA hosting.

## Current POC Flow

- New customers register once with an email address and password.
- Passwords are salted and hashed before storage; plaintext passwords are never saved.
- Returning customers log in with the same credentials. Logout clears their local session.
- Daily sales are loaded from the backend `/sales` endpoint.
- Product search uses the backend `/compare` endpoint.
- Production frontend uses this Render API URL from `frontend/.env.production`:

```bash
VITE_API_URL=https://nisa-compare-ai-ecommerce.onrender.com/api/v1
```

## Project Structure

```text
frontend/   React + Vite application
functions/  Node.js Express API used by Render
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

Required environment variables:

```bash
SERPAPI_KEY=your-serpapi-key
MONGODB_URI=mongodb+srv://database-user:database-password@cluster.mongodb.net/nisa_ecommerce?retryWrites=true&w=majority
JWT_SECRET=a-long-random-secret-with-at-least-32-characters
NISA_ALLOWED_ORIGINS=https://nisa-ecommerce.web.app,https://nisa.ecommerce.nithishg.com,http://127.0.0.1:5173,http://127.0.0.1:5175
```

Local API URL:

```text
http://127.0.0.1:8080/api/v1
```

## API Endpoints

Endpoints:

```http
GET  /api/v1/health
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
GET  /api/v1/sales
POST /api/v1/compare
```

## Deploy Backend To Render

Create or update a Render Web Service from this GitHub repository.

For the current Render Docker service, keep the root `Dockerfile` in the repo. Render builds that Dockerfile and starts the Express API from `functions/`.

Use these settings if you create a non-Docker Render Node service:

```text
Root directory: functions
Build command: npm install
Start command: npm start
Branch: develop
Auto-Deploy: enabled
```

Set Render environment variables:

```bash
SERPAPI_KEY=your-serpapi-key
MONGODB_URI=your-atlas-connection-string
JWT_SECRET=a-long-random-secret-with-at-least-32-characters
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

Firebase Hosting serves `frontend/dist`. The project currently uses Render for the API, so Firebase deploys only the frontend.

## Push Changes To Develop

After making changes:

```bash
git status
git add .
git commit -m "Your commit message"
git push origin develop
```

Render should deploy automatically from `develop` when auto-deploy is enabled.

## Security Notes

- Do not commit real API keys, Firebase service credentials, or provider credentials.
- Keep `SERPAPI_KEY`, `MONGODB_URI`, and `JWT_SECRET` only in Render environment variables.
- Use a MongoDB database user with `readWrite` access to the `nisa_ecommerce` database; do not use an Atlas administrator account for the app.
- Add every public frontend origin to `NISA_ALLOWED_ORIGINS` so browser search calls are not blocked by CORS.
