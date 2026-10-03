#include "steam_reviews.h"
#include "../network/http_client.h"
#include <ctime>
#include <stdexcept>

// Hint: recent English reviews, with Steam's overall all-language rating.
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
        Review review;
        review.id = row.at("recommendationid").get<std::string>();
        review.steamID = row.at("author").at("steamid").get<std::string>();
        review.text = row.at("review").get<std::string>();
        review.recommended = row.at("voted_up").get<bool>();
        review.minutesPlayed = row.at("author").value("playtime_at_review", 0);
        review.helpfulVotes = row.value("votes_up", 0);
        review.time = row.at("timestamp_created").get<long long>();
        reviews.push_back(review);
    }
    game.positiveReviews = positive;
    game.totalReviews = total;
    game.rating = summary.value("review_score_desc", "No rating yet");
    game.reviews = reviews;
    game.reviewsUpdatedAt = std::time(nullptr);
}
