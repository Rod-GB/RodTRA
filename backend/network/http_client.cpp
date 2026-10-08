#include "http_client.h"
#include <curl/curl.h>
#include <memory>
#include <algorithm>
#include <cctype>

struct CurlRuntime {
    CurlRuntime() {
        if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK)
            throw std::runtime_error("HTTPS could not start.");
    }
    ~CurlRuntime() { curl_global_cleanup(); }
};

static size_t receiveBody(char* data, size_t size, size_t count, void* output) {
    auto& response = *static_cast<std::string*>(output);
    const size_t bytes = size * count;
    if (bytes > 16 * 1024 * 1024 - response.size()) return 0;
    try { response.append(data, bytes); return bytes; } catch (...) { return 0; }
}

static size_t receiveHeader(char* data, size_t size, size_t count, void* output) {
    const size_t bytes = size * count;
    try {
        std::string header(data, bytes);
        std::transform(header.begin(), header.end(), header.begin(),
            [](unsigned char letter) { return static_cast<char>(std::tolower(letter)); });
        if (header.rfind("retry-after:", 0) == 0) {
            const auto value = header.substr(12);
            std::size_t used = 0;
            const int seconds = std::stoi(value, &used);
            if (seconds > 0) *static_cast<int*>(output) = std::min(seconds, 3600);
        }
    } catch (...) {}
    return bytes;
}

// libcurl handles HTTPS; secret headers never appear in error messages.
Json requestJson(const std::string& url, const Json& body, const std::string& token) {
    static CurlRuntime runtime;
    std::unique_ptr<CURL, decltype(&curl_easy_cleanup)> request(curl_easy_init(), curl_easy_cleanup);
    if (!request) throw OnlineError("HTTPS request could not start.", true);
    std::string response;
    int retryAfter = 60;
    curl_easy_setopt(request.get(), CURLOPT_URL, url.c_str());
    curl_easy_setopt(request.get(), CURLOPT_PROTOCOLS_STR, "https");
    curl_easy_setopt(request.get(), CURLOPT_CONNECTTIMEOUT, 4L);
    curl_easy_setopt(request.get(), CURLOPT_TIMEOUT, 10L);
    curl_easy_setopt(request.get(), CURLOPT_NOSIGNAL, 1L);
    curl_easy_setopt(request.get(), CURLOPT_WRITEFUNCTION, receiveBody);
    curl_easy_setopt(request.get(), CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(request.get(), CURLOPT_HEADERFUNCTION, receiveHeader);
    curl_easy_setopt(request.get(), CURLOPT_HEADERDATA, &retryAfter);
    curl_easy_setopt(request.get(), CURLOPT_USERAGENT, "Gdaw/1.0");
    curl_easy_setopt(request.get(), CURLOPT_ACCEPT_ENCODING, "");
    curl_slist* rawHeaders = curl_slist_append(nullptr, "Content-Type: application/json");
    if (!rawHeaders) throw OnlineError("HTTPS headers could not be created.", true);
    if (!token.empty()) {
        auto* added = curl_slist_append(rawHeaders, ("Authorization: Bearer " + token).c_str());
        if (!added) { curl_slist_free_all(rawHeaders); throw OnlineError("HTTPS headers could not be created.", true); }
        rawHeaders = added;
    }
    std::unique_ptr<curl_slist, decltype(&curl_slist_free_all)> headers(rawHeaders, curl_slist_free_all);
    curl_easy_setopt(request.get(), CURLOPT_HTTPHEADER, headers.get());
    const std::string payload = body.is_null() ? "" : body.dump();
    if (!body.is_null()) {
        curl_easy_setopt(request.get(), CURLOPT_POSTFIELDS, payload.c_str());
        curl_easy_setopt(request.get(), CURLOPT_POSTFIELDSIZE_LARGE, static_cast<curl_off_t>(payload.size()));
    }
    const auto result = curl_easy_perform(request.get());
    long status = 0;
    curl_easy_getinfo(request.get(), CURLINFO_RESPONSE_CODE, &status);
    if (result != CURLE_OK) throw OnlineError("Online request timed out or could not connect.", true);
    if (status < 200 || status >= 300) {
        if (status == 401 || status == 403) throw OnlineError("Online access was denied. Check the server credentials.", false);
        if (status == 429) throw OnlineError("The data provider is temporarily limiting requests.", true, retryAfter);
        throw OnlineError("The data provider could not complete the request.", status >= 500, retryAfter);
    }
    return Json::parse(response);
}

std::string encodeURL(const std::string& text) {
    const char* digits = "0123456789ABCDEF";
    std::string encoded;
    for (unsigned char letter : text) {
        if ((letter >= 'a' && letter <= 'z') || (letter >= 'A' && letter <= 'Z') ||
            (letter >= '0' && letter <= '9') || letter == '-' || letter == '_' || letter == '.')
            encoded += static_cast<char>(letter);
        else { encoded += '%'; encoded += digits[letter >> 4]; encoded += digits[letter & 15]; }
    }
    return encoded;
}
