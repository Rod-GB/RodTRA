#include "game_store.h"
#include "turso_client.h"
#include "../config/settings.h"
#include <set>
#include <stdexcept>
#include <map>
#include <ctime>
#include <algorithm>

static std::string lastSaved;
static std::map<int, long long> savedTimes;
static bool historyReady = false;
static long long lastPruned = 0;

static void prepareHistory() {
    if (historyReady) return;
    executeSql("CREATE TABLE IF NOT EXISTS player_history (app_id INTEGER NOT NULL, time INTEGER NOT NULL, players INTEGER NOT NULL, PRIMARY KEY(app_id, time))");
    historyReady = true;
}

// the same database row supports both the old eight games and a larger collection.
std::vector<Game> loadGames() {
    executeSql("CREATE TABLE IF NOT EXISTS dashboard (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)");
    const Json rows = executeSql("SELECT data FROM dashboard WHERE id = 1").at("rows");
    if (rows.empty()) return {};
    const std::string payload = rows.at(0).at(0).at("value").get<std::string>();
    const Json saved = Json::parse(payload);
    if (saved.at("version") != 1) throw std::runtime_error("Unknown saved data version.");
    auto games = saved.at("games").get<std::vector<Game>>();
    if (games.empty() || games.size() > MaximumTrackedGames) throw std::runtime_error("Saved collection is invalid.");
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
    prepareHistory();
    std::map<int, std::size_t> positions;
    Json ids = Json::array();
    std::string placeholders;
    for (std::size_t index = 0; index < games.size(); ++index) {
        positions[games[index].appID] = index;
        if (!placeholders.empty()) placeholders += ',';
        placeholders += '?';
        ids.push_back({{"type", "integer"}, {"value", std::to_string(games[index].appID)}});
    }
    // load only this collection's latest 1,440 readings per game.
    const auto historyRows = executeSql("SELECT json_group_array(json_array(app_id, time, players)) FROM ("
        "SELECT app_id, time, players FROM (SELECT app_id, time, players, "
        "ROW_NUMBER() OVER (PARTITION BY app_id ORDER BY time DESC) AS position FROM player_history WHERE app_id IN (" +
        placeholders + ")) WHERE position <= " + std::to_string(MaximumChartReadings) + " ORDER BY time)", ids).at("rows");
    const Json history = Json::parse(historyRows.at(0).at(0).at("value").get<std::string>());
    for (const auto& row : history) {
        const int appID = row.at(0).get<int>();
        const long long time = row.at(1).get<long long>();
        const int players = row.at(2).get<int>();
        if (appID <= 0 || time <= 0 || players < 0) throw std::runtime_error("Saved chart readings are invalid.");
        savedTimes[appID] = std::max(savedTimes[appID], time);
        const auto found = positions.find(appID);
        if (found == positions.end()) continue;
        Game& game = games[found->second];
        if (time <= game.playersUpdatedAt && (game.history.empty() || time > game.history.back().time))
            game.history.push_back({time, players});
    }
    for (auto& game : games) {
        if (game.history.size() > MaximumChartReadings)
            game.history.erase(game.history.begin(), game.history.end() - MaximumChartReadings);
    }
    lastSaved = payload;
    return games;
}

// bound parameters save the summary after chart inserts succeed.
bool saveGames(const std::vector<Game>& games) {
    try {
        prepareHistory();
        // migrate old readings once, then insert only newly received readings.
        Json arguments = Json::array();
        std::string values;
        auto writeReadings = [&] {
            if (arguments.empty()) return;
            executeSql("INSERT OR IGNORE INTO player_history(app_id, time, players) VALUES " + values, arguments);
            arguments.clear();
            values.clear();
        };
        for (const auto& game : games) for (const auto& reading : game.history) {
            if (reading.time <= savedTimes[game.appID]) continue;
            if (!values.empty()) values += ',';
            values += "(?, ?, ?)";
            for (long long value : {static_cast<long long>(game.appID), reading.time, static_cast<long long>(reading.players)})
                arguments.push_back({{"type", "integer"}, {"value", std::to_string(value)}});
            if (arguments.size() >= 900) writeReadings();
        }
        writeReadings();
        for (const auto& game : games) if (!game.history.empty()) savedTimes[game.appID] = std::max(savedTimes[game.appID], game.history.back().time);
        const long long now = std::time(nullptr);
        if (now - lastPruned >= 3600) {
            executeSql("DELETE FROM player_history WHERE time < ?", {{{"type", "integer"}, {"value", std::to_string(now - 5 * 86400)}}});
            lastPruned = now;
        }
        auto summary = games;
        for (auto& game : summary) { game.history.clear(); game.reviews.clear(); }
        const std::string payload = Json({{"version", 1}, {"games", summary}}).dump();
        if (payload == lastSaved) return true;
        const Json data = {{{"type", "text"}, {"value", payload}}};
        executeSql("INSERT INTO dashboard (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data", data);
        lastSaved = payload;
        return true;
    } catch (...) { return false; }
}
