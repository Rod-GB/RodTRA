#pragma once
#include "../services/dashboard_state.h"
#include <map>

using Query = std::map<std::string, std::string>;
Json dashboardResponse(DashboardState& state, const Query& query);
Json gameResponse(DashboardState& state, const Query& query);
std::string queryValue(const Query& query, const std::string& key);
