/*
 * Module: steam_reviews.h
 * Folder: backend/steam_api
 * File: steam_reviews.h
 * Purpose: Declares the Steam rating and written-review operations.
 */

#pragma once
#include "../models/game.h"
void fetchSteamReviews(Game& game);
Json fetchSteamReviewPage(int appID, const std::string& sort, const std::string& cursor);
