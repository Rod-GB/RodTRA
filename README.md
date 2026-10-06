# Gdaw

A Steam discovery website with a crimson-and-black dashboard, genre browsing, a Most Played leaderboard, and game details with reviews and developer updates.

## Project structure

- `backend/`: the C++ server, Steam requests, Turso storage, searching, filtering, and ranking.
- `frontend/`: the existing React browser interface, CSS, and frontend build configuration.
- `Dockerfile`: builds the frontend and C++ server into one production container.
- `render.yaml`: the existing Render service configuration.

JavaScript in `frontend/js/` is required for the browser interface. The production server is C++; there is no Node.js preview server or sample-data API in this source package. Node.js is used to build the frontend during the Docker build.

## Update the GitHub repository

Upload the contents of the source package at the repository root:

```text
backend/
frontend/
.dockerignore
.gitignore
Dockerfile
README.md
render.yaml
```

Keep both frontend and backend folders. Include `frontend/package.json` and `frontend/package-lock.json` so deployment installs the locked dependencies. If uploading through the GitHub website, check that `.gitignore` and `.dockerignore` are included too.

Temporary previews, sample data, screenshots, generated documentation, dependency folders, compiled bundles, and secrets are excluded from the package. The production build generates `frontend/assets/dashboard.bundle.js` automatically.

## Run the website

Use the Dockerfile on the existing Render service. Configure `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in the server environment. Keep credentials out of the repository. `PORT` defaults to `10000` and can be supplied by the host.

The existing deployment and executable identifiers remain `rodtra` to match the existing service configuration; the public app name is Gdaw.

GitHub stores the source. The website needs a host that runs its C++ server, such as the existing Docker-based Render service. GitHub Pages alone cannot run this backend.

## Check the frontend build

```sh
cd frontend
npm ci
npm run build
```

Run the C++ server from the project root so it can find `frontend/index.html` and the generated bundle. The UI requests `/api/games`, `/api/game`, `/api/reviews`, and `/api/patches` from that server.
