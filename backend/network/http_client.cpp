#include "http_client.h"
#include <curl/curl.h>
#include <memory>
#include <stdexcept>

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
    if (bytes > 4 * 1024 * 1024 - response.size()) return 0;
    try { response.append(data, bytes); return bytes; }
    catch (...) { return 0; }
}

// Hint: libcurl handles HTTPS directly; tokens never go through a shell command.
Json requestJson(const std::string& url, const Json& body, const std::string& token) {
    static CurlRuntime runtime;
    std::unique_ptr<CURL, decltype(&curl_easy_cleanup)> request(curl_easy_init(), curl_easy_cleanup);
    if (!request) throw std::runtime_error("HTTPS request could not start.");
    std::string response;
    curl_easy_setopt(request.get(), CURLOPT_URL, url.c_str());
    curl_easy_setopt(request.get(), CURLOPT_PROTOCOLS_STR, "https");
    curl_easy_setopt(request.get(), CURLOPT_CONNECTTIMEOUT, 4L);
    curl_easy_setopt(request.get(), CURLOPT_TIMEOUT, 10L);
    curl_easy_setopt(request.get(), CURLOPT_NOSIGNAL, 1L);
    curl_easy_setopt(request.get(), CURLOPT_WRITEFUNCTION, receiveBody);
    curl_easy_setopt(request.get(), CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(request.get(), CURLOPT_USERAGENT, "RodTRA/1.0");
    curl_easy_setopt(request.get(), CURLOPT_ACCEPT_ENCODING, "");
    curl_slist* rawHeaders = curl_slist_append(nullptr, "Content-Type: application/json");
    if (!rawHeaders) throw std::runtime_error("HTTPS headers could not be created.");
    if (!token.empty()) {
        auto* added = curl_slist_append(rawHeaders, ("Authorization: Bearer " + token).c_str());
        if (!added) { curl_slist_free_all(rawHeaders); throw std::runtime_error("HTTPS headers could not be created."); }
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
    if (result != CURLE_OK || status < 200 || status >= 300)
        throw std::runtime_error("Online request unavailable.");
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
