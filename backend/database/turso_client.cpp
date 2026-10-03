#include "turso_client.h"
#include "../network/http_client.h"
#include <cstdlib>
#include <regex>
#include <stdexcept>

// Hint: these values come from Render, never from the browser or source code.
static std::string databaseURL() {
    const char* value = std::getenv("TURSO_DATABASE_URL");
    if (!value) throw std::runtime_error("Set TURSO_DATABASE_URL in the server environment.");
    std::string url = value;
    if (url.rfind("libsql://", 0) == 0) url.replace(0, 9, "https://");
    if (url.rfind("turso://", 0) == 0) url.replace(0, 8, "https://");
    if (!url.empty() && url.back() == '/') url.pop_back();
    if (!std::regex_match(url, std::regex(R"(https://[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.turso\.io)")))
        throw std::runtime_error("Use the Turso database URL from your dashboard.");
    return url + "/v2/pipeline";
}

Json executeSql(const std::string& sql, const Json& arguments) {
    const std::string url = databaseURL();
    const char* token = std::getenv("TURSO_AUTH_TOKEN");
    if (!token || !*token || std::string(token).find_first_of("\r\n") != std::string::npos)
        throw std::runtime_error("Set TURSO_AUTH_TOKEN in the server environment.");
    const Json payload = {{"requests", {
        {{"type", "execute"}, {"stmt", {{"sql", sql}, {"args", arguments}, {"want_rows", true}}}},
        {{"type", "close"}}
    }}};
    const Json results = requestJson(url, payload, token).at("results");
    if (results.size() != 2 || results.at(0).value("type", "") != "ok" ||
        results.at(1).value("type", "") != "ok")
        throw std::runtime_error("Database request failed; saved history is retained.");
    return results.at(0).at("response").at("result");
}
