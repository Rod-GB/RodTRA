/*
 * Class: OnlineError
 * Folder: backend/network
 * File: http_client.h
 * Purpose: Defines OnlineError with retry details and declares the shared
 *   HTTPS request functions.
 */

#pragma once
#include "../models/game.h"
#include <stdexcept>

// Keep retry information inside the backend without exposing credentials.
class OnlineError : public std::runtime_error {
public:
    bool retryable;
    int retryAfterSeconds;
    int status;
    OnlineError(const std::string& message, bool temporary, int retryAfter = 30, int httpStatus = 0)
        : std::runtime_error(message), retryable(temporary), retryAfterSeconds(retryAfter), status(httpStatus) {}
};

Json requestJson(const std::string& url, const Json& body = nullptr, const std::string& token = "");
std::string requestText(const std::string& url, const Json& body = nullptr, const std::string& token = "");
std::string encodeURL(const std::string& text);
