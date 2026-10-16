#pragma once
#include "../models/game.h"
#include <set>
#include <algorithm>
#include <cctype>

inline std::string lowerText(std::string text) {
    std::transform(text.begin(), text.end(), text.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return text;
}

inline bool gameplayGenre(const std::string& genre) {
    static const std::set<std::string> other = {"early access", "free to play", "free-to-play", "animation & modeling",
        "design & illustration", "photo editing", "software training", "utilities", "video production", "audio production",
        "web publishing", "education", "accounting", "software"};
    return !genre.empty() && !other.count(lowerText(genre));
}

inline bool publishedItchGame(const Json& game, long long now) {
    return game.value("metadataCheckedAt", 0LL) > 0 && now - game.value("metadataCheckedAt", 0LL) < 21600 &&
        game.value("eligible", false) && !game.value("aiDisclosed", false);
}

inline bool currentPrice(const Json& price, long long now) {
    const auto end = price.value("endsAt", 0LL);
    return price.value("available", false) && !price.value("stale", false) && price.value("checkedAt", 0LL) > 0 &&
        now - price.value("checkedAt", 0LL) < 1800 && (end == 0 || end > now);
}
