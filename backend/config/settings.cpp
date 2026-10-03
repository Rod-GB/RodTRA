#include "settings.h"
#include <cstdlib>
#include <string>
#include <stdexcept>

int websitePort() {
    const char* value = std::getenv("PORT");
    if (!value) return 10000;
    const std::string text = value;
    if (text.empty() || text.find_first_not_of("0123456789") != std::string::npos)
        throw std::runtime_error("PORT must be a number from 1 to 65535.");
    const int port = std::stoi(text);
    if (port < 1 || port > 65535) throw std::runtime_error("PORT is outside the allowed range.");
    return port;
}
