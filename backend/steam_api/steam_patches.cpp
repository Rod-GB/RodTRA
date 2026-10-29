/*
 * Module: steam_patches.cpp
 * Folder: backend/steam_api
 * File: steam_patches.cpp
 * Purpose: Gets and labels Steam developer announcements and updates.
 */

#include "steam_patches.h"
#include "../network/http_client.h"
#include <ctime>
#include <algorithm>
#include <regex>

// use the developer announcement feed, excluding outside news websites.
Json fetchSteamPatches(int appID, long long before, int count) {
    std::string url = "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=" +
        std::to_string(appID) + "&count=" + std::to_string(count) + "&maxlength=0&feeds=steam_community_announcements";
    if (before > 0) url += "&enddate=" + std::to_string(before);
    return parseSteamPatches(requestJson(url).at("appnews").at("newsitems"), appID, count);
}

Json parseSteamPatches(const Json& source, int appID, int count) {
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
        const auto tags = row.value("tags", Json());
        if (tags.is_array()) for (const auto& tag : tags) if (tag.is_string() && tag.get<std::string>() == "patchnotes") patch = true;
        const auto title = row.value("title", "");
        const bool namedPatch = std::regex_search(title, std::regex(R"(\b(patch notes?|hotfix|bug.?fix(?:es)?)\b)", std::regex::icase));
        const bool update = std::regex_search(title, std::regex(R"(\bupdate\b)", std::regex::icase));
        const bool event = std::regex_search(title, std::regex(R"(\b(event|trailer|sale|AMA)\b)", std::regex::icase));
        // Build the exact official post URL from the validated announcement id.
        const std::string link = "https://steamcommunity.com/games/" + std::to_string(appID) + "/announcements/detail/" + id;
        posts.push_back({{"id", id}, {"title", row.at("title")}, {"time", date},
            {"text", row.value("contents", "")}, {"patch", patch || (namedPatch && !event)},
            {"kind", patch || (namedPatch && !event) ? "Patch notes" : update && !event ? "Developer update" : "Developer announcement"},
            {"url", link}});
    }
    std::stable_sort(posts.begin(), posts.end(), [](const auto& a, const auto& b) { return a.at("time").template get<long long>() > b.at("time").template get<long long>(); });
    return {{"posts", posts}, {"before", oldest > 0 ? oldest - 1 : 0},
        {"hasMore", source.size() >= static_cast<std::size_t>(count) && oldest > 1}, {"updatedAt", std::time(nullptr)}};
}
