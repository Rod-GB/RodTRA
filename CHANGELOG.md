# Gdaw update — October 8, 2026

## Interface

- Set the browser title to `Gdaw` and centered the shared G icon in the header and favicon.
- Added Updates beside Homepage with an independent developer-post feed and filters.
- Moved All Games into its own sidebar entry and library layout, separate from Genres.
- Preserved existing genre browsing and the Most Played leaderboard.
- Added complete update text, supported formatting and Steam images, and optional source links.
- Kept older loaded posts when refreshing, and merged edited content by its identifier.

## Backend

- Separated player-count refreshes from metadata, ratings, update collection, and history saving.
- Set player-count checks to 30 seconds and browser cache checks to 10 seconds, with longer delays after failed requests.
- Reduced chart sampling and database checkpoints to every 15 minutes.
- Added an index for timestamp-based history cleanup.
- Corrected overall ratings to use all-language totals and moved review pagination to the supported Steam API.
- Coalesced matching content requests, bounded the cache, and retained stale content during temporary upstream failures.
- Removed unnecessary chart/review serialization from game-list responses and shortened shared-data locks.
- Added controlled startup recovery for temporary database failures while preserving configuration validation.
- Collected update-feed metadata in small batches and fetched complete bodies on demand with `maxlength=0`.

## Scope and checks

- Diagnostics storage, MEGA integration, additional collections, and developer-platform features remain postponed.
- Frontend builds, C++ compilation, backend regression checks, and compiled public Steam API checks completed during development.
- Browser checks were stopped at the user's request; full browser validation was not completed.
- Production Turso credentials and the Docker deployment were not tested. This package has not been committed, pushed, or deployed.
