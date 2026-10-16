#pragma once
#include "dashboard_state.h"

// Additional public catalogue data lives in bounded process memory, never Turso.
void runDiscoveryRefresh(DashboardState& state);
Json steamDiscovery(int appID, bool full = false);
Json storeCollection(const std::string& store);
Json itchDetails(const std::string& id);
Json budgetResponse(DashboardState& state, const Json& input);
Json budgetOptions(DashboardState& state);
Json catalogSummary(DashboardState& state);
// Pure source parsers are also used by the backend regression checks.
Json parseItchListings(const std::string& xml);
Json parseItchPageMetadata(const std::string& html, const Json& listing);
