/*
 * Struct: DashboardState
 * Folder: backend/services
 * File: dashboard_state.h
 * Purpose: Keeps the game lists and refresh status shared by the background
 *   workers and web requests.
 */

#pragma once
#include "../models/game.h"
#include <mutex>
#include <atomic>
#include <filesystem>
#include <map>

// Steam refresh and website requests share this protected vector.
struct DashboardState {
    std::mutex mutex;
    std::vector<Game> games;
    std::vector<Game> rankings;
    std::map<int, Game> records;
    std::string message;
    std::string playerMessage, detailsMessage, ratingMessage, storageMessage;
    bool refreshing = false;
    bool restorePending = false;
    int playerRetrySeconds = 30;
    long long lastCheckedAt = 0;
    std::atomic<bool> running{true};
    std::filesystem::path projectFolder;
};
