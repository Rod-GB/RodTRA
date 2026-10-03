#pragma once
#include "../models/game.h"
#include <functional>

Json cachedSteamContent(const std::string& key, int seconds, const std::function<Json()>& fetch);
