#pragma once
#include "../models/game.h"
#include <utility>

enum class GameOrder { Players, Rating, Title, AppID };

// choose what goes first; ID breaks ties consistently.
inline bool comesBefore(const Game& left, const Game& right, GameOrder order) {
    if (order == GameOrder::Players && left.currentPlayers != right.currentPlayers)
        return left.currentPlayers > right.currentPlayers;
    if (order == GameOrder::Rating && positivePercent(left) != positivePercent(right))
        return positivePercent(left) > positivePercent(right);
    if (order == GameOrder::Title && left.title != right.title) return left.title < right.title;
    return left.appID < right.appID;
}

// partition places records on either side of the pivot.
inline int partitionGames(std::vector<Game>& games, int low, int high, GameOrder order) {
    const Game pivot = games[high];
    int boundary = low;
    for (int i = low; i < high; ++i)
        if (comesBefore(games[i], pivot, order)) std::swap(games[boundary++], games[i]);
    std::swap(games[boundary], games[high]);
    return boundary;
}

// average O(n log n), worst O(n squared). Sort both sides recursively.
inline void quickSortGames(std::vector<Game>& games, int low, int high, GameOrder order) {
    if (low >= high) return;
    const int pivot = partitionGames(games, low, high, order);
    quickSortGames(games, low, pivot - 1, order);
    quickSortGames(games, pivot + 1, high, order);
}

inline void sortGames(std::vector<Game>& games, GameOrder order = GameOrder::Players) {
    quickSortGames(games, 0, static_cast<int>(games.size()) - 1, order);
}
