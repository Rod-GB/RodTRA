cmake_minimum_required(VERSION 3.24)
project(Gdaw LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
find_package(CURL REQUIRED)
find_package(Threads REQUIRED)

# libraries download into the build folder, outside our source code.
include(FetchContent)
FetchContent_Declare(json
  URL https://github.com/nlohmann/json/releases/download/v3.12.0/json.tar.xz
  URL_HASH SHA256=42f6e95cad6ec532fd372391373363b62a14af6d771056dbfc86160e6dfff7aa
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
)
set(HTTPLIB_USE_OPENSSL_IF_AVAILABLE OFF CACHE BOOL "" FORCE)
set(HTTPLIB_USE_ZLIB_IF_AVAILABLE OFF CACHE BOOL "" FORCE)
set(HTTPLIB_USE_BROTLI_IF_AVAILABLE OFF CACHE BOOL "" FORCE)
set(HTTPLIB_USE_ZSTD_IF_AVAILABLE OFF CACHE BOOL "" FORCE)
set(HTTPLIB_INSTALL OFF CACHE BOOL "" FORCE)
FetchContent_Declare(httplib
  URL https://github.com/yhirose/cpp-httplib/archive/refs/tags/v0.59.0.tar.gz
  URL_HASH SHA256=7c8cc7df044abb837d75f7c1e56333305acb40335c3788b8f5fbf5927e63e148
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
)
FetchContent_MakeAvailable(json httplib)

add_executable(rodtra
  main.cpp
  config/settings.cpp
  network/http_client.cpp
  steam_api/steam_games.cpp
  steam_api/steam_reviews.cpp
  steam_api/steam_patches.cpp
  database/turso_client.cpp
  database/game_store.cpp
  services/refresh_games.cpp
  services/content_cache.cpp
  server/api_routes.cpp
  server/content_routes.cpp
  server/web_server.cpp
)
target_link_libraries(rodtra PRIVATE nlohmann_json::nlohmann_json httplib::httplib CURL::libcurl Threads::Threads)
if(MSVC)
  target_compile_definitions(rodtra PRIVATE _CRT_SECURE_NO_WARNINGS)
  target_compile_options(rodtra PRIVATE /W4 /utf-8)
else()
  target_compile_options(rodtra PRIVATE -Wall -Wextra -Wpedantic)
endif()
