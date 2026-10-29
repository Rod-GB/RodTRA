/*
 * Struct: ItchCheckRetry
 * Folder: backend/algorithms
 * File: catalog_rules.h
 * Purpose: Stores retry times and shares rules for valid genres, checked
 *   itch.io games and current prices.
 */

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

// Offer choices come from the store's complete genre list, not a fixed whitelist.
inline bool catalogGenre(const std::string& genre) {
    return !genre.empty() && genre.size() <= 80 &&
        std::none_of(genre.begin(), genre.end(), [](unsigned char c) { return c < 32; }) &&
        std::any_of(genre.begin(), genre.end(), [](unsigned char c) { return !std::isspace(c); });
}

inline bool hasCatalogGenre(const Json& game) {
    const auto genres = game.find("genres");
    return genres != game.end() && genres->is_array() &&
        std::any_of(genres->begin(), genres->end(), [](const Json& genre) {
            return genre.is_string() && catalogGenre(genre.get<std::string>());
        });
}

struct ItchCheckRetry { long long projectAt, collectionAt; };
inline ItchCheckRetry itchCheckRetry(long long now, int status, int retryAfter) {
    const auto projectAt = now + std::max(120, retryAfter);
    // Rate limits affect the provider; a broken creator page affects only itself.
    return {projectAt, status == 429 ? projectAt : now};
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
