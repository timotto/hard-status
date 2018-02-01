#!/bin/sh

set -e -x

SRC="${1:-.}"
DST="${2:-.}"

cat > "${DST}/defaults.h" << EOT
/**
 * This file contains "distribution parameters". Feel free to overwrite it in your CI with defaults that
 * make sense on your deployment of Hard Status.
 */
#ifndef _HS_DEFAULTS_H
#define _HS_DEFAULTS_H

#define DEFAULT_NAME        "$DEFAULT_NAME"
#define DEFAULT_PASSWORD    "$DEFAULT_PASSWORD"

#define DEFAULT_API_URL     "$DEFAULT_API_URL"
#define DEFAULT_OTA_URL     "$DEFAULT_OTA_URL"
#define DEFAULT_OTA_AUTH    "$DEFAULT_OTA_AUTH"

#define DEFAULT_WIFI0_SSID  "$DEFAULT_WIFI0_SSID"
#define DEFAULT_WIFI0_PSK   "$DEFAULT_WIFI0_PSK"

#endif
EOT

cat "${DST}/defaults.h"
