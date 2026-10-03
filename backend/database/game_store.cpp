#include "game_store.h"
#include "turso_client.h"
#include "../config/settings.h"
#include <set>
#include <stdexcept>

static std::string lastSaved;

// Hint: one database row holds the eight games, reviews and chart readings.
std::vector<Game> loadGames() {
    executeSql("CREATE TABLE IF NOT EXISTS dashboard (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)");
    const Json rows = executeSql("SELECT data FROM dashboard WHERE id = 1").at("rows");
    if (rows.empty()) return {};
    const std::string payload = rows.at(0).at(0).at("value").get<std::string>();
    const Json saved = Json::parse(payload);
    if (saved.at("version") != 1) throw std::runtime_error("Unknown saved data version.");
    auto games = saved.at("games").get<std::vector<Game>>();
    if (games.size() != DashboardGames) throw std::runtime_error("Saved dashboard is incomplete.");
    std::set<int> seen;
    for (const auto& game : games) {
        if (game.appID <= 0 || game.type != "game" || game.title.empty() ||
            game.currentPlayers < 0 || game.peakToday < 0 || game.playersUpdatedAt <= 0 ||
            game.positiveReviews < 0 || game.totalReviews < game.positiveReviews ||
            game.history.size() > MaximumChartReadings || !seen.insert(game.appID).second)
            throw std::runtime_error("Saved game data is invalid.");
        long long previous = 0;
        for (const auto& reading : game.history) {
            if (reading.time <= previous || reading.players < 0 || reading.time > game.playersUpdatedAt)
                throw std::runtime_error("Saved chart readings are invalid.");
            previous = reading.time;
        }
    }
    lastSaved = payload;
    return games;
}

// Hint: a bound parameter saves everything atomically, without SQL string mixing.
bool saveGames(const std::vector<Game>& games) {
    try {
        const std::string payload = Json({{"version", 1}, {"games", games}}).dump();
        if (payload == lastSaved) return true;
        const Json arguments = {{{"type", "text"}, {"value", payload}}};
        executeSql("INSERT INTO dashboard (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data", arguments);
        lastSaved = payload;
        return true;
    } catch (...) { return false; }
}
