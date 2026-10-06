#include "content_cache.h"
#include <map>
#include <mutex>
#include <ctime>

// repeated visits reuse a short-lived page, with at most 128 cached pages.
Json cachedSteamContent(const std::string& key, int seconds, const std::function<Json()>& fetch) {
    struct Page { Json body; long long time; };
    static std::map<std::string, Page> pages;
    static std::mutex mutex;
    {
        std::lock_guard<std::mutex> lock(mutex);
        const auto found = pages.find(key);
        if (found != pages.end() && std::time(nullptr) - found->second.time < seconds) return found->second.body;
    }
    // network requests do not hold the game collection's mutex.
    Json body = fetch();
    {
        std::lock_guard<std::mutex> lock(mutex);
        if (pages.size() >= 128) pages.clear();
        pages[key] = {body, std::time(nullptr)};
    }
    return body;
}
