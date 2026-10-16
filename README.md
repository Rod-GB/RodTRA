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
- Opening game details loads complete Steam developer posts; metadata and the Patch notes tab share the result. The website Updates page uses the bundled changelog and makes no Steam requests.
- Matching content requests share a cache. Failed refreshes retain available cached content.
- Temporary database connection failures at startup allow live Steam loading while the database retries. Invalid database configuration remains an explicit startup error.

The Steam collection remains its existing top 100. Epic giveaways and a capped itch.io released collection are separate sources. Developer accounts, diagnostics storage and MEGA integration are postponed.

## Player discovery features (Version 1.2.1, 2026-10-17)

The deployment remains the existing C++17 Docker service on Render, with Turso for the existing saved Steam collection and chart history. Existing filenames, the Steam top-100 limit, the Top 10 leaderboard and player/history refresh logic are retained. A returned peak is raised to the current reading if needed; existing chart history is not rewritten. No Windows executable is included or required for uploading this source package.

- **Budget Finder** (`#/budget`): choose Steam, itch.io or Epic. Steam uses PHP prices and positive-review percentages; itch.io uses its listed currency and star ratings; Epic returns current free-to-keep giveaways without unsupported rating/genre filters. Choose up to three of the full set of store-supplied genre labels. Epic shows free games directly without a budget form. The backend filters the appropriate shared collection and uses quicksort. Each game fits the budget individually, within one selected currency; no currency conversion is applied. Unknown/stale prices, expired offers, and blocked itch.io projects cannot pass. Maximum budget: 100,000 in the selected currency with two decimal places. Changing any choice cancels pending requests and clears old results.
- **Prices**: Philippine store prices, discounts, free-to-play labels and check times appear alongside game information. An independent worker gradually fills a bounded in-memory cache, targeting a 30-minute refresh. A newly started Render instance needs time to populate prices; missing or stale prices remain explicit. Prices and recommendation results are not written to Turso.
- **Epic Games** (`#/all-games?platform=epic`): currently active free-to-keep base-game offers for the Philippines, descriptions, artwork, deadlines and store links. Upcoming/expired offers, code-only redemptions, demos and trials are excluded. The collection refresh target is 30 minutes, with expiry also checked when serving/displaying it.
- **itch.io** (`#/all-games?platform=itch`): up to 50 recent listings from the official Most Recent / Released RSS, preserving its order. Projects are held from public listings while creator metadata is checked. Explicit AI Assisted / AI Generated disclosures and tags, identified asset/tool listings, and projects no longer marked Released are excluded. Ordinary enemy AI/pathfinding is not a generative-AI declaration. Missing disclosures are not treated as proof of AI-free development. Explicit demos receive a Demo label. The original source may provide fewer than 50 entries, and exclusions or pending checks can reduce the count further. The cache is shared process memory, not Turso; listings/prices target 30 minutes and creator checks six hours. A separate worker checks one creator page at a time, at most once every two seconds. Individual creator failures delay only that project; HTTP 429 pauses the checker for the provider retry interval. The checker rotates through pending projects and does not fetch comments, galleries or devlogs. Those load on demand when opening game details. Restarting Render starts those checks again, so eligible entries appear progressively. Sales refresh independently and never add older projects to the recent-release list. Available creator ratings, screenshots, comments and devlogs load through the same bounded cache. No page/RSS edit date is called a verified release date or patch.

- **All Games and Genres**: Platform is the third All Games toolbar control, after Search and Genre. Choose Steam, Epic Games or itch.io. Each source has its own genres; changing platform clears incompatible filters. Epic’s working giveaway feed lacks readable genre names, so Genres explains this and offers active games instead. itch.io genre tiles appear as creator metadata arrives, with uncategorized games kept visible. Old `#/epic` and `#/itch` links resolve to All Games for compatibility.
- **Discounts** (`#/discounts`): separate sidebar page with platform, maximum price, currency, on-sale-only and ordering controls. Steam stays within the existing top 100; itch.io stays within the capped released collection. Store-provided original/current prices and discount percentages appear on game cards and All Games. A failed itch.io sale refresh retries separately after a delay and keeps prior verified prices with freshness/expiry checks. Provider failures and genuinely empty offer lists have different messages; server diagnostics record only a fixed source name, HTTP status or parser failure, never request bodies or secrets. itch.io uses explicit RSS price, fullPrice, discountpercent and saleends fields; no reverse-calculated original prices. Expired or stale prices cannot pass sale/price filters. The currency selector filters the offers and maximum price within one currency, with no conversion.
- **Most Played**: each red bar is current players divided by that game’s peak today, with a percent or At peak label. A current reading above the supplied peak becomes the displayed peak; historical chart records are not rewritten.
- **Game details**: screenshot thumbnails, swipe navigation and enlargement; Total reviews next to player metrics; four metadata fields (release date, latest available developer update, publisher, studio/developer). Missing fields say Not provided. Steam metadata and the Updates tab share one paginated source state. Explicit patch tags and clear patch/update titles are recognized; announcements retain their own label, and the newest available announcement is an honest fallback when no game update is supplied. Metadata links use the exact validated announcement id rather than a generic news page. itch.io metadata likewise uses dated developer posts. Loading, error, saved and absent content are distinct states.
- **Dashboard counts**: Games listed totals eligible per-store listings, with Steam/itch.io/Epic breakdowns. Steam ranked entries, published games, excluded non-game types and pending metadata are distinct. Missing sources show loading/unavailable. The total shows actual available listings with a compact store breakdown; background checks never add a speculative plus sign. Detailed count information sits behind About these numbers. A game sold on two stores counts once in each store; cross-store identity matching is not claimed.
- **Navigation**: sidebar fill takes approximately one second from left to right; release drains right to left over 0.8 seconds. Touch holds retain the fill; valid mobile taps allow the exit before navigating. Clickable text receives red hover/press feedback. Reduced-motion settings are respected.

### Temporary inputs and shared data

Budget form inputs exist only in React page state and the current POST request to `/api/budget`. They are not included in URLs, cookies, local/session storage, server request logs or database records. Leaving or refreshing the page clears them. There is no account, Gdaw comment posting or review submission. Shared public catalogue data is held in bounded process memory and must reload after a Render restart; no new database tables or collection archives are created.

### Data availability

Steam public written reviews and full developer posts remain supported. itch.io Comments are public discussions, separate from the star ratings shown under Reviews; a general written-review feed is not available here. Epic's working giveaway feed does not supply readable genres, ratings, written reviews, screenshot galleries or patch notes. Original giveaway prices are retained when supplied. Other Epic product endpoints returned access errors during verification. Epic details show the available overview and link to the store for updates; unsupported comment/review/update tabs are omitted. No cross-store review matching or Fortnite analytics is included. Store-native star ratings are not converted to Steam positive-review percentages. No download counts or estimated ownership totals are displayed.

### Backend additions

`backend/services/discovery.cpp` implements public catalogue refresh, temporary price/media metadata, itch.io detail parsing and the ephemeral budget response. `backend/algorithms/budget_filter.h` holds the budget validation, filtering and ordering. The HTML/RSS reader uses libxml2 with network access disabled inside the parser. Outbound provider requests still use the existing bounded, time-limited HTTPS client; only verified catalogue URLs may be opened for itch.io details. The Docker build installs libxml2 development/runtime packages alongside the existing dependencies. C++17 remains the required language version.

API additions: `GET /api/epic`, `GET /api/itch`, `POST /api/itch/detail`, `GET /api/catalog-summary`, `GET /api/budget/options`, and `POST /api/budget`. Budget bodies/results are never persisted. Only checked eligible itch.io entries may be opened through the public detail endpoint. Existing Steam routes retain their purpose and receive additive price/media fields.

### Validation boundaries

The frontend build, Node tests, C++17 syntax check and controlled desktop/mobile browser checks were run locally. `backend/tests/discovery_tests.cpp` exercises the actual C++ parsers, disclosure rules, currency/rating filters, expiry and count distinctions; CTest is wired into the existing Linux Docker build before the runtime image is produced. No Windows project executable is built. Local C++ test execution remains NOT RUN because Docker and WSL are unavailable; syntax checking does not execute assertions. The browser fixtures do not prove deployed provider integration. Full backend link/runtime execution, the Docker/Render build, physical Android behavior and live deployed end-to-end verification have not been accepted by these checks. Review those on the existing Render service before presenting the additions as fully deployed.
