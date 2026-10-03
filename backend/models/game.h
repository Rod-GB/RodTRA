#pragma once
#include <string>
#include <vector>
#include <nlohmann/json.hpp>
using Json = nlohmann::json;

// Hint: chart readings use Steam's timestamp.
struct PlayerReading {
    long long time = 0;
    int players = 0;
    NLOHMANN_DEFINE_TYPE_INTRUSIVE_WITH_DEFAULT(PlayerReading, time, players)
};

// Hint: Steam reviews have a recommendation, not a star score.
struct Review {
    std::string id, steamID, text;
    bool recommended = false;
    int minutesPlayed = 0, helpfulVotes = 0;
    long long time = 0;
    NLOHMANN_DEFINE_TYPE_INTRUSIVE_WITH_DEFAULT(Review, id, steamID, text, recommended,
        minutesPlayed, helpfulVotes, time)
};

// Hint: a vector stores many of these game records.
struct Game {
    int appID = 0, currentPlayers = 0, peakToday = 0;
    std::string title, type, image, description, releaseDate;
    std::vector<std::string> genres;
    int positiveReviews = 0, totalReviews = 0;
    std::string rating;
    long long playersUpdatedAt = 0, detailsUpdatedAt = 0, reviewsUpdatedAt = 0;
    std::vector<Review> reviews;
    std::vector<PlayerReading> history;
    NLOHMANN_DEFINE_TYPE_INTRUSIVE_WITH_DEFAULT(Game, appID, currentPlayers, peakToday,
        title, type, image, description, releaseDate, genres, positiveReviews,
        totalReviews, rating, playersUpdatedAt, detailsUpdatedAt, reviewsUpdatedAt,
        reviews, history)
};

inline double positivePercent(const Game& game) {
    return game.totalReviews > 0 ? 100.0 * game.positiveReviews / game.totalReviews : -1.0;
}
