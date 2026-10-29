/*
 * Module: discovery_tests.cpp
 * Folder: backend/tests
 * File: discovery_tests.cpp
 * Purpose: Checks catalog rules, Epic offers, ratings, money calculations
 *   and total-budget sets using controlled examples.
 */

#include "../services/discovery.h"
#include "../algorithms/budget_filter.h"
#include "../algorithms/epic_genres.h"
#include "../steam_api/steam_patches.h"
#include <iostream>

static void require(bool condition, const char* message) { if (!condition) throw std::runtime_error(message); }
static Json price(const std::string& currency, long long amount) {
    return {{"available", true}, {"currency", currency}, {"final", amount}, {"original", amount}, {"discount", 0},
        {"free", amount == 0}, {"checkedAt", std::time(nullptr)}, {"stale", false}};
}
static std::string page(const std::string& rows) {
    return "<html><div class='game_info_panel_widget'><table><tr><td>Status</td><td>Released</td></tr>" + rows + "</table></div></html>";
}

int main() {
    try {
        const auto listing = Json{{"title", "A game"}, {"description", "Fight enemies with clever AI and pathfinding."}, {"status", "Released"}};
        auto declared = parseItchPageMetadata(page("<tr><td>AI Disclosure</td><td><a href='https://itch.io/games/ai-assisted'>AI Assisted</a></td></tr>"), listing);
        require(declared.at("aiDisclosed") == true && declared.at("eligible") == false, "Explicit AI disclosure must be excluded");
        auto clean = parseItchPageMetadata(page("<tr><td>AI Disclosure</td><td><a href='https://itch.io/games/no-ai'>No AI</a></td></tr>"), listing);
        require(clean.at("eligible") == true && clean.at("aiDisclosed") == false, "No AI declaration must remain eligible");
        auto unknown = parseItchPageMetadata(page("<tr><td>Genre</td><td><a>Action</a></td></tr>"), listing);
        require(unknown.at("eligible") == true && unknown.at("aiDisclosure") == "not-disclosed", "Missing disclosure and ordinary game AI must not be guessed");
        auto pending = unknown; pending["metadataCheckedAt"] = 0; require(!publishedItchGame(pending, std::time(nullptr)), "Unchecked entries must not be published");
        pending["metadataCheckedAt"] = std::time(nullptr) - 22000; require(!publishedItchGame(pending, std::time(nullptr)), "Expired disclosure checks must wait for re-verification");
        auto legacy = parseItchPageMetadata(page("<tr><td>Tags</td><td><a href='https://itch.io/games/tag-ai-generated'>AI Generated</a></td></tr>"), listing);
        require(legacy.at("eligible") == false, "Legacy explicit AI tag must be excluded");
        auto asset = parseItchPageMetadata(page("<tr><td>Classification</td><td>Game assets</td></tr>"), listing);
        require(asset.at("eligible") == false, "Assets must not be listed as playable games");
        auto tattoo = listing; tattoo["description"] = "5000 tattoo flash designs, ready to stencil and ink.";
        require(parseItchPageMetadata(page(""), tattoo).at("eligible") == false, "Clearly described tattoo packs are not games");
        auto notReleased = parseItchPageMetadata("<div class='game_info_panel_widget'><table><tr><td>Status</td><td>Prototype</td></tr></table></div>", listing);
        require(notReleased.at("eligible") == false, "Non-released projects must be excluded");
        bool refused = false;
        try { parseItchPageMetadata("<html>Upstream challenge</html>", listing); } catch (...) { refused = true; }
        require(refused, "An inaccessible creator page must not count as a completed check");
        const auto rated = parseItchPageMetadata(page("<tr><td>Genre</td><td><a>Visual Novel</a><a>Puzzle</a></td></tr>") +
            "<script type='application/ld+json'>{\"aggregateRating\":{\"ratingValue\":\"4.5\",\"ratingCount\":\"12\"}}</script>", listing);
        require(rated["genres"].size() == 2 && rated["rating"]["stars"] == 4.5, "One-page checks must include every supplied genre and rating");
        require(hasCatalogGenre(rated), "A supplied genre must keep a store game in the catalog");
        for (const auto& unclassified : {Json::object(), Json{{"genres", Json::array()}}, Json{{"genres", nullptr}},
            Json{{"genres", "Action"}}, Json{{"genres", {"", "   ", 5, nullptr}}}})
            require(!hasCatalogGenre(unclassified), "Missing, empty and malformed genres must not enter a store catalog");
        require(hasCatalogGenre(Json{{"genres", {nullptr, "Puzzle"}}}), "A valid genre must survive unrelated malformed labels");
        const auto denied = itchCheckRetry(1000, 403, 60), missing = itchCheckRetry(1000, 404, 60), limited = itchCheckRetry(1000, 429, 300);
        require(denied.projectAt > 1000 && denied.collectionAt == 1000 && missing.collectionAt == 1000, "An individual creator error must not pause the collection");
        require(limited.collectionAt == 1300 && limited.projectAt == 1300, "Provider rate limits must delay the collection");

        const auto rows = parseItchListings("<rss><channel><item><link>https://creator.itch.io/game</link><plainTitle>Game</plainTitle><price>$2.00</price><currency>USD</currency></item><item><link>https://creator.itch.io/game</link><plainTitle>Duplicate</plainTitle></item><item><link>https://evil.example/game</link><plainTitle>Invalid</plainTitle></item><item><link>https://creator.itch.io/other</link><plainTitle>Other</plainTitle><price>$2.00</price><currency>USD</currency><discountpercent>broken</discountpercent></item></channel></rss>");
        require(rows.size() == 2 && rows[0].at("title") == "Game", "RSS must preserve order and remove invalid/duplicate links");
        require(rows[1]["price"]["available"] == false, "One malformed price must not discard other listings");

        auto game = Json{{"appID", 1}, {"source", "steam"}, {"title", "Game"}, {"genres", {"Action"}}, {"positiveReviews", 90}, {"totalReviews", 100}, {"price", price("PHP", 25000)}};
        std::vector<Json> choices;
        for (const long long amount : {60000LL, 40000LL, 35000LL, 25000LL}) {
            auto choice = game; choice["appID"] = choices.size() + 1; choice["title"] = "Game " + std::to_string(choices.size());
            choice["price"] = price("PHP", amount); choices.push_back(choice);
        }
        const auto originalChoices = choices;
        auto set = filterBudget(choices, {{"budget", "1000"}, {"genres", {"Action"}}, {"rating", 80}});
        require(set["games"].size() == 3 && set["totalCents"] == 100000 && set["remainingCents"] == 0,
            "A 1000-peso total must choose the 250+350+400 set, not every individually affordable game");
        require(set["gameCount"] == 3 && set["candidateCount"] == 4 && choices == originalChoices,
            "Set counts must be distinct from candidates and shared source data must not change");
        auto lowRated = choices; lowRated.back()["positiveReviews"] = 20;
        auto ratedSet = filterBudget(lowRated, {{"budget", "1000"}, {"rating", 80}});
        require(ratedSet["games"].size() == 2 && ratedSet["totalCents"] == 75000, "Rating filters must run before set selection");
        std::vector<Json> cents;
        for (const long long amount : {333LL, 334LL, 333LL}) { auto g = game; g["price"] = price("PHP", amount); cents.push_back(g); }
        auto exact = filterBudget(cents, {{"budget", "10.00"}});
        require(exact["games"].size() == 3 && exact["totalCents"] == 1000, "Cent arithmetic must fit an exact decimal budget");
        const auto emptySet = filterBudget(choices, {{"budget", "0"}});
        require(emptySet["gameCount"] == 0 && emptySet["totalCents"] == 0 && emptySet["remainingCents"] == 0, "A zero budget must not buy paid games");
        auto tied = choices; tied[0]["price"] = price("PHP", 50000); tied[1]["price"] = price("PHP", 50000);
        tied.resize(2); tied[0]["positiveReviews"] = 70; tied[1]["positiveReviews"] = 95;
        const auto tiedSet = filterBudget(tied, {{"budget", "500"}});
        require(tiedSet["games"].size() == 1 && tiedSet["games"][0]["positiveReviews"] == 95, "Equal-price choices must prefer the better rating");
        // Independent exhaustive oracle: verify maximum game count over every subset.
        std::vector<Json> oracleGames;
        for (const long long amount : {199LL, 100LL, 675LL, 425LL, 301LL, 999LL}) {
            auto g = game; g["price"] = price("PHP", amount); oracleGames.push_back(g);
        }
        for (int pesos = 0; pesos <= 30; ++pesos) {
            int best = 0;
            for (unsigned mask = 0; mask < (1U << oracleGames.size()); ++mask) {
                long long sum = 0; int count = 0;
                for (std::size_t i = 0; i < oracleGames.size(); ++i) if (mask & (1U << i)) { sum += oracleGames[i]["price"]["final"].get<long long>(); ++count; }
                if (sum <= pesos * 100LL) best = std::max(best, count);
            }
            const auto selected = filterBudget(oracleGames, {{"budget", std::to_string(pesos)}});
            require(selected["gameCount"] == best && selected["totalCents"].get<long long>() <= pesos * 100LL,
                "The set must match the exhaustive maximum-count oracle without exceeding its budget");
        }
        auto input = Json{{"budget", "500"}, {"rating", 80}, {"genres", {"Action"}}};
        require(filterBudget({game}, input)["games"].size() == 1, "Steam budget and rating must match");
        auto labelled = game; labelled["genres"] = {"Free To Play", "Early Access", "Visual Novel"};
        auto genreInput = input; genreInput["genres"] = {"Early Access"};
        require(filterBudget({labelled}, genreInput)["games"].size() == 1, "Every supplied store label must work as a genre choice");
        genreInput["genres"] = {"Invented genre"}; refused = false;
        try { filterBudget({labelled}, genreInput); } catch (...) { refused = true; }
        require(refused, "Unknown genre choices must be rejected");
        input["budget"] = "200"; require(filterBudget({game}, input)["games"].empty(), "Over-budget games must be excluded");
        auto itchGame = game; itchGame["source"] = "itch"; itchGame["price"] = price("USD", 250); itchGame["eligible"] = true;
        itchGame["aiDisclosed"] = false; itchGame["metadataCheckedAt"] = std::time(nullptr); itchGame["rating"] = {{"stars", 4.5}, {"count", 10}};
        input = {{"platform", "itch"}, {"currency", "USD"}, {"budget", "5"}, {"rating", 4.0}};
        require(filterBudget({itchGame}, input)["games"].size() == 1, "itch.io must use native currency and star ratings");
        input["currency"] = "GBP"; auto differentCurrency = filterBudget({itchGame}, input); require(differentCurrency["games"].empty() && differentCurrency["otherCurrencies"] == 1, "Different currencies must never be compared as equal amounts");
        input["currency"] = "USD";
        input["rating"] = 4.8; require(filterBudget({itchGame}, input)["games"].empty(), "Star thresholds must not become Steam percentages");
        input["rating"] = 0; itchGame["aiDisclosed"] = true; require(filterBudget({itchGame}, input)["games"].empty(), "AI exclusion must also apply to backend budget results");
        itchGame["aiDisclosed"] = false; itchGame["price"]["checkedAt"] = std::time(nullptr) - 1900;
        require(filterBudget({itchGame}, input)["games"].empty(), "Stale prices must not match");
        auto epicGame = Json{{"source", "epic"}, {"title", "Giveaway"}, {"price", price("PHP", 0)}, {"endsAt", std::time(nullptr) + 3600}};
        epicGame["genres"] = {"Horror"};
        input = {{"platform", "epic"}, {"currency", "PHP"}, {"budget", "0"}, {"includeFree", true}};
        require(filterBudget({epicGame}, input)["freeGames"].size() == 1, "Current Epic giveaways must fit a zero budget");
        input["genres"] = {"Horror"};
        require(filterBudget({epicGame}, input)["gameCount"] == 1, "Verified Epic genres must work in Budget Finder");
        epicGame["endsAt"] = std::time(nullptr) - 1; require(filterBudget({epicGame}, input)["freeGames"].empty(), "Expired giveaways must not match");
        require(!gameplayGenre("Free To Play") && !gameplayGenre("Utilities") && gameplayGenre("Strategy"), "Gameplay genres must exclude price/status/software labels");
        refused = false; input["genres"] = {"Action", "RPG", "Strategy", "Adventure"};
        try { filterBudget({}, input); } catch (...) { refused = true; } require(refused, "More than three genres must be rejected");

        Json epicRow = {{"id", "known"}, {"title", "Sker Ritual"}, {"offerType", "BASE_GAME"},
            {"offerMappings", Json::array({{{"pageType", "productHome"}, {"pageSlug", "sker-ritual-aac702"}}})},
            {"price", {{"totalPrice", {{"discountPrice", 0}, {"originalPrice", 49900}, {"currencyCode", "PHP"}}}}},
            {"promotions", {{"promotionalOffers", Json::array({{{"promotionalOffers", Json::array({{
                {"startDate", "2020-01-01T00:00:00.000Z"}, {"endDate", "2030-01-01T00:00:00.000Z"},
                {"discountSetting", {{"discountPercentage", 0}}}}})}}})}}}};
        auto unclassified = epicRow; unclassified["id"] = "new"; unclassified["offerMappings"][0]["pageSlug"] = "new-free-game";
        auto upcoming = epicRow; upcoming["id"] = "later"; upcoming["promotions"]["promotionalOffers"][0]["promotionalOffers"][0]["startDate"] = "2029-01-01T00:00:00.000Z";
        auto addOn = epicRow; addOn["id"] = "dlc"; addOn["offerType"] = "ADD_ON";
        auto expired = epicRow; expired["id"] = "expired"; expired["promotions"]["promotionalOffers"][0]["promotionalOffers"][0]["endDate"] = "2021-01-01T00:00:00.000Z";
        Json payload = {{"data", {{"Catalog", {{"searchStore", {{"elements", Json::array({Json{{"id", "broken"}}, epicRow, epicRow, unclassified, upcoming, addOn, expired})}}}}}}}};
        const auto epicParsed = parseEpicPromotions(payload, 1793232000);
        require(epicParsed["games"].size() == 2, "Epic must keep unknown-genre giveaways but exclude duplicates, malformed, future, expired and non-game offers");
        require(epicParsed["games"][0]["genres"] == Json::array({"Action", "Horror", "Shooter"}) && epicParsed["games"][1]["genres"].empty(),
            "Epic must use verified genres without inventing labels for new offers");
        require(epicGenreNames(Json{{"tags", Json::array({{{"name", "Windows"}, {"groupName", "platform"}}, {{"id", "1216"}}, {{"name", "Puzzle"}, {"groupName", "genre"}}})}}, "unknown") == std::vector<std::string>{"Puzzle"},
            "Only explicitly readable genre tags belong in Epic genre choices");

        const auto posts = parseSteamPatches(Json::array({{{"date", std::time(nullptr)}, {"feedname", "steam_community_announcements"}, {"gid", "123"}, {"title", "Latest Update"}, {"tags", nullptr}}}), 1172470, 12);
        require(posts["posts"][0]["kind"] == "Developer update", "Untagged update posts must be recognized");
        require(posts["posts"][0]["url"] == "https://steamcommunity.com/games/1172470/announcements/detail/123", "Links must target the exact announcement");
        DashboardState state; Game known; known.appID = 1; known.type = "game"; known.title = "Known"; state.games.push_back(known);
        state.games[0].genres = {"Action", "Free To Play", "Early Access", "Visual Novel"};
        require(budgetOptions(state)["steam"]["genres"].size() == 4, "Budget options must retain all supplied labels without a fixed list");
        state.rankings = {known, Game{}, Game{}}; state.rankings[1].appID = 2; state.rankings[2].appID = 3;
        state.records[1] = known; Game demo = known; demo.appID = 2; demo.type = "demo"; state.records[2] = demo;
        auto totals = catalogSummary(state);
        require(totals["steam"]["available"] == 1 && totals["steam"]["ranked"] == 3 && totals["steam"]["excluded"] == 1 && totals["steam"]["pending"] == 1, "Ranked, available, excluded and pending counts must remain distinct");
        require(totals["totalAvailable"] == 1 && totals["complete"] == false, "Unavailable sources must not become invented totals");
        std::cout << "Discovery regression checks passed\n";
    } catch (const std::exception& error) { std::cerr << error.what() << '\n'; return 1; }
}
