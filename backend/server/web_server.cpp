#include "web_server.h"
#include "api_routes.h"
#include "content_routes.h"
#include "../config/settings.h"
#include <httplib.h>
#include <fstream>
#include <sstream>
#include <thread>
#include <chrono>
#include <iostream>

static Query queryParameters(const httplib::Request& request) {
    return Query(request.params.begin(), request.params.end());
}

// Hint: the library handles HTTP; our code chooses the public files and API routes.
void runWebsiteServer(DashboardState& state) {
    httplib::Server server;
    server.new_task_queue = [] { return new httplib::ThreadPool(4); };
    server.set_read_timeout(5, 0);
    server.set_write_timeout(5, 0);
    server.set_payload_max_length(8192);
    server.set_default_headers({{"Cache-Control", "no-store"}, {"X-Content-Type-Options", "nosniff"}});
    server.Get("/health", [](const auto&, auto& response) { response.set_content("OK", "text/plain"); });
    server.Get("/api/games", [&](const auto& request, auto& response) {
        response.set_content(dashboardResponse(state, queryParameters(request)).dump(), "application/json; charset=utf-8");
    });
    server.Get("/api/game", [&](const auto& request, auto& response) {
        const Json body = gameResponse(state, queryParameters(request));
        response.status = body.contains("error") ? 404 : 200;
        response.set_content(body.dump(), "application/json; charset=utf-8");
    });
    for (bool patches : {false, true}) {
        server.Get(patches ? "/api/patches" : "/api/reviews", [&, patches](const auto& request, auto& response) {
            const Json body = contentResponse(state, queryParameters(request), patches);
            response.status = body.contains("error") ? 503 : 200;
            response.set_content(body.dump(), "application/json; charset=utf-8");
        });
    }
    const std::map<std::string, std::pair<std::string, std::string>> files = {
        {"/", {"index.html", "text/html; charset=utf-8"}},
        {"/index.html", {"index.html", "text/html; charset=utf-8"}},
        {"/css/style.css", {"css/style.css", "text/css; charset=utf-8"}},
        {"/assets/dashboard.bundle.js", {"assets/dashboard.bundle.js", "text/javascript; charset=utf-8"}},
        {"/favicon.svg", {"favicon.svg", "image/svg+xml"}}
    };
    for (const auto& [path, file] : files) {
        server.Get(path, [&, file](const auto&, auto& response) {
            std::ifstream input(state.projectFolder / "frontend" / file.first, std::ios::binary);
            if (!input) { response.status = 404; response.set_content("Page not found.", "text/plain"); return; }
            std::ostringstream body;
            body << input.rdbuf();
            response.set_content(body.str(), file.second);
        });
    }
    server.set_exception_handler([](const auto&, auto& response, std::exception_ptr) {
        response.status = 500;
        response.set_content("{\"error\":\"Request could not be completed.\"}", "application/json");
    });
    const int port = websitePort();
    server.set_start_handler([port] { std::cout << "RodTRA server listening on port " << port << std::endl; });
    // Hint: Render's shutdown signal stops HTTP requests and the Steam refresh thread.
    std::atomic<bool> finished{false};
    std::thread shutdown([&] {
        while (!finished) {
            if (!state.running && server.is_running()) { server.stop(); break; }
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
    });
    const bool success = server.listen("0.0.0.0", port);
    finished = true;
    shutdown.join();
    if (!success) throw std::runtime_error("Website server could not listen on its port.");
}
