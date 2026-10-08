#include "config/settings.h"
#include "services/refresh_games.h"
#include "database/game_store.h"
#include "database/turso_client.h"
#include "network/http_client.h"
#include "server/web_server.h"
#include <iostream>
#include <thread>
#include <csignal>

static DashboardState state;
static_assert(std::atomic<bool>::is_always_lock_free);

static void stopServer(int) {
    state.running = false;
}

// main only connects the modules; each module has its own folder.
int main() {
    state.projectFolder = std::filesystem::current_path();
    try {
        if (!std::filesystem::is_regular_file(state.projectFolder / "frontend" / "index.html"))
            throw std::runtime_error("Frontend files are missing.");
        validateDatabaseSettings();
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
    try { state.games = loadGames(); }
    catch (const OnlineError& error) {
        if (!error.retryable) { std::cerr << error.what() << '\n'; return 1; }
        state.restorePending = true;
        state.storageMessage = "Saved history is temporarily unavailable. Connecting to Steam while the database retries.";
    }
    catch (const std::exception& error) { std::cerr << error.what() << '\n'; return 1; }
    for (const auto& game : state.games) state.records[game.appID] = game;
    std::signal(SIGINT, stopServer);
    std::signal(SIGTERM, stopServer);
#ifdef SIGPIPE
    std::signal(SIGPIPE, SIG_IGN);
#endif
    std::thread updater(runAutomaticRefresh, std::ref(state));
    int result = 0;
    try { runWebsiteServer(state); }
    catch (const std::exception& error) { std::cerr << error.what() << '\n'; result = 1; }
    state.running = false;
    updater.join();
    return result;
}
