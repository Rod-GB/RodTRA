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

// Hint: keep chart history and reviews when a game's player count changes.
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
        sortGames(candidates); // Hint: our QuickSort determines the ranking.
        std::vector<Game> selected;
        const long long now = std::time(nullptr);
        for (const auto& reading : candidates) {
            if (!state.running) break;
            Game game = mergeSavedGame(reading, previous);
            if (now - game.detailsUpdatedAt >= DetailsRefreshSeconds) {
                try {
                    if (!fetchSteamDetails(game)) throw std::runtime_error("Game details unavailable.");
                } catch (const std::exception&) {
                    if (game.title.empty()) throw std::runtime_error("Game details unavailable; keeping the previous ranking.");
                    message = "Some game details could not refresh. Saved details are shown.";
                }
            }
            if (game.type != "game") continue;
            if (now - game.reviewsUpdatedAt >= ReviewRefreshSeconds) {
                try { fetchSteamReviews(game); }
                catch (const std::exception&) { message = "Some reviews could not refresh. Check their update time."; }
            }
            // Hint: cached Steam responses never create duplicate chart points.
            if (game.history.empty() || game.history.back().time < game.playersUpdatedAt)
                game.history.push_back({game.playersUpdatedAt, game.currentPlayers});
            if (game.history.size() > MaximumChartReadings) game.history.erase(game.history.begin());
            selected.push_back(game);
            if (selected.size() == DashboardGames) break;
        }
        if (selected.size() != DashboardGames) throw std::runtime_error("Steam ranking incomplete; saved data retained.");
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

// Hint: the backend continues refreshing while the website is open.
void runAutomaticRefresh(DashboardState& state) {
    while (state.running) {
        refreshGames(state);
        for (int second = 0; second < PlayerRefreshSeconds && state.running; ++second)
            std::this_thread::sleep_for(std::chrono::seconds(1));
    }
}

