#include "content_cache.h"
#include "../network/http_client.h"
#include <map>
#include <mutex>
#include <future>
#include <ctime>
#include <algorithm>

// Coalesce matching requests and keep a bounded cache of complete content.
Json cachedSteamContent(const std::string& key, int seconds, const std::function<Json()>& fetch) {
    struct Page { Json body; long long time; std::size_t bytes; };
    struct Failure { std::exception_ptr error; long long retryAt; };
    static std::map<std::string, Page> pages;
    static std::map<std::string, Failure> failures;
    static std::map<std::string, std::shared_future<Json>> pending;
    static std::mutex mutex;
    static std::size_t bytes = 0;
    std::shared_future<Json> waiting;
    std::shared_ptr<std::promise<Json>> promise;
    Json stale;
    {
        std::lock_guard<std::mutex> lock(mutex);
        const auto found = pages.find(key);
        if (found != pages.end()) {
            if (std::time(nullptr) - found->second.time < seconds) return found->second.body;
            stale = found->second.body;
        }
        const auto failure = failures.find(key);
        if (failure != failures.end() && std::time(nullptr) < failure->second.retryAt) {
            if (!stale.is_null()) { stale["message"] = "Showing saved content while Steam reconnects."; return stale; }
            std::rethrow_exception(failure->second.error);
        }
        const auto active = pending.find(key);
        if (active != pending.end()) waiting = active->second;
        else {
            promise = std::make_shared<std::promise<Json>>();
            pending[key] = promise->get_future().share();
        }
    }
    if (!promise) return waiting.get();
    try {
        Json body = fetch();
        const std::size_t size = body.dump().size();
        {
            std::lock_guard<std::mutex> lock(mutex);
            const auto previous = pages.find(key);
            if (previous != pages.end()) { bytes -= previous->second.bytes; pages.erase(previous); }
            while (!pages.empty() && (pages.size() >= 128 || bytes + size > 8 * 1024 * 1024)) {
                const auto oldest = std::min_element(pages.begin(), pages.end(),
                    [](const auto& left, const auto& right) { return left.second.time < right.second.time; });
                bytes -= oldest->second.bytes;
                pages.erase(oldest);
            }
            if (size <= 8 * 1024 * 1024) { pages[key] = {body, std::time(nullptr), size}; bytes += size; }
            failures.erase(key);
            pending.erase(key);
        }
        promise->set_value(body);
        return body;
    } catch (...) {
        const auto error = std::current_exception();
        int delay = 30;
        try { std::rethrow_exception(error); }
        catch (const OnlineError& failure) { delay = std::max(30, failure.retryAfterSeconds); }
        catch (...) {}
        {
            std::lock_guard<std::mutex> lock(mutex);
            if (failures.size() >= 128) {
                const auto oldest = std::min_element(failures.begin(), failures.end(),
                    [](const auto& left, const auto& right) { return left.second.retryAt < right.second.retryAt; });
                failures.erase(oldest);
            }
            failures[key] = {error, std::time(nullptr) + delay};
            pending.erase(key);
        }
        if (!stale.is_null()) {
            stale["message"] = "Showing saved content while Steam reconnects.";
            promise->set_value(stale);
            return stale;
        }
        promise->set_exception(error);
        std::rethrow_exception(error);
    }
}
