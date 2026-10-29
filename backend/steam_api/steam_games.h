/*
 * Module: steam_games.h
 * Folder: backend/steam_api
 * File: steam_games.h
 * Purpose: Declares the Steam ranking and basic-detail functions.
 */

#pragma once
#include "../models/game.h"
std::vector<Game> fetchSteamLeaderboard();
bool fetchSteamDetails(Game& game);
