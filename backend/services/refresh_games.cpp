#include "refresh_games.h"
#include "../config/settings.h"
#include "../algorithms/binary_search.h"
#include "../steam_api/steam_games.h"
#include "../steam_api/steam_reviews.h"
#include "../database/game_store.h"
#include <thread>
#include <chrono>
#include <ctime>
#include <iostream>

// keep chart history and reviews when a game's player count changes.
static Game mergeSavedGame(const Game& reading, const std::vector<Game>& previous) {
    Game game = reading;
    const int found = binarySearchByAppID(previous, reading.appID);
    if (found >= 0) {
        game = previous[found];
        if (reading.playersUpdatedAt < game.playersUpdatedAt)
            throw std::runtime_error("Steam sent an older reading; keeping the saved data.");
        game.currentPlayers = reading.currentPlayers;
        game.peakToday = reading.peakToday;
        game.playersUpdatedAt = reading.playersUpdatedAt;
    }
    return game;
}

bool refreshGames(DashboardState& state) {
    static std::size_t detailsStart = 0, ratingsStart = 0;
    std::vector<Game> previous;
    {
        std::lock_guard<std::mutex> lock(state.mutex);
        state.refreshing = true;
        previous = state.games;
    }
    sortGames(previous, GameOrder::AppID);
    std::string message;
    bool success = false;
    try {
        auto candidates = fetchSteamLeaderboard();
        sortGames(candidates); // our QuickSort determines the ranking.
        std::vector<Game> selected;
        const long long now = std::time(nullptr);
        // rotate a small group of Steam requests rather than requesting 100 at once.
        for (std::size_t index = 0; index < candidates.size(); ++index) {
            if (!state.running) break;
            Game game = mergeSavedGame(candidates[index], previous);
            const auto distance = (index + candidates.size() - detailsStart % candidates.size()) % candidates.size();
            if (distance < DetailsPerRefresh && now - game.detailsUpdatedAt >= DetailsRefreshSeconds) {
                try {
                    Game updated = game;
                    if (!fetchSteamDetails(updated)) throw std::runtime_error("Game details unavailable.");
                    game = std::move(updated);
                } catch (const std::exception&) {
                    message = "Some Steam details could not refresh. Available games are shown.";
                }
            }
            if (game.type != "game" || game.title.empty()) continue;
            // cached Steam responses never create duplicate chart points.
            if (game.history.empty() || game.history.back().time < game.playersUpdatedAt)
                game.history.push_back({game.playersUpdatedAt, game.currentPlayers});
            if (game.history.size() > MaximumChartReadings) game.history.erase(game.history.begin());
            selected.push_back(game);
        }
        detailsStart = (detailsStart + DetailsPerRefresh) % candidates.size();
        if (selected.empty()) throw std::runtime_error("Steam games unavailable; saved data retained.");
        for (std::size_t step = 0; step < selected.size() && step < RatingsPerRefresh && state.running; ++step) {
            Game& game = selected[(ratingsStart + step) % selected.size()];
            if (now - game.reviewsUpdatedAt < ReviewRefreshSeconds) continue;
            try { fetchSteamReviews(game); }
            catch (const std::exception&) { message = "Some ratings could not refresh. Saved ratings are shown."; }
        }
        ratingsStart = (ratingsStart + RatingsPerRefresh) % selected.size();
        if (!state.running) throw std::runtime_error("Refresh stopped; saved data retained.");
        if (!saveGames(selected))
            message = "Live counts updated. Chart history could not be saved.";
        {
            std::lock_guard<std::mutex> lock(state.mutex);
            state.games = selected;
        }
        success = true;
    } catch (const std::exception& error) { message = error.what(); }
    {
        std::lock_guard<std::mutex> lock(state.mutex);
        state.message = message;
        state.lastCheckedAt = std::time(nullptr);
        state.refreshing = false;
    }
    std::cout << (success ? "Steam refresh complete. " : "Steam refresh unavailable. ") << message << '\n';
    return success;
}

// the backend continues refreshing while the website is open.
void runAutomaticRefresh(DashboardState& state) {
    while (state.running) {
        refreshGames(state);
        for (int second = 0; second < PlayerRefreshSeconds && state.running; ++second)
            std::this_thread::sleep_for(std::chrono::seconds(1));
    }
}

