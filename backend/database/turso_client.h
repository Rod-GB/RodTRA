/*
 * Module: turso_client.h
 * Folder: backend/database
 * File: turso_client.h
 * Purpose: Declares the small database communication interface.
 */

#pragma once
void validateDatabaseSettings();
#include "../models/game.h"

Json executeSql(const std::string& sql, const Json& arguments = Json::array());
