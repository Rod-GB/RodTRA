#pragma once
void validateDatabaseSettings();
#include "../models/game.h"

Json executeSql(const std::string& sql, const Json& arguments = Json::array());
