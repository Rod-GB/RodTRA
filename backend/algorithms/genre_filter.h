#pragma once
#include "../models/game.h"
#include <cctype>

inline std::string lowercase(std::string text) {
    for (char& letter : text) letter = static_cast<char>(std::tolower(static_cast<unsigned char>(letter)));
    return text;
}

// Hint: linear search checks each game's name and exact genre.
inline std::vector<Game> filterGames(const std::vector<Game>& games,
                                    const std::string& query, const std::string& genre) {
    std::vector<Game> matches;
    for (const auto& game : games) {
        bool genreMatches = genre.empty();
        for (const auto& tag : game.genres)
            if (lowercase(tag) == lowercase(genre)) genreMatches = true;
        if (genreMatches && lowercase(game.title).find(lowercase(query)) != std::string::npos)
            matches.push_back(game);
    }
    return matches;
}
