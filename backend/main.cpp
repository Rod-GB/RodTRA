#include "config/settings.h"
#include "services/refresh_games.h"
#include "database/game_store.h"
#include "server/web_server.h"
#include <iostream>
#include <thread>
#include <csignal>

static DashboardState state;
static_assert(std::atomic<bool>::is_always_lock_free);

static void stopServer(int) {
    state.running = false;
}

// Hint: main only connects the modules; each module has its own folder.
int main() {
    state.projectFolder = std::filesystem::current_path();
    try {
        if (!std::filesystem::is_regular_file(state.projectFolder / "frontend" / "index.html"))
            throw std::runtime_error("Frontend files are missing.");
        state.games = loadGames();
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
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
