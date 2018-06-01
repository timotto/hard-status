/**
 * This file contains "distribution parameters". Feel free to overwrite it in your CI with defaults that
 * make sense on your deployment of Hard Status.
 */
#ifndef _HS_DEFAULTS_H
#define _HS_DEFAULTS_H

#define DEFAULT_NAME        "hard-status"
#define DEFAULT_PASSWORD    "changeme"

#define DEFAULT_API_URL     "http://192.168.0.2/concourse?url=http://192.168.0.3"
#define DEFAULT_OTA_URL     "http://192.168.0.4/repository/firmware/hard-status-esp32-lolin32.bin"
#define DEFAULT_OTA_AUTH    "dXNlcjpwYXNzd29yZA=="

#define DEFAULT_WIFI0_SSID  "hard-status-setup"
#define DEFAULT_WIFI0_PSK   "changeme"

#endif

