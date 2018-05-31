/**
 * This sketch file contains code to load and store the global config struct on the SPIFFS.
 */
#include "common.h"
#include "defaults.h"

void setup_config() {
  DEBUG("Config: setup: started");
  config_load();
  DEBUG("Config: setup: complete");
}

void loop_config() {}

void config_load() {
  memset(&config, 0, sizeof(config_t));
  File configFile = SPIFFS.open("/config", FILE_READ);
  if (configFile >= 0) {
    if (configFile.size() > 0) {
      configFile.read((uint8_t*)&config, sizeof(config_t));
      configFile.close();
      if (config.version != CONFIG_VERSION || config.maxStringLength != MAX_STRING_LENGTH || config.maxUserWifi != MAX_USER_WIFI) {
        DEBUGf("Config: load: incompatible version: firmware vs config: version=[%d/%d] strlen=[%d/%d] wifis=[%d/%d]\n", 
          CONFIG_VERSION, config.version,
          MAX_STRING_LENGTH, config.maxStringLength, 
          MAX_USER_WIFI, config.maxUserWifi
          );
        memset(&config, 0, sizeof(config_t));
      }
    }
  }

  config_load_defaults();
  config_save();
}

void config_load_defaults() {
  DEBUG("Config: load defaults: started");
  config.version = CONFIG_VERSION;
  config.maxStringLength = MAX_STRING_LENGTH;
  config.maxUserWifi = MAX_USER_WIFI;
  if (strlen(config.name) < 1) strncpy(config.name, DEFAULT_NAME, sizeof(config.name));
  if (strlen(config.webserver.login) < 1) {
    strncpy(config.webserver.login, DEFAULT_NAME, sizeof(config.webserver.login));
    strncpy(config.webserver.password, DEFAULT_PASSWORD, sizeof(config.webserver.password));
  }
  if (strlen(config.hotspot.login) < 1) {
    strncpy(config.hotspot.login, DEFAULT_NAME, sizeof(config.hotspot.login));
    strncpy(config.hotspot.password, DEFAULT_PASSWORD, sizeof(config.hotspot.password));
  }
  int wifis = 0;
  for(int i=0; i<MAX_USER_WIFI; i++) {
    if (strlen(config.wifi[i].login) < 1) strncpy(config.wifi[i].password, "", sizeof(config.wifi[i].password));
    else wifis++;
  }
  if (wifis == 0) {
    strncpy(config.wifi[0].login, DEFAULT_WIFI0_SSID, sizeof(config.wifi[MAX_USER_WIFI-1].login));
    strncpy(config.wifi[0].password, DEFAULT_WIFI0_PSK, sizeof(config.wifi[MAX_USER_WIFI-1].password));
  }
  if (config.brightness < 1) config.brightness = 20;

  if (strlen(config.apiUrl) < 8) strncpy(config.apiUrl, DEFAULT_API_URL, sizeof(config.apiUrl));
  if (strlen(config.otaUrl) < 8) strncpy(config.otaUrl, DEFAULT_OTA_URL, sizeof(config.otaUrl));
  if (strlen(config.otaAuth) < 1) strncpy(config.otaAuth, DEFAULT_OTA_AUTH, sizeof(config.otaAuth));

  if (config.apiCheckDelay < 1) config.apiCheckDelay = 10;
  if (config.otaCheckDelay < 1) config.otaCheckDelay = 300;

  DEBUG("Config: load defaults: complete");
}

void config_save() {
  File configFile = SPIFFS.open("/config", FILE_WRITE);
  if (configFile >= 0) {
    configFile.write((uint8_t*)&config, sizeof(config_t));
    configFile.flush();
    configFile.close();
  }
}

void config_save_sync() {
  File configFile = SPIFFS.open("/config", FILE_WRITE);
  if (configFile) {
    configFile.write((uint8_t*)&config, sizeof(config_t));
    configFile.flush();
    configFile.close();
  }
}

