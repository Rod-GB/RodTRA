#pragma once
#include "../models/game.h"
#include <mutex>
#include <atomic>
#include <filesystem>

// Hint: Steam refresh and website requests share this protected vector.
struct DashboardState {
    std::mutex mutex;
    std::vector<Game> games;
    std::string message;
    bool refreshing = false;
    long long lastCheckedAt = 0;
    std::atomic<bool> running{true};
    std::filesystem::path projectFolder;
};
