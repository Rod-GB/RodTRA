#pragma once
#include "../models/game.h"
std::vector<Game> fetchSteamLeaderboard();
bool fetchSteamDetails(Game& game);
