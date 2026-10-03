#pragma once
#include "../models/game.h"

// Hint: a null body sends GET; a JSON body sends POST.
Json requestJson(const std::string& url, const Json& body = nullptr, const std::string& token = "");
std::string encodeURL(const std::string& text);
