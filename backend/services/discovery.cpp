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

namespace {
std::mutex dataMutex;
std::map<int, Json> steamData;
std::map<int, long long> steamRetry;
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
    try { if (!rate.empty()) discount = std::stoi(rate); } catch (...) { return {{"available", false}}; }
    const auto original = discount > 0 ? listedCents(feed.text("fullPrice", item)) : final;
    const auto end = rssTime(feed.text("saleends", item));
    if (!std::regex_match(currency, std::regex("[A-Z]{3}")) || final < 0 || original < final || discount < 0 || discount > 100 ||
        (discount > 0 && (original <= 0 || end <= std::time(nullptr)))) return {{"available", false}};
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
    Json games = Json::array();
    std::set<std::string> seen;
    auto append = [&](const std::string& url) {
      Document feed(requestText(url));
      for (auto* item : feed.nodes("/rss/channel/item")) {
        if (games.size() >= 50) break;
        auto url = feed.text("link", item);
        if (!itchURL(url) || !seen.insert(url).second) continue;
        games.push_back({{"id", url}, {"url", url}, {"source", "itch"}, {"title", feed.text("plainTitle", item)},
            {"description", feed.text("description", item)}, {"image", feed.text("imageurl", item)}, {"priceLabel", feed.text("price", item)},
            {"currency", feed.text("currency", item)}, {"price", itchPrice(feed, item)}, {"genres", Json::array()},
            {"platforms", feed.text("platforms", item)}, {"publisher", ""}, {"studio", ""}, {"releaseDate", ""}});
        if (games.back()["title"] == "") games.back()["title"] = feed.text("title", item);
      }
    };
    append("https://itch.io/games/newest/released.xml");
    std::string message;
    try { append("https://itch.io/games/newest/on-sale/released.xml"); }
    catch (...) { message = "Sale listings could not refresh. Recent released games are available."; }
    return {{"games", games}, {"updatedAt", std::time(nullptr)}, {"message", message}};
}
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
    if (store == "epic") {
        Json current = Json::array();
        for (const auto& game : result["games"]) if (game.value("endsAt", 0LL) > std::time(nullptr)) current.push_back(game);
        result["games"] = std::move(current);
    }
    for (auto& game : result["games"]) if (game.contains("price") && game["price"].value("available", false)) {
        auto& price = game["price"];
        const auto end = price.value("endsAt", 0LL);
        price["stale"] = std::time(nullptr) - price.value("checkedAt", 0LL) >= 1800 || (end > 0 && end <= std::time(nullptr));
    }
    return result;
}

void runDiscoveryRefresh(DashboardState& state) {
    long long nextEpic = 0, nextItch = 0, nextItchDetail = 0, nextSteam = 0;
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
                    for (const auto* key : {"genres", "studio", "releaseDate", "metadataCheckedAt"}) if (old.contains(key)) game[key] = old[key];
                }
                itch = std::move(fresh); nextItch = now + 1800;
            }
            catch (...) { std::lock_guard<std::mutex> lock(dataMutex); itch["message"] = "itch.io could not refresh. Available listings are retained."; nextItch = now + 300; }
        }
        if (state.running && now >= nextItchDetail) {
            nextItchDetail = now + 10;
            std::string id;
            {
                std::lock_guard<std::mutex> lock(dataMutex);
                std::set<std::string> current;
                for (const auto& game : itch["games"]) {
                    const auto candidate = game.value("id", ""); current.insert(candidate);
                    if (id.empty() && itchRetry[candidate] <= now && now - game.value("metadataCheckedAt", 0LL) >= 21600) id = candidate;
                }
                for (auto it = itchRetry.begin(); it != itchRetry.end();) if (!current.count(it->first)) it = itchRetry.erase(it); else ++it;
            }
            if (!id.empty()) {
                try {
                    const auto detail = itchDetails(id);
                    if (now - detail.value("checkedAt", 0LL) >= 21600) throw std::runtime_error("Metadata is awaiting refresh.");
                    std::lock_guard<std::mutex> lock(dataMutex);
                    for (auto& game : itch["games"]) if (game.value("id", "") == id) {
                        for (const auto* key : {"genres", "studio", "releaseDate"}) if (detail.contains(key)) game[key] = detail[key];
                        game["metadataCheckedAt"] = now;
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

Json budgetResponse(DashboardState& state, const Json& input) {
    std::vector<Game> games;
    { std::lock_guard<std::mutex> lock(state.mutex); for (const auto& game : state.games) games.push_back(gameSummary(game, false)); }
    std::vector<Json> offers;
    for (const auto& game : games) { Json offer = game; offer["price"] = steamDiscovery(game.appID).at("price"); offer.erase("history"); offer.erase("reviews"); offers.push_back(std::move(offer)); }
    auto result = filterBudget(offers, input);
    result["trackedGames"] = games.size();
    return result;
}

Json itchDetails(const std::string& id) {
    Json selected;
    { std::lock_guard<std::mutex> lock(dataMutex); for (const auto& game : itch["games"]) if (game.value("id", "") == id) selected = game; }
    if (selected.is_null() || !itchURL(id)) throw std::invalid_argument("This game is not in the current itch.io collection.");
    return cachedSteamContent("itch-detail:" + id, 21600, [=] {
        Document page(requestText(id), true);
        Json result = selected;
        result["genres"] = Json::array();
        for (auto* genre : page.nodes("//tr[td[1][normalize-space(.)='Genre']]/td[2]//a")) result["genres"].push_back(Document::content(genre));
        result["screenshots"] = Json::array(); result["comments"] = Json::array(); result["posts"] = Json::array();
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
                        {"date", feed.text("pubDate", item)}, {"category", feed.text("category", item)}, {"text", feed.text("description", item)}});
                    if (result["posts"].size() >= 10) break;
                }
            } catch (...) { result["updatesMessage"] = "Developer posts could not refresh. Open the creator's page to check updates."; }
        }
        result["checkedAt"] = std::time(nullptr);
        return result;
    });
}
