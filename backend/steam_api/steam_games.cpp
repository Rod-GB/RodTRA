#include "steam_games.h"
#include "../network/http_client.h"
#include "../config/settings.h"
#include <set>
#include <stdexcept>
#include <ctime>

// discover Steam's current top 100; no hand-written game list.
std::vector<Game> fetchSteamLeaderboard() {
    const Json response = requestJson(
        "https://api.steampowered.com/ISteamChartsService/GetGamesByConcurrentPlayers/v1/").at("response");
    const long long time = response.at("last_update").get<long long>();
    if (time <= 0 || time > std::time(nullptr) + 300) throw std::runtime_error("Invalid Steam timestamp.");
    std::vector<Game> games;
    std::set<int> seen;
    for (const auto& row : response.at("ranks")) {
        Game game;
        game.appID = row.at("appid").get<int>();
        game.currentPlayers = row.at("concurrent_in_game").get<int>();
        game.peakToday = row.at("peak_in_game").get<int>();
        game.playersUpdatedAt = time;
        if (game.appID > 0 && game.currentPlayers >= 0 && game.peakToday >= 0 && seen.insert(game.appID).second)
            games.push_back(game);
        if (games.size() >= MaximumTrackedGames) break;
    }
    if (games.size() < DashboardGames) throw std::runtime_error("Steam returned fewer than eight games.");
    return games;
}

// Steam supplies the title, artwork and genres too.
bool fetchSteamDetails(Game& game) {
    const Json result = requestJson("https://store.steampowered.com/api/appdetails?appids=" +
        std::to_string(game.appID) + "&l=english").at(std::to_string(game.appID));
    if (!result.value("success", false)) return false;
    const Json data = result.at("data");
    game.title = data.at("name").get<std::string>();
    game.type = data.value("type", "");
    game.image = data.value("header_image", "");
    game.description = data.value("short_description", "");
    game.releaseDate = data.value("release_date", Json::object()).value("date", "");
    game.genres.clear();
    for (const auto& genre : data.value("genres", Json::array()))
        game.genres.push_back(genre.at("description").get<std::string>());
    game.detailsUpdatedAt = std::time(nullptr);
    return !game.title.empty();
}
