#ifndef _COMMON_H
#define _COMMON_H

#include <WiFi.h>
#include <ArduinoJson.h>
#include <NeoPixelBus.h>
#include <NeoPixelBrightnessBus.h>
#include <NeoPixelAnimator.h>
#include <FS.h>
#include <SPIFFS.h>

// when working with WS2812 on the ESP8266 the serial port is an option for connecting the LEDs, this way the output can be disabled
#define DEBUG(x) Serial.println(x)
#define DEBUGf(x...) Serial.printf(x)

// some operations respect an ongoing OTA upgrade
#define OTA_STATE_IDLE  0
#define OTA_STATE_PUSH  1
#define OTA_STATE_LOAD  2
#define OTA_STATE_FLASH 3
#define OTA_STATE_ERROR 9

// if changed will trigger reset of config
// if new fields to config_t are appended at the end, then default override mechanism should work without changing CONFIG_VERSION
#define CONFIG_VERSION 0
#define MAX_USER_WIFI 4
#define MAX_STRING_LENGTH 32

/**
 * A credential is used for WiFi credentials, the build-in hotspot and web server access.
 */
typedef struct config_credential_t {
  char login[MAX_STRING_LENGTH];
  char password[MAX_STRING_LENGTH];
} config_credential_t;

/**
 * This big struct is saved on the SPIFFS
 */
typedef struct config_t {
  uint8_t version;
  uint8_t maxUserWifi;
  uint8_t maxStringLength;
  char name[MAX_STRING_LENGTH];
  config_credential_t webserver;
  config_credential_t hotspot;
  config_credential_t wifi[MAX_STRING_LENGTH];
  uint8_t brightness;
  char apiUrl[256];
  char otaUrl[256];
  char otaAuth[256];
  uint16_t apiCheckDelay;
  uint16_t otaCheckDelay;
} config_t;

// output from the borrowed url_parser code
typedef struct url_parser_url_t {
  char *protocol;
  char *host;
  int port;
  char *path;
  char *query_string;
} url_parser_url_t;

// almost like the borrowed code but also with an https boolean
typedef struct wifi_client_url_t {
  bool https;
  int port;
  char *host;
  char *path;
  char *query_string;
} wifi_client_url_t;

#endif

