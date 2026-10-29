/*
 * Module: game_store.h
 * Folder: backend/database
 * File: game_store.h
 * Purpose: Declares the two high-level saved-game operations.
 */

#pragma once
#include "../models/game.h"
std::vector<Game> loadGames();
bool saveGames(const std::vector<Game>& games);
