/*
 * Module: budget_filter.h
 * Folder: backend/algorithms
 * File: budget_filter.h
 * Purpose: Checks budget choices, sorts matching games by price, and selects
 *   one set within the total budget.
 */

#pragma once
#include "../models/game.h"
#include <algorithm>
#include <stdexcept>
#include <cmath>
#include <ctime>
#include "catalog_rules.h"

inline long long budgetCents(const std::string& text) {
    if (text.empty() || text.size() > 9) throw std::invalid_argument("Enter a budget from 0 to 100000 in the selected currency.");
    long long whole = 0, fraction = 0;
    bool dot = false;
    int digits = 0, wholeDigits = 0;
    for (char c : text) {
        if (c == '.' && !dot) { dot = true; continue; }
        if (c < '0' || c > '9') throw std::invalid_argument("Enter a valid budget with at most two decimal places.");
        if (dot) { if (++digits > 2) throw std::invalid_argument("Use at most two decimal places."); fraction = fraction * 10 + c - '0'; }
        else { ++wholeDigits; whole = whole * 10 + c - '0'; }
    }
    if (!wholeDigits || (dot && !digits) || whole > 100000) throw std::invalid_argument("Enter a budget from 0 to 100000 in the selected currency.");
    if (digits == 1) fraction *= 10;
    const auto result = whole * 100 + fraction;
    if (result > 10000000) throw std::invalid_argument("Maximum budget is 100000 in the selected currency.");
    return result;
}

inline double offerRating(const Json& game) {
    if (game.value("source", "steam") == "itch") {
        const auto rating = game.value("rating", Json());
        return rating.is_object() && rating.value("count", 0LL) > 0 ? rating.value("stars", -1.0) : -1;
    }
    if (game.value("source", "steam") == "epic") return -1;
    const int count = game.value("totalReviews", 0);
    return count > 0 ? 100.0 * game.value("positiveReviews", 0) / count : -1;
}

inline bool offerBefore(const Json& a, const Json& b, const std::string& order) {
    if (order == "price" && a["price"]["final"] != b["price"]["final"]) return a["price"]["final"].get<long long>() < b["price"]["final"].get<long long>();
    if (order == "discount" && a["price"]["discount"] != b["price"]["discount"]) return a["price"]["discount"].get<int>() > b["price"]["discount"].get<int>();
    if (offerRating(a) != offerRating(b)) return offerRating(a) > offerRating(b);
    return a.value("title", "") != b.value("title", "") ? a.value("title", "") < b.value("title", "") : a.value("appID", 0) < b.value("appID", 0);
}

// Quicksort works on this request's copies; no preferences/results are retained.
inline void quickSortOffers(std::vector<Json>& games, int low, int high, const std::string& order) {
    if (low >= high) return;
    const Json pivot = games[high];
    int boundary = low;
    for (int i = low; i < high; ++i) if (offerBefore(games[i], pivot, order)) std::swap(games[i], games[boundary++]);
    std::swap(games[boundary], games[high]);
    quickSortOffers(games, low, boundary - 1, order);
    quickSortOffers(games, boundary + 1, high, order);
}

inline Json filterBudget(const std::vector<Json>& source, const Json& input) {
    const auto maximum = budgetCents(input.at("budget").get<std::string>());
    const auto platform = input.value("platform", std::string("steam"));
    if (platform != "steam" && platform != "itch" && platform != "epic") throw std::invalid_argument("Invalid platform.");
    const auto currency = input.value("currency", std::string("PHP"));
    if (currency.size() != 3 || !std::all_of(currency.begin(), currency.end(), [](unsigned char c) { return c >= 'A' && c <= 'Z'; }) ||
        (platform != "itch" && currency != "PHP")) throw std::invalid_argument("Invalid price currency.");
    const double minimum = input.value("rating", 0.0);
    if (!std::isfinite(minimum) || minimum < 0 || minimum > (platform == "itch" ? 5 : platform == "epic" ? 0 : 100)) throw std::invalid_argument("Rating must be between 0 and 100.");
    const auto genres = input.value("genres", std::vector<std::string>{});
    if (genres.size() > 3) throw std::invalid_argument("Choose up to three genres.");
    for (const auto& genre : genres) if (!catalogGenre(genre) || std::none_of(source.begin(), source.end(), [&](const auto& game) {
        const auto supplied = game.value("genres", std::vector<std::string>{});
        return game.value("source", "steam") == platform && std::find(supplied.begin(), supplied.end(), genre) != supplied.end();
    })) throw std::invalid_argument("Choose an available genre.");
    const auto order = input.value("sort", std::string("rating"));
    if (order != "rating" && order != "price" && order != "discount") throw std::invalid_argument("Invalid result order.");
    std::vector<Json> paid, free;
    int unavailable = 0, otherCurrencies = 0;
    for (auto game : source) {
        if (game.value("source", "steam") != platform) continue;
        const auto tags = game.value("genres", std::vector<std::string>{});
        if (platform == "itch" && !publishedItchGame(game, std::time(nullptr))) continue;
        if (platform == "epic" && game.value("endsAt", 0LL) <= std::time(nullptr)) continue;
        const auto price = game.value("price", Json::object());
        if (!currentPrice(price, std::time(nullptr))) { ++unavailable; continue; }
        if (price.value("currency", "") != currency) { ++otherCurrencies; continue; }
        const auto cost = price.value("final", -1LL);
        if (cost < 0) { ++unavailable; continue; }
        if (cost > maximum || (minimum > 0 && offerRating(game) < minimum)) continue;
        if (!genres.empty() && std::none_of(genres.begin(), genres.end(), [&](const auto& g) { return std::find(tags.begin(), tags.end(), g) != tags.end(); })) continue;
        if (cost == 0) {
            if (input.value("includeFree", false)) free.push_back(std::move(game));
        } else if (!input.value("saleOnly", false) || price.value("discount", 0) > 0) paid.push_back(std::move(game));
    }
    const auto candidateCount = paid.size() + free.size();
    // All matching paid games have positive costs. Taking them cheapest first
    // gives the largest possible number of games within one total budget.
    // Ratings break equal-price ties; this is not a maximum-spend knapsack.
    quickSortOffers(paid, 0, static_cast<int>(paid.size()) - 1, "price");
    std::vector<Json> chosen;
    long long total = 0;
    for (auto& game : paid) {
        const auto cost = game["price"]["final"].get<long long>();
        if (cost > maximum - total) break;
        total += cost;
        chosen.push_back(std::move(game));
    }
    quickSortOffers(chosen, 0, static_cast<int>(chosen.size()) - 1, order);
    quickSortOffers(free, 0, static_cast<int>(free.size()) - 1, order);
    return {{"games", chosen}, {"freeGames", free}, {"unavailablePrices", unavailable}, {"otherCurrencies", otherCurrencies},
        {"currency", currency}, {"platform", platform}, {"budgetCents", maximum}, {"totalCents", total},
        {"remainingCents", maximum - total}, {"gameCount", chosen.size() + free.size()}, {"candidateCount", candidateCount}, {"selectionMode", "most-games"}};
}
