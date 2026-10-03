#pragma once
#include "../models/game.h"
void fetchSteamReviews(Game& game);
Json fetchSteamReviewPage(int appID, const std::string& sort, const std::string& cursor);
