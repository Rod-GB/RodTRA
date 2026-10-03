#pragma once
#include "quick_sort.h"

// Hint: sort by AppID first. Each step halves the search.
inline int binarySearchByAppID(const std::vector<Game>& games, int appID) {
    int low = 0, high = static_cast<int>(games.size()) - 1;
    while (low <= high) {
        const int middle = low + (high - low) / 2;
        if (games[middle].appID == appID) return middle;
        if (games[middle].appID < appID) low = middle + 1;
        else high = middle - 1;
    }
    return -1;
}

