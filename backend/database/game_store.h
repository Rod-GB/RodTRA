#pragma once
#include "../models/game.h"
std::vector<Game> loadGames();
bool saveGames(const std::vector<Game>& games);
