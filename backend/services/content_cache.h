/*
 * Module: content_cache.h
 * Folder: backend/services
 * File: content_cache.h
 * Purpose: Declares the reusable content-cache function.
 */

#pragma once
#include "../models/game.h"
#include <functional>

Json cachedSteamContent(const std::string& key, int seconds, const std::function<Json()>& fetch);
