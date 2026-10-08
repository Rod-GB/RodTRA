#include "updates_feed.h"
#include "content_cache.h"
#include "../steam_api/steam_patches.h"
#include "../network/http_client.h"
#include "../config/settings.h"
#include <thread>
#include <chrono>
#include <map>
#include <set>
#include <algorithm>
#include <ctime>

static void pauseFeed(DashboardState& state, int seconds) {
    for (int tick = 0; tick < seconds * 10 && state.running; ++tick)
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
}

// Collect a few games at a time only while the global feed is being viewed.
void runUpdatesRefresh(DashboardState& state) {
    std::map<int, long long> checked;
    std::set<int> failures;
    while (state.running) {
        std::vector<Game> games;
        int preferred = 0;
        {
            std::lock_guard<std::mutex> lock(state.mutex);
            if (std::time(nullptr) - state.updatesRequestedAt <= ContentRefreshSeconds) {
                for (const auto& game : state.games) games.push_back(gameSummary(game));
                preferred = state.updatesPreferredGame;
            }
        }
        if (games.empty()) { pauseFeed(state, 1); continue; }
        std::stable_sort(games.begin(), games.end(), [&](const auto& left, const auto& right) {
            if ((left.appID == preferred) != (right.appID == preferred)) return left.appID == preferred;
            return checked[left.appID] < checked[right.appID];
        });
        int fetched = 0, delay = UpdatesBatchSeconds;
        for (const auto& game : games) {
            if (!state.running || fetched >= UpdatesBatchSize) break;
            const long long now = std::time(nullptr);
            if (now - checked[game.appID] < ContentRefreshSeconds) continue;
            ++fetched;
            try {
                const auto page = cachedSteamContent("update-head:" + std::to_string(game.appID), ContentRefreshSeconds,
                    [&] { return fetchSteamPatches(game.appID, 0, 3); });
                if (page.contains("message")) failures.insert(game.appID); else failures.erase(game.appID);
                checked[game.appID] = page.contains("message") ? now - ContentRefreshSeconds + 60 : now;
                std::lock_guard<std::mutex> lock(state.mutex);
                std::set<int> current;
                for (const auto& item : state.games) current.insert(item.appID);
                if (!current.count(game.appID)) continue;
                std::map<std::string, Json> entries;
                for (const auto& post : state.updates)
                    if (current.count(post.at("appID").get<int>()))
                        entries[std::to_string(post.at("appID").get<int>()) + ':' + post.at("id").get<std::string>()] = post;
                for (auto post : page.at("posts")) {
                    post["version"] = std::to_string(std::hash<std::string>{}(post.value("text", "")));
                    post.erase("text");
                    post["appID"] = game.appID; post["gameTitle"] = game.title; post["gameImage"] = game.image;
                    entries[std::to_string(game.appID) + ':' + post.at("id").get<std::string>()] = std::move(post);
                }
                std::vector<Json> posts;
                for (auto& item : entries) posts.push_back(std::move(item.second));
                std::sort(posts.begin(), posts.end(), [](const auto& left, const auto& right) {
                    if (left.at("time") != right.at("time")) return left.at("time").template get<long long>() > right.at("time").template get<long long>();
                    return left.at("id").template get<std::string>() < right.at("id").template get<std::string>();
                });
                if (posts.size() > 300) posts.resize(300);
                state.updates = posts;
                state.updatesCheckedAt = std::time(nullptr);
            } catch (const OnlineError& error) {
                failures.insert(game.appID);
                checked[game.appID] = now - ContentRefreshSeconds + std::max(60, error.retryAfterSeconds);
                delay = std::max(delay, error.retryAfterSeconds);
                break;
            } catch (...) {
                failures.insert(game.appID);
                checked[game.appID] = now - ContentRefreshSeconds + 60;
            }
        }
        {
            std::lock_guard<std::mutex> lock(state.mutex);
            for (auto iterator = failures.begin(); iterator != failures.end();)
                if (!state.records.count(*iterator)) iterator = failures.erase(iterator); else ++iterator;
            state.updatesMessage = failures.empty() ? "" : "Some Steam updates could not refresh. Available posts are retained.";
        }
        pauseFeed(state, delay);
    }
}

Json updatesResponse(DashboardState& state, const Query& query) {
    const auto game = queryValue(query, "game");
    int appID = 0;
    if (!game.empty()) {
        if (game.find_first_not_of("0123456789") != std::string::npos) return {{"error", "Invalid game ID."}};
        try { appID = std::stoi(game); } catch (...) { return {{"error", "Invalid game ID."}}; }
    }
    std::lock_guard<std::mutex> lock(state.mutex);
    if (appID && !state.records.count(appID)) return {{"error", "Game is outside the current collection."}};
    state.updatesRequestedAt = std::time(nullptr);
    state.updatesPreferredGame = appID;
    const auto type = queryValue(query, "type");
    Json posts = Json::array();
    for (const auto& post : state.updates) {
        if (!state.records.count(post.at("appID").get<int>())) continue;
        if (appID && post.at("appID") != appID) continue;
        if (type == "patch" && !post.value("patch", false)) continue;
        if (type == "news" && post.value("patch", false)) continue;
        posts.push_back(post);
    }
    return {{"posts", posts}, {"updatedAt", state.updatesCheckedAt}, {"loading", !state.updatesCheckedAt},
        {"message", state.updatesMessage}, {"refreshSeconds", ContentRefreshSeconds}};
}

// Load the selected complete post on demand rather than sending all bodies in the feed.
Json updatePostResponse(DashboardState& state, const Query& query) {
    const auto id = queryValue(query, "id"), postID = queryValue(query, "post"), time = queryValue(query, "time");
    if (id.empty() || postID.empty() || time.empty() || id.find_first_not_of("0123456789") != std::string::npos ||
        postID.size() > 32 || postID.find_first_not_of("0123456789") != std::string::npos || time.find_first_not_of("0123456789") != std::string::npos)
        return {{"error", "Invalid update request."}};
    try {
        const int appID = std::stoi(id);
        const long long posted = std::stoll(time);
        if (posted <= 0 || posted > std::time(nullptr) + 300) return {{"error", "Invalid update date."}};
        {
            std::lock_guard<std::mutex> lock(state.mutex);
            if (!state.records.count(appID)) return {{"error", "Game is outside the current collection."}};
        }
        const auto revision = queryValue(query, "revision");
        if (revision.size() > 32 || revision.find_first_not_of("0123456789") != std::string::npos)
            return {{"error", "Invalid update revision."}};
        const auto page = cachedSteamContent("update-post:" + id + ':' + postID + ':' + revision, ContentRefreshSeconds,
            [&] { return fetchSteamPatches(appID, posted + 1); });
        for (const auto& post : page.at("posts")) if (post.at("id") == postID)
            return {{"post", post}, {"message", page.value("message", "")}};
        return {{"error", "This developer update is no longer available in the Steam feed."}};
    } catch (...) { return {{"error", "The full update could not be loaded. Try again."}}; }
}
