#pragma once
#include "../server/api_routes.h"

void runUpdatesRefresh(DashboardState& state);
Json updatesResponse(DashboardState& state, const Query& query);
Json updatePostResponse(DashboardState& state, const Query& query);
