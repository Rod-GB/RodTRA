# Gdaw

A Steam discovery website with a crimson-and-black dashboard, an All Games library, click-to-browse genres, a Most Played leaderboard, and website release notes under Updates.

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
CHANGELOG.md
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
npm test
npm run build
```

Run the C++ server from the project root so it can find `frontend/index.html` and the generated bundle. Game screens request `/api/games`, `/api/game`, `/api/reviews`, and `/api/patches` from that server.

## Website Updates and Genres

- Updates displays website changes from `CHANGELOG.md`, bundled into the frontend. Add an entry headed `## YYYY-MM-DD | Title`, followed by `### Improvements` or `### Fixes` and bullet points, then rebuild to publish the new notes.
- Genres displays category tiles. Click one to see only that genre's game cards; use All genres to return. Search and sorting remain in All Games.
- Game-specific Steam posts are available under Patch notes inside a game's details. The old shared game-update collector and `/api/updates` and `/api/update` routes have been removed.

## Refresh behavior

- Player counts are requested every 30 seconds in a dedicated worker. Browser pages check the backend cache every 10 seconds. Steam's own caching can affect the freshness of returned data, and failed requests use a longer retry delay.
- Chart history is sampled and saved every 15 minutes. The history cleanup uses a timestamp index.
- Overall ratings use all languages; displayed review pages use English. Reviews are refreshed on opening and periodically afterward using the supported Steam API.
- A game's Patch notes tab loads complete Steam developer posts on demand. The website Updates page uses the bundled changelog and makes no Steam requests.
- Matching content requests share a cache. Failed refreshes retain available cached content.
- Temporary database connection failures at startup allow live Steam loading while the database retries. Invalid database configuration remains an explicit startup error.

The current collection remains Steam's top 100. Additional collections, developer accounts, diagnostics storage, and MEGA integration are postponed.
