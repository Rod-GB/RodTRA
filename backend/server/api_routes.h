/*
 * Module: api_routes.h
 * Folder: backend/server
 * File: api_routes.h
 * Purpose: Declares the Steam reply functions and query-parameter type.
 */

#pragma once
#include "../services/dashboard_state.h"
#include <map>

using Query = std::map<std::string, std::string>;
Json dashboardResponse(DashboardState& state, const Query& query);
Json gameResponse(DashboardState& state, const Query& query);
std::string queryValue(const Query& query, const std::string& key);
