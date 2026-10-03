#include "steam_patches.h"
#include "../network/http_client.h"
#include <ctime>
#include <algorithm>

// Hint: use the developer announcement feed, excluding outside news websites.
Json fetchSteamPatches(int appID, long long before) {
    std::string url = "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=" +
        std::to_string(appID) + "&count=12&maxlength=3000&feeds=steam_community_announcements";
    if (before > 0) url += "&enddate=" + std::to_string(before);
    const Json source = requestJson(url).at("appnews").at("newsitems");
    Json posts = Json::array();
    long long oldest = 0;
    for (const auto& row : source) {
        const long long date = row.at("date").get<long long>();
        if (date <= 0 || date > std::time(nullptr) + 300) continue;
        oldest = oldest ? std::min(oldest, date) : date;
        if (row.value("feedname", "") != "steam_community_announcements") continue;
        const std::string id = row.at("gid").get<std::string>();
        if (id.empty() || id.find_first_not_of("0123456789") != std::string::npos) continue;
        bool patch = false;
        for (const auto& tag : row.value("tags", Json::array())) if (tag == "patchnotes") patch = true;
        std::string link = row.value("url", "");
        if (link.rfind("https://store.steampowered.com/news/", 0) != 0 && link.rfind("https://steamcommunity.com/games/", 0) != 0)
            link = "https://store.steampowered.com/news/app/" + std::to_string(appID);
        posts.push_back({{"id", id}, {"title", row.at("title")}, {"time", date},
            {"text", row.value("contents", "")}, {"patch", patch},
            {"url", link}});
    }
    return {{"posts", posts}, {"before", oldest > 0 ? oldest - 1 : 0},
        {"hasMore", source.size() >= 12 && oldest > 1}, {"updatedAt", std::time(nullptr)}};
}
