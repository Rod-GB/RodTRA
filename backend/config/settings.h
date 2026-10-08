#pragma once

// change refresh timing here, not inside the Steam code.
constexpr int DashboardGames = 8;
constexpr int MaximumTrackedGames = 100;
constexpr int DetailsPerRefresh = 10;
constexpr int RatingsPerRefresh = 10;
constexpr int PlayerRefreshSeconds = 30;
constexpr int ReviewRefreshSeconds = 600;
constexpr int DetailsRefreshSeconds = 86400;
constexpr int MaximumChartReadings = 1440;
constexpr int HistorySaveSeconds = 900;
constexpr int ContentRefreshSeconds = 300;
constexpr int UpdatesBatchSize = 5;
constexpr int UpdatesBatchSeconds = 15;

// Render supplies the listening port through its environment.
int websitePort();
