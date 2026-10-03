#include "api_routes.h"
#include "../algorithms/binary_search.h"
#include "../algorithms/genre_filter.h"
#include "../config/settings.h"
#include <set>
#include <ctime>

std::string queryValue(const Query& query, const std::string& key) {
    const auto found = query.find(key);
    return found == query.end() ? "" : found->second;
}

// Hint: the frontend asks C++ to filter and sort; it does not rank games itself.
Json dashboardResponse(DashboardState& state, const Query& query) {
    std::lock_guard<std::mutex> lock(state.mutex);
    auto games = state.games;
    std::set<std::string> genres;
    for (const auto& game : games) for (const auto& genre : game.genres) genres.insert(genre);
    const std::string search = queryValue(query, "q");
    if (!search.empty() && search.find_first_not_of("0123456789") == std::string::npos) {
        sortGames(games, GameOrder::AppID);
        int index = -1;
        try { index = binarySearchByAppID(games, std::stoi(search)); } catch (...) {}
        games = index >= 0 ? std::vector<Game>{games[index]} : std::vector<Game>{};
        games = filterGames(games, "", queryValue(query, "genre"));
    } else games = filterGames(games, search, queryValue(query, "genre"));
    const auto order = queryValue(query, "sort");
    sortGames(games, order == "rating" ? GameOrder::Rating : order == "title" ? GameOrder::Title : GameOrder::Players);
    // Hint: list requests leave chart history and review text on the detail route.
    Json cards = Json::array();
    for (const auto& game : games) {
        Json card = game;
        card.erase("history");
        card.erase("reviews");
        cards.push_back(std::move(card));
    }
    return {{"games", cards}, {"genres", genres}, {"trackedGames", state.games.size()},
        {"refreshing", state.refreshing}, {"message", state.message}, {"lastCheckedAt", state.lastCheckedAt},
        {"serverTime", std::time(nullptr)}, {"playerRefreshSeconds", PlayerRefreshSeconds},
        {"reviewRefreshSeconds", ReviewRefreshSeconds}, {"sort", order.empty() ? "players" : order}};
}

// Hint: game pages use binary search after QuickSort orders records by ID.
Json gameResponse(DashboardState& state, const Query& query) {
    std::lock_guard<std::mutex> lock(state.mutex);
    auto games = state.games;
    sortGames(games, GameOrder::AppID);
    int appID = 0;
    const auto id = queryValue(query, "id");
    if (id.empty() || id.find_first_not_of("0123456789") != std::string::npos) return {{"error", "Invalid game ID."}};
    try { appID = std::stoi(id); } catch (...) { return {{"error", "Invalid game ID."}}; }
    const int index = binarySearchByAppID(games, appID);
    if (index < 0) return {{"error", "This game is not in the current Steam collection."}};
    return {{"game", games[index]}};
}

