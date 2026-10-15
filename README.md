# Gdaw

A player-focused game discovery website with a crimson-and-black dashboard, an All Games library, click-to-browse genres, a Most Played leaderboard, and website release notes under Updates.

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

The Steam collection remains its existing top 100. Epic giveaways and a capped itch.io released collection are separate sources. Developer accounts, diagnostics storage and MEGA integration are postponed.

## Player discovery features (Version 1.1.0, 2026-10-15)

The deployment remains the existing C++17 Docker service on Render, with Turso for the existing saved Steam collection and chart history. Existing filenames, the Steam top-100 limit, the Top 10 leaderboard and player/history refresh logic are retained. A returned peak is raised to the current reading if needed; existing chart history is not rewritten. No Windows executable is included or required for uploading this source package.

- **Budget Finder** (`#/budget`): submit a maximum PHP budget, minimum Steam positive-review percentage, up to three optional genres, sale-only choice and optional free alternatives. Each result fits the budget individually. C++ filters the shared collection and uses quicksort to order the matches. Unknown, non-PHP and stale prices cannot pass the budget filter. The maximum accepted budget is PHP 100,000 with two decimal places.
- **Prices**: Philippine store prices, discounts, free-to-play labels and check times appear alongside game information. An independent worker gradually fills a bounded in-memory cache, targeting a 30-minute refresh. A newly started Render instance needs time to populate prices; missing or stale prices remain explicit. Prices and recommendation results are not written to Turso.
- **Epic Games** (`#/all-games?platform=epic`): currently active free-to-keep base-game offers for the Philippines, descriptions, artwork, deadlines and store links. Upcoming/expired offers, code-only redemptions, demos and trials are excluded. The collection refresh target is 30 minutes, with expiry also checked when serving/displaying it.
- **itch.io** (`#/all-games?platform=itch`): up to 50 released listings, combining the official Most Recent / Released feed and its on-sale equivalent, deduplicated by project URL. The feed may return fewer than the cap. Public details provide available star ratings, public comments, screenshots and developer devlogs. Listings and prices target a 30-minute refresh; creator metadata is filled gradually in a shared cache with a six-hour lifetime and at most one enrichment attempt per ten seconds. Page-published, RSS and page-edit dates are not relabeled as verified release dates or patches.
- **All Games and Genres**: Platform is the third All Games toolbar control, after Search and Genre. Choose Steam, Epic Games or itch.io. Each source has its own genres; changing platform clears incompatible filters. Epic’s working giveaway feed lacks readable genre names, so Genres explains this and offers active games instead. itch.io genre tiles appear as creator metadata arrives, with uncategorized games kept visible. Old `#/epic` and `#/itch` links resolve to All Games for compatibility.
- **Discounts** (`#/discounts`): separate sidebar page with platform, maximum price, currency, on-sale-only and ordering controls. Steam stays within the existing top 100; itch.io stays within the capped released collection. Store-provided original/current prices and discount percentages appear on game cards and All Games. itch.io uses explicit RSS price, fullPrice, discountpercent and saleends fields; no reverse-calculated original prices. Expired or stale prices cannot pass sale/price filters. The currency selector filters the offers and maximum price within one currency, with no conversion.
- **Most Played**: each red bar is current players divided by that game’s peak today, with a percent or At peak label. A current reading above the supplied peak becomes the displayed peak; historical chart records are not rewritten.
- **Game details**: screenshot thumbnails, swipe navigation and enlargement; Total reviews next to player metrics; four metadata fields (release date, latest confirmed update, publisher, studio/developer). Missing fields say Not provided. Steam patch metadata uses a post marked as patch notes. itch.io update metadata uses a developer post identified as an update/patch, not a page-edit time.
- **Navigation**: sidebar fill takes approximately one second from left to right; release drains right to left over 0.8 seconds. Touch holds retain the fill; valid mobile taps allow the exit before navigating. Clickable text receives red hover/press feedback. Reduced-motion settings are respected.

### Temporary inputs and shared data

Budget form inputs exist only in React page state and the current POST request to `/api/budget`. They are not included in URLs, cookies, local/session storage, server request logs or database records. Leaving or refreshing the page clears them. There is no account, Gdaw comment posting or review submission. Shared public catalogue data is held in bounded process memory and must reload after a Render restart; no new database tables or collection archives are created.

### Data availability

Steam public written reviews and full developer posts remain supported. itch.io Comments are public discussions, separate from the star ratings shown under Reviews; a general written-review feed is not available here. Epic's working giveaway feed does not supply readable genres, ratings, written reviews, screenshot galleries or patch notes. Original giveaway prices are retained when supplied. Other Epic product endpoints returned access errors during verification. Epic detail sections link to the store and explain those limits rather than synthesizing content. No cross-store review matching or Fortnite analytics is included. Store-native star ratings are not converted to Steam positive-review percentages. No download counts or estimated ownership totals are displayed.

### Backend additions

`backend/services/discovery.cpp` implements public catalogue refresh, temporary price/media metadata, itch.io detail parsing and the ephemeral budget response. `backend/algorithms/budget_filter.h` holds the budget validation, filtering and ordering. The HTML/RSS reader uses libxml2 with network access disabled inside the parser. Outbound provider requests still use the existing bounded, time-limited HTTPS client; only verified catalogue URLs may be opened for itch.io details. The Docker build installs libxml2 development/runtime packages alongside the existing dependencies. C++17 remains the required language version.

New API routes: `GET /api/epic`, `GET /api/itch`, `POST /api/itch/detail` and `POST /api/budget`. Existing Steam routes retain their purpose and receive additive price/media fields.

### Validation boundaries

The frontend build, Node tests, C++17 syntax check and controlled desktop/mobile browser checks were run locally. The browser fixtures do not prove deployed provider integration. Full backend link/runtime execution, the Docker/Render build, physical Android behavior and live deployed end-to-end verification have not been accepted by these checks. Review those on the existing Render service before presenting the additions as fully deployed.
