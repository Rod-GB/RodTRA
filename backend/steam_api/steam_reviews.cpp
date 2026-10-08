#include "steam_reviews.h"
#include "../network/http_client.h"
#include <ctime>

static std::string steamID(const Json& value) {
    const std::string id = value.is_string() ? value.get<std::string>() : value.dump();
    if (id.empty() || id.find_first_not_of("0123456789") != std::string::npos)
        throw std::runtime_error("Invalid Steam review identifier.");
    return id;
}

static Review readReview(const Json& row) {
    Review review;
    review.id = steamID(row.at("recommendationid"));
    const auto& author = row.at("author");
    review.steamID = steamID(author.at("steamid"));
    review.text = row.value("review", "");
    review.recommended = row.value("voted_up", false);
    review.minutesPlayed = author.value("playtime_at_review", author.value("playtime_forever", 0));
    review.helpfulVotes = row.value("votes_up", 0);
    review.time = row.at("timestamp_created").get<long long>();
    if (review.time <= 0 || review.time > std::time(nullptr) + 300 || review.minutesPlayed < 0 || review.helpfulVotes < 0)
        throw std::runtime_error("Invalid Steam review.");
    return review;
}

static Json reviewRequest(const Json& input) {
    return requestJson("https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?input_json=" +
        encodeURL(input.dump())).at("response");
}

// Overall totals include every language; fallback review text remains English.
void fetchSteamReviews(Game& game) {
    const Json input = {{"appid", game.appID}, {"filter", 1}, {"languages", {"all"}},
        {"num_per_page", 10}, {"purchase_type", 1}, {"review_type", 0}, {"display_language", "english"}};
    const Json response = reviewRequest(input);
    const auto& summary = response.at("query_summary");
    const int positive = summary.value("total_positive", 0);
    const int negative = summary.value("total_negative", 0);
    const int total = summary.value("total_reviews", 0);
    if (positive < 0 || negative < 0 || total < 0 || static_cast<long long>(positive) + negative != total)
        throw std::runtime_error("Invalid Steam rating totals.");
    std::vector<Review> reviews;
    for (const auto& row : response.value("reviews", Json::array()))
        if (row.value("language", "") == "english") reviews.push_back(readReview(row));
    game.positiveReviews = positive;
    game.totalReviews = total;
    game.rating = summary.value("review_score_desc", "No rating yet");
    game.reviews = std::move(reviews);
    game.reviewsUpdatedAt = std::time(nullptr);
}

// Both helpful and recent review pages use the supported Steam service.
Json fetchSteamReviewPage(int appID, const std::string& sort, const std::string& cursor) {
    const Json input = {{"appid", appID}, {"filter", sort == "helpful" ? 0 : 1},
        {"languages", {"english"}}, {"purchase_type", 1}, {"review_type", 0},
        {"num_per_page", 20}, {"day_range", 365}, {"cursor", cursor}};
    const Json response = reviewRequest(input);
    std::vector<Review> reviews;
    for (const auto& row : response.value("reviews", Json::array())) reviews.push_back(readReview(row));
    const std::string next = response.value("cursor", "");
    return {{"reviews", reviews}, {"cursor", next}, {"hasMore", !reviews.empty() && !next.empty() && next != cursor},
        {"updatedAt", std::time(nullptr)}};
}
