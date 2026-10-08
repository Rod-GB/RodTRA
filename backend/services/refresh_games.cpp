#include "refresh_games.h"
#include "../config/settings.h"
#include "../algorithms/quick_sort.h"
#include "../steam_api/steam_games.h"
#include "../steam_api/steam_reviews.h"
#include "../database/game_store.h"
#include "../network/http_client.h"
#include "updates_feed.h"
#include <thread>
#include <chrono>
#include <ctime>
#include <set>
#include <algorithm>

static void waitSeconds(DashboardState& state, int seconds) {
    for (int tick = 0; tick < seconds * 10 && state.running; ++tick)
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
}

static void rememberReading(Game& game) {
    if (!game.playersUpdatedAt || game.type != "game" || game.title.empty()) return;
    if (game.history.empty() || game.playersUpdatedAt - game.history.back().time >= HistorySaveSeconds)
        game.history.push_back({game.playersUpdatedAt, game.currentPlayers});
    const auto oldest = std::time(nullptr) - 5 * 86400;
    game.history.erase(std::remove_if(game.history.begin(), game.history.end(),
        [oldest](const auto& point) { return point.time < oldest; }), game.history.end());
    if (game.history.size() > MaximumChartReadings)
        game.history.erase(game.history.begin(), game.history.end() - MaximumChartReadings);
}

// Publish available counts immediately; optional content warnings stay separate.
static void publishLocked(DashboardState& state) {
    state.games.clear();
    if (state.rankings.empty()) {
        for (const auto& entry : state.records)
            if (entry.second.type == "game" && !entry.second.title.empty()) state.games.push_back(entry.second);
    } else {
        for (const auto& rank : state.rankings) {
            const auto found = state.records.find(rank.appID);
            if (found != state.records.end() && found->second.type == "game" && !found->second.title.empty())
                state.games.push_back(found->second);
        }
    }
    state.message.clear();
    for (const auto& message : {state.playerMessage, state.detailsMessage, state.ratingMessage, state.storageMessage})
        if (!message.empty()) { if (!state.message.empty()) state.message += " "; state.message += message; }
}

bool refreshGames(DashboardState& state) {
    {
        std::lock_guard<std::mutex> lock(state.mutex);
        state.refreshing = true;
    }
    try {
        auto ranks = fetchSteamLeaderboard();
        sortGames(ranks);
        std::lock_guard<std::mutex> lock(state.mutex);
        std::set<int> seen;
        for (const auto& rank : ranks) {
            seen.insert(rank.appID);
            auto& game = state.records[rank.appID];
            game.appID = rank.appID;
            if (rank.playersUpdatedAt >= game.playersUpdatedAt) {
                game.currentPlayers = rank.currentPlayers;
                game.peakToday = rank.peakToday;
                game.playersUpdatedAt = rank.playersUpdatedAt;
            }
            rememberReading(game);
        }
        for (auto iterator = state.records.begin(); iterator != state.records.end();)
            if (!seen.count(iterator->first)) iterator = state.records.erase(iterator); else ++iterator;
        state.rankings = std::move(ranks);
        state.playerMessage.clear();
        state.playerRetrySeconds = PlayerRefreshSeconds;
        state.refreshing = false;
        state.lastCheckedAt = std::time(nullptr);
        publishLocked(state);
        return true;
    } catch (const OnlineError& error) {
        std::lock_guard<std::mutex> lock(state.mutex);
        state.playerMessage = "Steam player counts could not refresh. Available counts are retained.";
        state.playerRetrySeconds = std::max(PlayerRefreshSeconds, error.retryAfterSeconds);
        state.refreshing = false;
        state.lastCheckedAt = std::time(nullptr);
        publishLocked(state);
        return false;
    } catch (const std::exception&) {
        std::lock_guard<std::mutex> lock(state.mutex);
        state.playerMessage = "Steam player counts could not refresh. Available counts are retained.";
        state.refreshing = false;
        state.lastCheckedAt = std::time(nullptr);
        publishLocked(state);
        return false;
    }
}

// Details and ratings never hold up the player-count loop.
static void enrichGames(DashboardState& state) {
    std::map<int, long long> detailsRetry, ratingsRetry;
    while (state.running) {
        std::vector<Game> games;
        {
            std::lock_guard<std::mutex> lock(state.mutex);
            for (const auto& entry : state.records) games.push_back(gameSummary(entry.second));
        }
        std::stable_sort(games.begin(), games.end(), [](const auto& left, const auto& right) {
            if (left.title.empty() != right.title.empty()) return left.title.empty();
            return left.currentPlayers > right.currentPlayers;
        });
        int details = 0, ratings = 0, delay = 10;
        bool limited = false;
        const long long now = std::time(nullptr);
        for (auto& game : games) {
            if (!state.running) break;
            if (details >= DetailsPerRefresh) break;
            if (now - game.detailsUpdatedAt < DetailsRefreshSeconds || detailsRetry[game.appID] > now) continue;
            ++details;
            try {
                if (!fetchSteamDetails(game)) throw std::runtime_error("Game details unavailable.");
                std::lock_guard<std::mutex> lock(state.mutex);
                const auto found = state.records.find(game.appID);
                if (found == state.records.end()) continue;
                auto& current = found->second;
                current.title = game.title; current.type = game.type; current.image = game.image;
                current.description = game.description; current.releaseDate = game.releaseDate;
                current.genres = game.genres; current.detailsUpdatedAt = game.detailsUpdatedAt;
                rememberReading(current);
                detailsRetry.erase(game.appID);
                publishLocked(state);
            } catch (const OnlineError& failure) {
                detailsRetry[game.appID] = now + std::max(60, failure.retryAfterSeconds);
                delay = std::max(delay, failure.retryAfterSeconds); limited = true; break;
            } catch (...) { detailsRetry[game.appID] = now + 300; }
        }
        if (!limited) {
            std::stable_sort(games.begin(), games.end(),
                [](const auto& left, const auto& right) { return left.reviewsUpdatedAt < right.reviewsUpdatedAt; });
            for (auto& game : games) {
                if (!state.running || ratings >= RatingsPerRefresh) break;
                if (game.type != "game" || game.title.empty() ||
                    now - game.reviewsUpdatedAt < ReviewRefreshSeconds || ratingsRetry[game.appID] > now) continue;
                ++ratings;
                try {
                    fetchSteamReviews(game);
                    std::lock_guard<std::mutex> lock(state.mutex);
                    const auto found = state.records.find(game.appID);
                    if (found == state.records.end()) continue;
                    auto& current = found->second;
                    current.positiveReviews = game.positiveReviews; current.totalReviews = game.totalReviews;
                    current.rating = game.rating; current.reviews = std::move(game.reviews);
                    current.reviewsUpdatedAt = game.reviewsUpdatedAt;
                    ratingsRetry.erase(game.appID);
                    publishLocked(state);
                } catch (const OnlineError& failure) {
                    ratingsRetry[game.appID] = now + std::max(60, failure.retryAfterSeconds);
                    delay = std::max(delay, failure.retryAfterSeconds); break;
                } catch (...) { ratingsRetry[game.appID] = now + 300; }
            }
        }
        {
            std::lock_guard<std::mutex> lock(state.mutex);
            for (auto iterator = detailsRetry.begin(); iterator != detailsRetry.end();)
                if (!state.records.count(iterator->first)) iterator = detailsRetry.erase(iterator); else ++iterator;
            for (auto iterator = ratingsRetry.begin(); iterator != ratingsRetry.end();)
                if (!state.records.count(iterator->first)) iterator = ratingsRetry.erase(iterator); else ++iterator;
            state.detailsMessage = detailsRetry.empty() ? "" : "Some game details are unavailable; retrying in the background.";
            state.ratingMessage = ratingsRetry.empty() ? "" : "Some ratings could not refresh. Available ratings are retained.";
            publishLocked(state);
        }
        waitSeconds(state, games.empty() ? 1 : delay);
    }
}

// Database retries and fifteen-minute checkpoints run independently.
static void storeGames(DashboardState& state) {
    long long nextSave = 0;
    while (state.running) {
        bool restoring;
        {
            std::lock_guard<std::mutex> lock(state.mutex);
            restoring = state.restorePending;
        }
        if (restoring) {
            try {
                const auto saved = loadGames();
                std::lock_guard<std::mutex> lock(state.mutex);
                for (const auto& game : saved) {
                    if (!state.rankings.empty() && !state.records.count(game.appID)) continue;
                    auto& current = state.records[game.appID];
                    Game merged = current.title.empty() || game.detailsUpdatedAt > current.detailsUpdatedAt ? game : current;
                    if (current.playersUpdatedAt >= game.playersUpdatedAt) {
                        merged.currentPlayers = current.currentPlayers; merged.peakToday = current.peakToday;
                        merged.playersUpdatedAt = current.playersUpdatedAt;
                    }
                    std::map<long long, int> readings;
                    for (const auto& point : game.history) readings[point.time] = point.players;
                    for (const auto& point : current.history) readings[point.time] = point.players;
                    merged.history.clear();
                    for (const auto& point : readings)
                        if (point.first <= merged.playersUpdatedAt) merged.history.push_back({point.first, point.second});
                    rememberReading(merged);
                    current = std::move(merged);
                }
                state.restorePending = false;
                state.storageMessage.clear();
                publishLocked(state);
            } catch (...) { waitSeconds(state, 60); continue; }
        }
        if (std::time(nullptr) >= nextSave) {
            std::vector<Game> snapshot;
            {
                std::lock_guard<std::mutex> lock(state.mutex);
                snapshot = state.games;
            }
            if (!snapshot.empty()) {
                const bool saved = saveGames(snapshot);
                {
                    std::lock_guard<std::mutex> lock(state.mutex);
                    state.storageMessage = saved ? "" : "Live data is available, but chart history could not be saved. Retrying.";
                    publishLocked(state);
                }
                nextSave = std::time(nullptr) + (saved ? HistorySaveSeconds : 60);
            }
        }
        waitSeconds(state, 1);
    }
}

void runAutomaticRefresh(DashboardState& state) {
    {
        std::lock_guard<std::mutex> lock(state.mutex);
        for (const auto& game : state.games) state.records[game.appID] = game;
    }
    std::thread metadata([&] { enrichGames(state); });
    std::thread storage([&] { storeGames(state); });
    std::thread updates([&] { runUpdatesRefresh(state); });
    int failed = 0;
    while (state.running) {
        const auto started = std::chrono::steady_clock::now();
        failed = refreshGames(state) ? 0 : std::min(4, failed + 1);
        int interval = PlayerRefreshSeconds * std::max(1, failed);
        { std::lock_guard<std::mutex> lock(state.mutex); interval = std::max(interval, state.playerRetrySeconds); }
        const int elapsed = static_cast<int>(std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::steady_clock::now() - started).count());
        waitSeconds(state, std::max(1, interval - elapsed));
    }
    metadata.join(); storage.join(); updates.join();
}

