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

Json dashboardResponse(DashboardState& state, const Query& query) {
    std::vector<Game> games;
    Json status;
    {
        std::lock_guard<std::mutex> lock(state.mutex);
        for (const auto& game : state.games) games.push_back(gameSummary(game, false));
        status = {{"trackedGames", state.games.size()}, {"refreshing", state.refreshing}, {"message", state.message},
            {"lastCheckedAt", state.lastCheckedAt}, {"playersStatus", !state.playerMessage.empty() ? "reconnecting" :
                state.rankings.empty() ? "connecting" : "connected"}};
    }
    std::set<std::string> genres;
    for (const auto& game : games) for (const auto& genre : game.genres) genres.insert(genre);
    const auto search = queryValue(query, "q");
    if (!search.empty() && search.find_first_not_of("0123456789") == std::string::npos) {
        sortGames(games, GameOrder::AppID);
        int index = -1;
        try { index = binarySearchByAppID(games, std::stoi(search)); } catch (...) {}
        games = index >= 0 ? std::vector<Game>{games[index]} : std::vector<Game>{};
        games = filterGames(games, "", queryValue(query, "genre"));
    } else games = filterGames(games, search, queryValue(query, "genre"));
    const auto order = queryValue(query, "sort");
    sortGames(games, order == "rating" ? GameOrder::Rating : order == "title" ? GameOrder::Title : GameOrder::Players);
    Json cards = Json::array();
    for (const auto& game : games) {
        Json card = game;
        card.erase("history"); card.erase("reviews"); card.erase("description");
        cards.push_back(std::move(card));
    }
    status["games"] = cards; status["genres"] = genres; status["serverTime"] = std::time(nullptr);
    status["playerRefreshSeconds"] = PlayerRefreshSeconds;
    status["reviewRefreshSeconds"] = ReviewRefreshSeconds;
    status["historySaveSeconds"] = HistorySaveSeconds;
    status["sort"] = order.empty() ? "players" : order;
    return status;
}

Json gameResponse(DashboardState& state, const Query& query) {
    int appID = 0;
    const auto id = queryValue(query, "id");
    if (id.empty() || id.find_first_not_of("0123456789") != std::string::npos) return {{"error", "Invalid game ID."}};
    try { appID = std::stoi(id); } catch (...) { return {{"error", "Invalid game ID."}}; }
    Game selected;
    {
        std::lock_guard<std::mutex> lock(state.mutex);
        std::vector<Game> ids;
        for (const auto& game : state.games) { Game record; record.appID = game.appID; ids.push_back(record); }
        sortGames(ids, GameOrder::AppID);
        if (binarySearchByAppID(ids, appID) < 0) return {{"error", "This game is not in the current Steam collection."}};
        selected = state.records.at(appID);
    }
    return {{"game", selected}, {"historySaveSeconds", HistorySaveSeconds}};
}

