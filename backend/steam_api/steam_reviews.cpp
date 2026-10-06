#include "steam_reviews.h"
#include "../network/http_client.h"
#include <ctime>
#include <stdexcept>

static Review readReview(const Json& row) {
    Review review;
    review.id = row.at("recommendationid").get<std::string>();
    review.steamID = row.at("author").at("steamid").get<std::string>();
    review.text = row.at("review").get<std::string>();
    review.recommended = row.at("voted_up").get<bool>();
    review.minutesPlayed = row.at("author").value("playtime_at_review", 0);
    review.helpfulVotes = row.value("votes_up", 0);
    review.time = row.at("timestamp_created").get<long long>();
    if (review.time <= 0 || review.time > std::time(nullptr) + 300 || review.minutesPlayed < 0 || review.helpfulVotes < 0)
        throw std::runtime_error("Invalid Steam review.");
    return review;
}

// recent English reviews, with Steam's overall all-language rating.
void fetchSteamReviews(Game& game) {
    const Json input = {{"appid", game.appID}, {"filter", 1}, {"languages", {"english"}},
        {"num_per_page", 10}, {"purchase_type", 1}};
    const Json response = requestJson("https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?input_json=" +
        encodeURL(input.dump())).at("response");
    const Json summary = response.at("query_summary");
    const int positive = summary.at("total_positive").get<int>();
    const int negative = summary.at("total_negative").get<int>();
    const int total = summary.at("total_reviews").get<int>();
    if (positive < 0 || negative < 0 || total < 0 || static_cast<long long>(positive) + negative != total)
        throw std::runtime_error("Invalid Steam rating totals.");
    std::vector<Review> reviews;
    for (const auto& row : response.at("reviews")) {
        reviews.push_back(readReview(row));
    }
    game.positiveReviews = positive;
    game.totalReviews = total;
    game.rating = summary.value("review_score_desc", "No rating yet");
    game.reviews = reviews;
    game.reviewsUpdatedAt = std::time(nullptr);
}

// Steam's cursor requests the next page without downloading every review.
Json fetchSteamReviewPage(int appID, const std::string& sort, const std::string& cursor) {
    const std::string filter = sort == "helpful" ? "all" : "recent";
    const Json response = requestJson("https://store.steampowered.com/appreviews/" + std::to_string(appID) +
        "?json=1&language=english&purchase_type=all&review_type=all&num_per_page=20&day_range=365&filter=" +
        filter + "&cursor=" + encodeURL(cursor));
    if (response.value("success", 0) != 1) throw std::runtime_error("Steam reviews unavailable.");
    std::vector<Review> reviews;
    for (const auto& row : response.at("reviews")) reviews.push_back(readReview(row));
    const std::string next = response.value("cursor", "");
    return {{"reviews", reviews}, {"cursor", next}, {"hasMore", !reviews.empty() && !next.empty() && next != cursor},
        {"updatedAt", std::time(nullptr)}};
}
