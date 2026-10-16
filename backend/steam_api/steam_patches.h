#pragma once
#include "../models/game.h"

Json fetchSteamPatches(int appID, long long before = 0, int count = 12);

Json parseSteamPatches(const Json& source, int appID, int count);
