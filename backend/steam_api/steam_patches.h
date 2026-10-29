/*
 * Module: steam_patches.h
 * Folder: backend/steam_api
 * File: steam_patches.h
 * Purpose: Declares Steam post fetching and parsing.
 */

#pragma once
#include "../models/game.h"

Json fetchSteamPatches(int appID, long long before = 0, int count = 12);

Json parseSteamPatches(const Json& source, int appID, int count);
