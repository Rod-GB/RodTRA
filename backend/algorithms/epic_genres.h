/*
 * Module: epic_genres.h
 * Folder: backend/algorithms
 * File: epic_genres.h
 * Purpose: Reads explicit Epic genre labels and supplies reviewed genres for
 *   known games without guessing unknown tags.
 */

#pragma once
#include "catalog_rules.h"
#include <map>

inline std::vector<std::string> epicGenreNames(const Json& row, const std::string& slug) {
    std::set<std::string> genres;
    // Accept readable genre tags only when Epic identifies the tag as a genre.
    // Numeric IDs, platform tags and gameplay features must never be guessed.
    if (row.contains("tags") && row["tags"].is_array()) for (const auto& tag : row["tags"]) {
        if (!tag.is_object() || !tag.value("name", Json()).is_string() || !tag.value("groupName", Json()).is_string()) continue;
        const auto name = tag["name"].get<std::string>();
        if (lowerText(tag["groupName"].get<std::string>()) == "genre" && catalogGenre(name)) genres.insert(name);
    }
    // Small reviewed fallback, verified on Epic's own product pages 2026-10-29.
    // The public promotion feed currently supplies IDs, and product/GraphQL
    // requests returned 403. Unknown/new offers stay visible without a genre.
    // https://store.epicgames.com/en-US/p/sker-ritual-aac702
    // https://store.epicgames.com/en-US/p/home-19212a
    static const std::map<std::string, std::vector<std::string>> verified = {
        {"sker-ritual-aac702", {"Action", "Horror", "Shooter"}},
        {"home-19212a", {"Adventure", "Horror", "Indie"}},
    };
    const auto found = verified.find(slug);
    if (found != verified.end()) genres.insert(found->second.begin(), found->second.end());
    return {genres.begin(), genres.end()};
}
