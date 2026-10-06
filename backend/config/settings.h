#pragma once

// change refresh timing here, not inside the Steam code.
constexpr int DashboardGames = 8;
constexpr int MaximumTrackedGames = 100;
constexpr int DetailsPerRefresh = 10;
constexpr int RatingsPerRefresh = 10;
constexpr int PlayerRefreshSeconds = 60;
constexpr int ReviewRefreshSeconds = 600;
constexpr int DetailsRefreshSeconds = 86400;
constexpr int MaximumChartReadings = 1440;

// Render supplies the listening port through its environment.
int websitePort();
