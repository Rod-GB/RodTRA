/*
 * Module: refresh_games.h
 * Folder: backend/services
 * File: refresh_games.h
 * Purpose: Declares the Steam refresh entry points.
 */

#pragma once
#include "dashboard_state.h"
bool refreshGames(DashboardState& state);
void runAutomaticRefresh(DashboardState& state);
