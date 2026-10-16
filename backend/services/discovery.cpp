#include "discovery.h"
#include "content_cache.h"
#include "../network/http_client.h"
#include "../algorithms/budget_filter.h"
#include <libxml/HTMLparser.h>
#include <libxml/xpath.h>
#include <chrono>
#include <ctime>
#include <thread>
#include <regex>
#include <memory>
#include <set>
#include <iomanip>
#include <sstream>
#include <locale>
#include <iostream>

static Json loadItchDetails(const Json& selected);

namespace {
std::mutex dataMutex;
std::map<int, Json> steamData;
std::map<int, long long> steamRetry;
std::map<std::string, Json> itchSalePrices;
long long salesCheckedAt = 0;
std::string salesMessage = "Checking current itch.io offers…";
std::string salesState = "loading";
Json epic = {{"games", Json::array()}, {"updatedAt", 0}, {"message", "Connecting to Epic…"}};
Json itch = {{"games", Json::array()}, {"updatedAt", 0}, {"message", "Connecting to itch.io…"}};

struct Document {
    xmlDocPtr doc = nullptr;
    explicit Document(const std::string& text, bool html = false) {
        static const bool initialized = [] { xmlInitParser(); return true; }();
        (void)initialized;
        doc = html ? htmlReadMemory(text.data(), static_cast<int>(text.size()), nullptr, "UTF-8", HTML_PARSE_NONET | HTML_PARSE_NOERROR | HTML_PARSE_NOWARNING)
            : xmlReadMemory(text.data(), static_cast<int>(text.size()), nullptr, nullptr, XML_PARSE_NONET | XML_PARSE_NOERROR | XML_PARSE_NOWARNING);
        if (!doc) throw std::runtime_error("The source returned unreadable content.");
    }
    ~Document() { xmlFreeDoc(doc); }
    Document(const Document&) = delete;
    std::vector<xmlNodePtr> nodes(const std::string& path, xmlNodePtr node = nullptr) const {
        std::vector<xmlNodePtr> result;
        auto* context = xmlXPathNewContext(doc);
        if (!context) throw std::bad_alloc();
        if (node) context->node = node;
        auto* value = xmlXPathEvalExpression(BAD_CAST path.c_str(), context);
        if (value && value->nodesetval) for (int i = 0; i < value->nodesetval->nodeNr; ++i) result.push_back(value->nodesetval->nodeTab[i]);
        if (value) xmlXPathFreeObject(value);
        xmlXPathFreeContext(context);
        return result;
    }
    static std::string content(xmlNodePtr node) {
        xmlChar* value = xmlNodeGetContent(node);
        std::string text = value ? reinterpret_cast<char*>(value) : "";
        xmlFree(value);
        return text;
    }
    std::string text(const std::string& path, xmlNodePtr node = nullptr) const {
        const auto found = nodes(path, node);
        return found.empty() ? "" : content(found.front());
    }
};

long long isoTime(const std::string& text) {
    if (text.size() < 19) return 0;
    std::tm value{};
    std::istringstream input(text.substr(0, 19));
    input >> std::get_time(&value, "%Y-%m-%dT%H:%M:%S");
    if (input.fail()) return 0;
#ifdef _WIN32
    return _mkgmtime(&value);
#else
    return timegm(&value);
#endif
}

long long rssTime(const std::string& text) {
    std::tm value{};
    std::istringstream input(text);
    input.imbue(std::locale::classic());
    input >> std::get_time(&value, "%a, %d %b %Y %H:%M:%S GMT");
    if (input.fail()) return 0;
#ifdef _WIN32
    return _mkgmtime(&value);
#else
    return timegm(&value);
#endif
}

long long listedCents(const std::string& text) {
    static const std::regex amount(R"(^[^0-9]*([0-9]{1,7})(?:\.([0-9]{1,2}))?[^0-9]*$)");
    std::smatch match;
    if (!std::regex_match(text, match, amount)) return -1;
    std::string fraction = match[2].str();
    while (fraction.size() < 2) fraction += '0';
    return std::stoll(match[1].str()) * 100 + std::stoll(fraction);
}

Json itchPrice(const Document& feed, xmlNodePtr item) {
    const auto currency = feed.text("currency", item);
    const auto final = listedCents(feed.text("price", item));
    const auto rate = feed.text("discountpercent", item);
    int discount = 0;
    try { if (!rate.empty()) { if (!std::regex_match(rate, std::regex("[0-9]{1,3}"))) return {{"available", false}}; discount = std::stoi(rate); } } catch (...) { return {{"available", false}}; }
    const auto original = discount > 0 ? listedCents(feed.text("fullPrice", item)) : final;
    const auto end = rssTime(feed.text("saleends", item));
    if (original == 0 && final == 0) discount = 0;
    if (!std::regex_match(currency, std::regex("[A-Z]{3}")) || final < 0 || original < final || discount < 0 || discount > 100 ||
        (discount > 0 && (original <= final || end <= std::time(nullptr)))) return {{"available", false}};
    return {{"available", true}, {"currency", currency}, {"final", final}, {"original", original}, {"discount", discount},
        {"free", final == 0}, {"freeLabel", "Free / pay what you want"}, {"endsAt", end}, {"checkedAt", std::time(nullptr)}, {"stale", false}};
}

bool itchURL(const std::string& url) {
    static const std::regex allowed(R"(^https://[A-Za-z0-9-]+\.itch\.io/[A-Za-z0-9_-]+/?$)");
    return std::regex_match(url, allowed);
}

Json unavailablePrice() { return {{"available", false}, {"currency", "PHP"}}; }

Json fetchSteamExtra(int appID) {
    const auto response = requestJson("https://store.steampowered.com/api/appdetails?appids=" + std::to_string(appID) + "&cc=ph&l=english").at(std::to_string(appID));
    if (!response.value("success", false)) throw std::runtime_error("Price information unavailable.");
    const auto& data = response.at("data");
    Json price = unavailablePrice();
    const bool free = data.value("is_free", false);
    const auto overview = data.value("price_overview", Json::object());
    if (free || (overview.value("currency", "") == "PHP" && overview.contains("final") && overview.contains("initial"))) {
        const long long final = free ? 0LL : overview.at("final").get<long long>();
        const long long original = free ? 0LL : overview.at("initial").get<long long>();
        if (final < 0 || original < final) throw std::runtime_error("Invalid source price.");
        price = {{"available", true}, {"currency", "PHP"}, {"final", final}, {"original", original},
            {"discount", free ? 0 : overview.value("discount_percent", 0)}, {"free", free}, {"checkedAt", std::time(nullptr)}, {"stale", false}};
    }
    Json screenshots = Json::array();
    for (const auto& shot : data.value("screenshots", Json::array())) {
        if (screenshots.size() >= 12) break;
        screenshots.push_back({{"thumbnail", shot.value("path_thumbnail", "")}, {"full", shot.value("path_full", "")}});
    }
    return {{"price", price}, {"screenshots", screenshots}, {"publishers", data.value("publishers", Json::array())},
        {"developers", data.value("developers", Json::array())}, {"checkedAt", std::time(nullptr)}};
}

Json fetchEpic() {
    const auto rows = requestJson("https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=PH&allowCountries=PH")
        .at("data").at("Catalog").at("searchStore").at("elements");
    Json games = Json::array();
    const auto now = std::time(nullptr);
    std::set<std::string> seen;
    for (const auto& row : rows) {
        if (row.value("offerType", "") != "BASE_GAME" || row.value("isCodeRedemptionOnly", false)) continue;
        const auto promotions = row.value("promotions", Json());
        if (!promotions.is_object()) continue;
        long long end = 0;
        for (const auto& group : promotions.value("promotionalOffers", Json::array())) for (const auto& offer : group.value("promotionalOffers", Json::array())) {
            const auto starts = isoTime(offer.value("startDate", "")), ends = isoTime(offer.value("endDate", ""));
            if (starts > 0 && starts <= now && ends > now && offer.at("discountSetting").value("discountPercentage", -1) == 0) end = ends;
        }
        if (!end || row.at("price").at("totalPrice").value("discountPrice", -1LL) != 0) continue;
        const auto id = row.value("id", "");
        if (id.empty() || !seen.insert(id).second) continue;
        std::string slug;
        for (const auto& mapping : row.value("offerMappings", Json::array())) if (mapping.value("pageType", "") == "productHome") slug = mapping.value("pageSlug", "");
        if (slug.empty() && row.contains("catalogNs")) for (const auto& mapping : row.at("catalogNs").value("mappings", Json::array())) if (mapping.value("pageType", "") == "productHome") slug = mapping.value("pageSlug", "");
        if (slug.empty() || slug.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_/.") != std::string::npos || slug.find("..") != std::string::npos) continue;
        std::string image;
        for (const auto& art : row.value("keyImages", Json::array())) {
            if (image.empty() || art.value("type", "") == "OfferImageWide") image = art.value("url", "");
        }
        std::string publisher, studio;
        for (const auto& field : row.value("customAttributes", Json::array())) {
            if (field.value("key", "") == "publisherName") publisher = field.value("value", "");
            if (field.value("key", "") == "developerName") studio = field.value("value", "");
        }
        const auto& total = row.at("price").at("totalPrice");
        Json price = {{"available", false}};
        if (total.value("originalPrice", -1LL) >= 0 && total.value("currencyCode", "") == "PHP") price = {
            {"available", true}, {"currency", "PHP"}, {"final", 0}, {"original", total.at("originalPrice")},
            {"discount", total.value("originalPrice", 0LL) > 0 ? 100 : 0}, {"free", true}, {"freeLabel", "Free to keep"},
            {"endsAt", end}, {"checkedAt", now}, {"stale", false}};
        games.push_back({{"id", id}, {"source", "epic"}, {"title", row.value("title", "")}, {"description", row.value("description", "")},
            {"image", image}, {"url", "https://store.epicgames.com/en-US/p/" + slug}, {"endsAt", end},
            {"publisher", publisher}, {"studio", studio}, {"releaseDate", ""}, {"genres", Json::array()}, {"price", price},
            {"screenshots", Json::array()}, {"priceLabel", "Free to keep"}});
        if (games.size() >= 50) break;
    }
    return {{"games", games}, {"updatedAt", now}, {"message", ""}, {"region", "Philippines"},
        {"genresMessage", "Epic's giveaway feed does not provide genre names. Browse all active giveaways below."}};
}

Json fetchItch() {
    return {{"games", parseItchListings(requestText("https://itch.io/games/newest/released.xml"))},
        {"updatedAt", std::time(nullptr)}, {"message", ""}};
}
}

Json parseItchListings(const std::string& xml) {
    Document feed(xml);
    if (feed.nodes("/rss/channel").empty()) throw std::runtime_error("The source did not return an RSS collection.");
    Json games = Json::array();
    std::set<std::string> seen;
    for (auto* item : feed.nodes("/rss/channel/item")) {
        if (games.size() >= 50) break;
        try {
            const auto url = feed.text("link", item);
            if (!itchURL(url) || !seen.insert(url).second) continue;
            auto title = feed.text("plainTitle", item);
            if (title.empty()) title = feed.text("title", item);
            if (title.empty()) continue;
            games.push_back({{"id", url}, {"url", url}, {"source", "itch"}, {"title", title},
                {"description", feed.text("description", item)}, {"image", feed.text("imageurl", item)},
                {"priceLabel", feed.text("price", item)}, {"currency", feed.text("currency", item)},
                {"price", itchPrice(feed, item)}, {"genres", Json::array()}, {"status", "Released"},
                {"publisher", ""}, {"studio", ""}, {"releaseDate", ""}, {"metadataCheckedAt", 0}});
        } catch (...) { /* A bad listing must not discard the rest of a valid feed. */ }
    }
    return games; // Preserve itch.io's Most Recent order; sales are never appended.
}

Json parseItchPageMetadata(const std::string& html, const Json& listing) {
    Document page(html, true);
    Json result = {{"genres", Json::array()}, {"aiDisclosed", false}, {"aiDisclosure", "not-disclosed"},
        {"eligible", true}, {"eligibilityReason", ""}, {"status", listing.value("status", "Released")}};
    const auto info = "//div[contains(concat(' ',normalize-space(@class),' '),' game_info_panel_widget ')]";
    if (page.nodes(info).empty()) throw std::runtime_error("Creator information could not be verified.");
    const auto status = page.text(std::string(info) + "//tr[td[1][normalize-space(.)='Status']]/td[2]");
    if (!status.empty()) result["status"] = status;
    if (lowerText(result.value("status", "")) != "released") { result["eligible"] = false; result["eligibilityReason"] = "not-released"; }
    for (auto* genre : page.nodes(std::string(info) + "//tr[td[1][normalize-space(.)='Genre']]/td[2]//a")) {
        const auto value = Document::content(genre);
        if (gameplayGenre(value)) result["genres"].push_back(value);
    }
    const std::string fields = std::string(info) + "//tr[td[1][normalize-space(.)='AI Disclosure' or normalize-space(.)='AI Generation' or normalize-space(.)='Generative AI' or normalize-space(.)='Tags']]/td[2]";
    for (auto* link : page.nodes(fields + "//a/@href")) {
        const auto href = lowerText(Document::content(link));
        if (href.find("/no-ai") != std::string::npos || href.find("/tag-no-ai") != std::string::npos) result["aiDisclosure"] = "no-ai";
        if (std::regex_search(href, std::regex(R"(/(?:tag-)?ai-(?:assisted|generated|graphics|sound|audio|text|dialog|code)(?:[/?#-]|$))"))) result["aiDisclosed"] = true;
    }
    const auto aiText = lowerText(page.text(std::string(info) + "//tr[td[1][normalize-space(.)='AI Disclosure' or normalize-space(.)='AI Generation' or normalize-space(.)='Generative AI']]/td[2]"));
    if (aiText == "no" || aiText == "no ai" || aiText == "no generative ai") result["aiDisclosure"] = "no-ai";
    if (result.value("aiDisclosure", "") != "no-ai" && (aiText == "yes" || aiText.find("ai assisted") != std::string::npos || aiText.find("ai generated") != std::string::npos || aiText.find("contains generative ai") != std::string::npos)) result["aiDisclosed"] = true;
    if (result.value("aiDisclosed", false)) { result["aiDisclosure"] = "ai-assisted"; result["eligible"] = false; result["eligibilityReason"] = "ai-disclosed"; }
    bool nonGame = false;
    for (auto* node : page.nodes("//script[@type='application/ld+json']")) {
        const auto data = Json::parse(Document::content(node), nullptr, false);
        if (!data.is_object() || !data.contains("@type") || !data["@type"].is_string() || data["@type"] != "BreadcrumbList") continue;
        for (const auto& crumb : data.value("itemListElement", Json::array())) {
            const auto item = crumb.value("item", Json::object());
            if (!item.is_object()) continue;
            const auto path = item.value("@id", "");
            for (const auto* category : {"/game-assets", "/tools", "/soundtracks", "/comics", "/books"}) if (path.rfind(std::string("https://itch.io") + category, 0) == 0) nonGame = true;
        }
    }
    const auto classification = lowerText(page.text(std::string(info) + "//tr[td[1][normalize-space(.)='Classification']]/td[2]"));
    if (classification.find("asset") != std::string::npos || classification == "tool" || classification == "software") nonGame = true;
    const auto blurb = lowerText(listing.value("title", "") + " " + listing.value("description", "").substr(0, 350));
    if (blurb.find("tattoo") != std::string::npos && (blurb.find("flash") != std::string::npos || blurb.find("sheet") != std::string::npos || blurb.find("design") != std::string::npos)) nonGame = true;
    if (nonGame) { result["eligible"] = false; if (!result.value("aiDisclosed", false)) result["eligibilityReason"] = "non-game"; }
    result["demo"] = std::regex_search(listing.value("title", ""), std::regex(R"(demo)", std::regex::icase));
    return result;
}

Json steamDiscovery(int appID, bool full) {
    std::lock_guard<std::mutex> lock(dataMutex);
    const auto found = steamData.find(appID);
    if (found == steamData.end()) return {{"price", unavailablePrice()}};
    Json result = found->second;
    if (std::time(nullptr) - result.value("checkedAt", 0LL) >= 1800) result["price"]["stale"] = true;
    if (!full) { result.erase("screenshots"); result.erase("publishers"); result.erase("developers"); }
    return result;
}

Json storeCollection(const std::string& store) {
    std::lock_guard<std::mutex> lock(dataMutex);
    Json result = store == "epic" ? epic : itch;
    const auto now = std::time(nullptr);
    Json current = Json::array();
    int pending = 0, excluded = 0;
    for (auto game : result["games"]) {
        if (store == "epic" && game.value("endsAt", 0LL) <= now) continue;
        if (store == "itch") {
            if (game.value("metadataCheckedAt", 0LL) == 0 || now - game.value("metadataCheckedAt", 0LL) >= 21600) { ++pending; continue; }
            if (!publishedItchGame(game, now)) { ++excluded; continue; }
            const auto sale = itchSalePrices.find(game.value("id", ""));
            if (sale != itchSalePrices.end() && sale->second.value("checkedAt", 0LL) >= game["price"].value("checkedAt", 0LL)) game["price"] = sale->second;
        }
        if (game.contains("price") && game["price"].value("available", false)) game["price"]["stale"] = !currentPrice(game["price"], now);
        current.push_back(std::move(game));
    }
    result["games"] = std::move(current);
    result["pendingChecks"] = pending; result["excludedListings"] = excluded;
    result["ready"] = result.value("updatedAt", 0LL) > 0;
    result["stale"] = now - result.value("updatedAt", 0LL) >= 1800;
    result["state"] = result.value("ready", false) ? (result.value("stale", true) || !result.value("message", "").empty() ? "saved" : pending > 0 ? "checking" : "ready") : result.value("message", "").rfind("Connecting", 0) == 0 ? "loading" : "unavailable";
    if (store == "itch") {
        result["salesCheckedAt"] = salesCheckedAt; result["priceMessage"] = salesMessage;
        result["salesStatus"] = salesCheckedAt > 0 && now - salesCheckedAt >= 1800 ? "saved" : salesState;
    }
    return result;
}

void runDiscoveryRefresh(DashboardState& state) {
    long long nextEpic = 0, nextItch = 0, nextSales = 0, nextItchDetail = 0, nextSteam = 0;
    std::map<std::string, long long> itchRetry;
    while (state.running) {
        const auto now = std::time(nullptr);
        if (now >= nextEpic) {
            try { auto fresh = fetchEpic(); std::lock_guard<std::mutex> lock(dataMutex); epic = std::move(fresh); nextEpic = now + 1800; }
            catch (...) { std::lock_guard<std::mutex> lock(dataMutex); epic["message"] = "Epic could not refresh. Available unexpired offers are retained."; nextEpic = now + 120; }
        }
        if (state.running && now >= nextItch) {
            try {
                auto fresh = fetchItch();
                std::lock_guard<std::mutex> lock(dataMutex);
                for (auto& game : fresh["games"]) for (const auto& old : itch["games"]) if (game["id"] == old["id"]) {
                    for (const auto* key : {"genres", "studio", "releaseDate", "metadataCheckedAt", "eligible", "eligibilityReason", "aiDisclosed", "aiDisclosure", "rating", "demo"}) if (old.contains(key)) game[key] = old[key];
                }
                itch = std::move(fresh); nextItch = now + 1800;
            }
            catch (...) { std::lock_guard<std::mutex> lock(dataMutex); itch["message"] = "itch.io could not refresh. Available listings are retained."; nextItch = now + 300; }
        }
        if (state.running && now >= nextSales) {
            try {
                const auto rows = parseItchListings(requestText("https://itch.io/games/newest/on-sale/released.xml"));
                std::map<std::string, Json> fresh;
                for (const auto& game : rows) if (game["price"].value("available", false) && game["price"].value("discount", 0) > 0) fresh[game.value("id", "")] = game["price"];
                std::lock_guard<std::mutex> lock(dataMutex);
                itchSalePrices = std::move(fresh); salesCheckedAt = std::time(nullptr); salesMessage.clear(); salesState = "ready"; nextSales = now + 1800;
            } catch (const OnlineError& error) {
                std::cerr << "itch.io sales: HTTP " << error.status << "; " << error.what() << std::endl;
                std::lock_guard<std::mutex> lock(dataMutex); salesState = salesCheckedAt > 0 ? "saved" : "unavailable"; salesMessage = "Current sale information could not refresh. Available verified prices are retained."; nextSales = now + std::max(120, error.retryAfterSeconds);
            } catch (const std::exception&) {
                std::cerr << "itch.io sales: source parsing failed" << std::endl;
                std::lock_guard<std::mutex> lock(dataMutex); salesState = salesCheckedAt > 0 ? "saved" : "unavailable"; salesMessage = "Current sale information could not refresh. Available verified prices are retained."; nextSales = now + 120;
            }
        }
        if (state.running && now >= nextItchDetail) {
            nextItchDetail = now + 10;
            std::string id;
            Json candidateGame;
            {
                std::lock_guard<std::mutex> lock(dataMutex);
                std::set<std::string> current;
                for (const auto& game : itch["games"]) {
                    const auto candidate = game.value("id", ""); current.insert(candidate);
                    if (id.empty() && itchRetry[candidate] <= now && now - game.value("metadataCheckedAt", 0LL) >= 21600) { id = candidate; candidateGame = game; }
                }
                for (auto it = itchRetry.begin(); it != itchRetry.end();) if (!current.count(it->first)) it = itchRetry.erase(it); else ++it;
            }
            if (!id.empty()) {
                try {
                    const auto detail = loadItchDetails(candidateGame);
                    if (now - detail.value("checkedAt", 0LL) >= 21600) throw std::runtime_error("Metadata is awaiting refresh.");
                    std::lock_guard<std::mutex> lock(dataMutex);
                    for (auto& game : itch["games"]) if (game.value("id", "") == id) {
                        for (const auto* key : {"genres", "studio", "releaseDate", "eligible", "eligibilityReason", "aiDisclosed", "aiDisclosure", "rating", "demo"}) if (detail.contains(key)) game[key] = detail[key];
                        game["metadataCheckedAt"] = detail.value("checkedAt", now);
                    }
                    itchRetry.erase(id);
                } catch (const OnlineError& error) {
                    nextItchDetail = now + std::max(120, error.retryAfterSeconds);
                    itchRetry[id] = nextItchDetail;
                } catch (...) { itchRetry[id] = now + 600; }
            }
        }
        std::vector<int> ids;
        { std::lock_guard<std::mutex> lock(state.mutex); for (const auto& game : state.games) ids.push_back(game.appID); }
        {
            std::lock_guard<std::mutex> lock(dataMutex);
            for (auto i = steamData.begin(); i != steamData.end();) if (std::find(ids.begin(), ids.end(), i->first) == ids.end()) i = steamData.erase(i); else ++i;
            for (auto i = steamRetry.begin(); i != steamRetry.end();) if (std::find(ids.begin(), ids.end(), i->first) == ids.end()) i = steamRetry.erase(i); else ++i;
        }
        // One request at a time; the existing player refresh runs independently.
        for (int id : ids) {
            if (!state.running || now < nextSteam) break;
            bool due;
            { std::lock_guard<std::mutex> lock(dataMutex); const auto found = steamData.find(id); due = steamRetry[id] <= now && (found == steamData.end() || now - found->second.value("checkedAt", 0LL) >= 1800); }
            if (!due) continue;
            try { auto value = fetchSteamExtra(id); std::lock_guard<std::mutex> lock(dataMutex); steamData[id] = std::move(value); steamRetry.erase(id); }
            catch (const OnlineError& error) { std::lock_guard<std::mutex> lock(dataMutex); nextSteam = now + std::max(120, error.retryAfterSeconds); steamRetry[id] = nextSteam; break; }
            catch (...) { std::lock_guard<std::mutex> lock(dataMutex); steamRetry[id] = now + 300; }
            break;
        }
        for (int tick = 0; tick < 20 && state.running; ++tick) std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
}

static std::vector<Json> steamOffers(DashboardState& state) {
    std::vector<Json> offers;
    { std::lock_guard<std::mutex> lock(state.mutex); for (const auto& game : state.games) offers.push_back(gameSummary(game, false)); }
    for (auto& game : offers) { game["source"] = "steam"; game["price"] = steamDiscovery(game.at("appID").get<int>()).at("price"); game.erase("history"); game.erase("reviews"); }
    return offers;
}

Json budgetOptions(DashboardState& state) {
    Json result;
    for (const auto* platform : {"steam", "itch", "epic"}) {
        const auto collection = std::string(platform) == "steam" ? Json(steamOffers(state)) : storeCollection(platform)["games"];
        std::set<std::string> genres, currencies;
        for (const auto& game : collection) {
            for (const auto& genre : game.value("genres", std::vector<std::string>{})) if (gameplayGenre(genre)) genres.insert(genre);
            const auto price = game.value("price", Json::object());
            if (price.value("available", false)) currencies.insert(price.value("currency", ""));
        }
        currencies.erase("");
        if (currencies.empty()) currencies.insert(std::string(platform) == "itch" ? "USD" : "PHP");
        result[platform] = {{"genres", genres}, {"currencies", currencies}, {"ratingKind", std::string(platform) == "itch" ? "stars" : std::string(platform) == "epic" ? "unavailable" : "positive"}};
    }
    return result;
}

Json catalogSummary(DashboardState& state) {
    Json steam;
    {
        std::lock_guard<std::mutex> lock(state.mutex);
        int pending = 0, excluded = 0;
        for (const auto& rank : state.rankings) {
            const auto found = state.records.find(rank.appID);
            if (found == state.records.end() || found->second.title.empty() || found->second.type.empty()) ++pending;
            else if (found->second.type != "game") ++excluded;
        }
        steam = {{"available", state.games.size()}, {"ranked", state.rankings.size()},
            {"pending", pending}, {"excluded", excluded}, {"ready", !state.rankings.empty() || !state.games.empty()},
            {"stale", state.rankings.empty() || !state.playerMessage.empty() || std::time(nullptr) - state.rankings.front().playersUpdatedAt > 600}};
    }
    Json result = {{"steam", steam}};
    long long total = steam.at("available").get<long long>();
    bool complete = steam.value("ranked", 0) > 0 && steam.value("pending", 0) == 0;
    for (const auto* platform : {"epic", "itch"}) {
        const auto collection = storeCollection(platform);
        result[platform] = {{"available", collection["games"].size()}, {"ready", collection.value("ready", false)},
            {"pending", collection.value("pendingChecks", 0)}, {"excluded", collection.value("excludedListings", 0)}, {"stale", collection.value("stale", true)}, {"state", collection.value("state", "loading")}};
        total += static_cast<long long>(collection["games"].size());
        complete = complete && collection.value("ready", false) && collection.value("pendingChecks", 0) == 0;
    }
    result["totalAvailable"] = total; result["complete"] = complete;
    return result;
}

Json budgetResponse(DashboardState& state, const Json& input) {
    const auto platform = input.value("platform", std::string("steam"));
    if (platform != "steam" && platform != "itch" && platform != "epic") throw std::invalid_argument("Invalid platform.");
    std::vector<Json> offers;
    Json collection;
    if (platform == "steam") offers = steamOffers(state);
    else { collection = storeCollection(platform); for (const auto& game : collection["games"]) offers.push_back(game); }
    auto result = filterBudget(offers, input);
    result["trackedGames"] = offers.size();
    result["message"] = collection.is_object() ? collection.value("message", "") : "";
    result["sourceState"] = collection.is_object() ? collection.value("state", "loading") : "ready";
    result["pendingChecks"] = collection.is_object() ? collection.value("pendingChecks", 0) : 0;
    return result;
}

Json itchDetails(const std::string& id) {
    if (!itchURL(id)) throw std::invalid_argument("Invalid project URL.");
    const auto collection = storeCollection("itch");
    for (const auto& game : collection["games"]) if (game.value("id", "") == id) {
        auto detail = loadItchDetails(game);
        const auto checked = detail.value("checkedAt", 0LL);
        if (std::time(nullptr) - checked >= 21600) throw std::runtime_error("Creator information needs to refresh.");
        bool current = false;
        {
            std::lock_guard<std::mutex> lock(dataMutex);
            for (auto& entry : itch["games"]) if (entry.value("id", "") == id) {
                current = true;
                for (const auto* key : {"genres", "studio", "eligible", "eligibilityReason", "aiDisclosed", "aiDisclosure", "rating", "demo"}) if (detail.contains(key)) entry[key] = detail[key];
                entry["metadataCheckedAt"] = checked;
            }
        }
        if (!current || !detail.value("eligible", false) || detail.value("aiDisclosed", false)) throw std::invalid_argument("This project is no longer eligible for the collection.");
        detail["price"] = game["price"]; detail["metadataCheckedAt"] = checked;
        return detail;
    }
    throw std::invalid_argument("This game is not in the checked itch.io collection.");
}

static Json loadItchDetails(const Json& selected) {
    const auto id = selected.at("id").get<std::string>();
    return cachedSteamContent("itch-detail:" + id, 21600, [=] {
        const auto html = requestText(id);
        Document page(html, true);
        Json result = selected;
        result.update(parseItchPageMetadata(html, selected));
        result["screenshots"] = Json::array(); result["comments"] = Json::array(); result["posts"] = Json::array();
        if (!result.value("eligible", false)) { result["checkedAt"] = std::time(nullptr); return result; }
        auto title = page.text("//title");
        const auto by = title.rfind(" by ");
        if (by != std::string::npos) result["studio"] = title.substr(by + 4);
        for (auto* script : page.nodes("//script[@type='application/ld+json']")) {
            const auto data = Json::parse(Document::content(script), nullptr, false);
            if (data.is_object() && data.contains("aggregateRating")) {
                const auto& rating = data.at("aggregateRating");
                try {
                    const auto value = rating.at("ratingValue");
                    const double stars = value.is_string() ? std::stod(value.get<std::string>()) : value.get<double>();
                    const auto count = rating.at("ratingCount");
                    const long long total = count.is_string() ? std::stoll(count.get<std::string>()) : count.get<long long>();
                    if (std::isfinite(stars) && stars >= 0 && stars <= 5 && total >= 0) result["rating"] = {{"stars", stars}, {"count", total}};
                } catch (...) {}
            }
        }
        for (auto* image : page.nodes("//a[@data-image_lightbox='true']/@href")) {
            const auto url = Document::content(image);
            if (url.rfind("https://img.itch.zone/", 0) == 0) result["screenshots"].push_back({{"thumbnail", url}, {"full", url}});
            if (result["screenshots"].size() >= 12) break;
        }
        for (auto* post : page.nodes("//div[contains(concat(' ',normalize-space(@class),' '),' community_post ') and @data-post_id]")) {
            const auto body = page.text(".//*[contains(concat(' ',normalize-space(@class),' '),' post_body ')]", post);
            if (body.empty()) continue;
            result["comments"].push_back({{"author", page.text(".//*[contains(concat(' ',normalize-space(@class),' '),' post_author ')]", post)}, {"text", body.substr(0, 12000)}});
            if (result["comments"].size() >= 20) break;
        }
        // Some pages use a different author wrapper; keep public comments readable.
        if (result["comments"].empty()) for (auto* body : page.nodes("//*[contains(concat(' ',normalize-space(@class),' '),' game_comments_widget ')]//*[contains(concat(' ',normalize-space(@class),' '),' post_body ')]")) {
            result["comments"].push_back({{"author", "itch.io player"}, {"text", Document::content(body).substr(0, 12000)}});
            if (result["comments"].size() >= 20) break;
        }
        result["updatesMessage"] = "";
        if (!page.nodes("//link[contains(@href,'devlog.rss')]").empty()) {
            try {
                const std::string base = id.back() == '/' ? id.substr(0, id.size() - 1) : id;
                Document feed(requestText(base + "/devlog.rss"));
                for (auto* item : feed.nodes("/rss/channel/item")) {
                    const auto url = feed.text("link", item);
                    if (url.rfind(base + "/devlog/", 0) != 0) continue;
                    result["posts"].push_back({{"id", feed.text("guid", item)}, {"title", feed.text("title", item)}, {"url", url},
                        {"date", feed.text("pubDate", item)}, {"time", rssTime(feed.text("pubDate", item))}, {"category", feed.text("category", item)}, {"text", feed.text("description", item)}});
                    if (result["posts"].size() >= 10) break;
                }
            } catch (...) { result["updatesMessage"] = "Developer posts could not refresh. Open the creator's page to check updates."; }
        }
        result["checkedAt"] = std::time(nullptr);
        return result;
    });
}
