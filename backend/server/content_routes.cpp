#include "content_routes.h"
#include "../steam_api/steam_reviews.h"
#include "../steam_api/steam_patches.h"
#include "../services/content_cache.h"
#include <ctime>

Json contentResponse(DashboardState& state, const Query& query, bool patches) {
    int appID = 0;
    const auto id = queryValue(query, "id");
    if (id.empty() || id.find_first_not_of("0123456789") != std::string::npos)
        return {{"error", "Invalid game ID."}};
    try { appID = std::stoi(id); } catch (...) { return {{"error", "Invalid game ID."}}; }
    {
        std::lock_guard<std::mutex> lock(state.mutex);
        bool found = false;
        for (const auto& game : state.games) if (game.appID == appID) found = true;
        if (!found) return {{"error", "This game is not in the current Steam collection."}};
    }
    try {
        if (patches) {
            const auto value = queryValue(query, "before");
            if (!value.empty() && value.find_first_not_of("0123456789") != std::string::npos)
                return {{"error", "Invalid update date."}};
            const long long before = value.empty() ? 0 : std::stoll(value);
            if (before < 0 || before > std::time(nullptr)) return {{"error", "Invalid update date."}};
            return cachedSteamContent("patches:" + id + ':' + value, 600, [&] { return fetchSteamPatches(appID, before); });
        }
        auto cursor = queryValue(query, "cursor");
        if (cursor.empty()) cursor = "*";
        if (cursor.size() > 1024) return {{"error", "Invalid review page."}};
        const auto sort = queryValue(query, "sort");
        if (!sort.empty() && sort != "recent" && sort != "helpful") return {{"error", "Invalid review order."}};
        return cachedSteamContent("reviews:" + id + ':' + sort + ':' + cursor, 120,
            [&] { return fetchSteamReviewPage(appID, sort, cursor); });
    } catch (...) { return {{"error", patches ? "Steam updates are temporarily unavailable. Try again." : "Steam reviews are temporarily unavailable. Try again."}}; }
}
