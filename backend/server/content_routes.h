/*
 * Module: content_routes.h
 * Folder: backend/server
 * File: content_routes.h
 * Purpose: Declares the common handler for reviews and patch/update pages.
 */

#pragma once
#include "api_routes.h"

Json contentResponse(DashboardState& state, const Query& query, bool patches);
