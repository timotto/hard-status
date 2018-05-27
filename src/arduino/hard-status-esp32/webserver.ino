/**
 * The Web Server sketch file contains the code to serve the index.html from a
 * char array and to server the built-in configuration API allowing adjustments
 * of many run time parameters.
 * 
 * The API uses the great ArduinoJson library. Simple form based communication might
 * require way less code.
 */
#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <ArduinoJson.h>
#include "html.h"
#include "common.h"

#define WEB_AUTH if (!webserver_auth()) return

void handleRoot();
void handleNotFound();

WebServer server ( 80 );

void setup_webserver() {
  // MDNS.begin happens in ArduinoOTA
  MDNS.addService("http", "tcp", 80);
  server.on ( "/", [](){
    WEB_AUTH;
    server.send ( 200, "text/html", indexhtml );
  } );
  server.on ( "/status", HTTP_GET, webserver_handle_status );
  server.on ("/save1", HTTP_POST, webserver_handle_save );
  server.onNotFound ( webserver_handle_not_found );
  server.begin();
}

void loop_webserver() {
  server.handleClient();
}

bool webserver_auth() {
  if( strlen(config.webserver.login) > 0 
      && strlen(config.webserver.password) > 0
      && !server.authenticate(config.webserver.login, config.webserver.password)
    ) {
    server.requestAuthentication();
    return false;
  }
  return true;
}

void nestObject(JsonObject& root, char* key, char* login, char* password) {
  JsonObject& cred = root.createNestedObject(key);
  cred["login"] = login;
  cred["password"] = "unchanged";
}

void webserver_handle_status() {
  WEB_AUTH;
  StaticJsonBuffer<1024> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  
  root["name"] = config.name;
  
  char brightnessString[16];
  snprintf(brightnessString, sizeof(brightnessString), "%d", config.brightness);
  root["brightness"] = brightnessString;
  
  nestObject(root, "hotspot", config.hotspot.login, config.hotspot.password);
  
  nestObject(root, "webserver", config.webserver.login, config.webserver.password);
  
  JsonArray& wifi = root.createNestedArray("wifi");
  for(int i=0; i<MAX_USER_WIFI; i++) {
    JsonObject& cred = jsonBuffer.createObject();
    cred["login"] = config.wifi[i].login;
    cred["password"] = "unchanged";
    wifi.add(cred);
  }

  root["api"] = config.apiUrl;
  root["ota"] = config.otaUrl;
  root["otaauth"] = config.otaAuth;

  char apiDelayStr[16];
  snprintf(apiDelayStr, sizeof(apiDelayStr), "%d", config.apiCheckDelay);
  root["apidelay"] = apiDelayStr;
  
  char otaDelayStr[16];
  snprintf(otaDelayStr, sizeof(otaDelayStr), "%d", config.otaCheckDelay);
  root["otadelay"] = otaDelayStr;
  
  String json;
  root.printTo(json);
  server.send ( 200, "application/json", json );
}

void webserver_handle_save() {
  DEBUG("WebServer: save: started");
  WEB_AUTH;

  bool needReboot = false;
  DynamicJsonBuffer jsonBuffer(1024);
  JsonObject& root = jsonBuffer.parse(server.arg("plain"));
  
  if (root.containsKey("name")) {
    needReboot = strcmp(config.name, root["name"].as<char*>()) != 0;
    strncpy(config.name, root["name"].as<char*>(), sizeof(config.name));
  }
  
  if (root.containsKey("brightness")) {
    int brightness = atoi(root["brightness"]);
    if (brightness > 0 && brightness < 256) config.brightness = brightness;
  }

  int updatedWifis = 0;
  if (root.containsKey("wifi")) {
    JsonArray& wifi = root["wifi"];
    int i=0;
    for (JsonObject& value : wifi) {
      if (updatedWifis >=MAX_USER_WIFI) break;
      if(saveCred(&(config.wifi[i++]), value)) {
        updatedWifis++;
      }
    }
  }
  needReboot = needReboot || updatedWifis > 0;

  saveCred(&(config.webserver), root["webserver"]);
  if(saveCred(&(config.hotspot), root["hotspot"]) && wifiState != WL_CONNECTED) {
    needReboot = true;
  }

  if (root.containsKey("api") && url_verify(root["api"].as<char*>())) {
    DEBUGf("strncpy(config.apiUrl, JSON, %d): [%s]\n", sizeof(config.apiUrl), config.apiUrl);
    strncpy(config.apiUrl, root["api"].as<char*>(), sizeof(config.apiUrl));
  }
//  if (root.containsKey("api") && url_verify(root["api"].as<char*>())) strncpy(config.apiUrl, root["api"].as<char*>(), sizeof(config.apiUrl));
  if (root.containsKey("ota") && url_verify(root["ota"].as<char*>())) strncpy(config.otaUrl, root["ota"].as<char*>(), sizeof(config.otaUrl));
  if (root.containsKey("otaauth")) strncpy(config.otaAuth, root["otaauth"].as<char*>(), sizeof(config.otaAuth));

  if (root.containsKey("apidelay")) {
    int32_t n = atoi(root["apidelay"]);
    if (n > 0 && n < 65536) config.apiCheckDelay = n;
  }
  
  if (root.containsKey("otadelay")) {
    int32_t n = atoi(root["otadelay"]);
    if (n > 0 && n < 65536) config.otaCheckDelay = n;
  }

  config_load_defaults();
  config_save_sync();
  led_update_brightness();
  setup_api_request();
  setup_ota_request();

  webserver_handle_status();

  if (needReboot) {
    DEBUG("WebServer: save: reboot required");
    loop_webserver();
    delay(1000);
    ESP.restart();
  }
}

bool saveCred(struct config_credential_t* cred, JsonObject& root) {
  if (!root.containsKey("login")) return false;
  if (!root.containsKey("password")) return false;

  const char* login = root["login"];
  if (strlen(login) < 1) {
    const bool changed = strcmp(cred->login, "") != 0 || strcmp(cred->password, "");
    strncpy(cred->login, "", sizeof(cred->login));
    strncpy(cred->password, "", sizeof(cred->password));
    return changed;
  }

  bool changed = strcmp(cred->login, login) != 0;
  strncpy(cred->login, login, sizeof(cred->login));

  const char* password  = root["password"];
  if (strcmp(password, "unchanged") == 0) return changed;

  changed = strcmp(cred->password, password) != 0;
  strncpy(cred->password, password, sizeof(cred->password));

  return changed;
}

void webserver_handle_not_found() {
  String message = "File Not Found\n\n";
  message += "URI: ";
  message += server.uri();
  message += "\nMethod: ";
  message += ( server.method() == HTTP_GET ) ? "GET" : "POST";
  message += "\nArguments: ";
  message += server.args();
  message += "\n";

  for ( uint8_t i = 0; i < server.args(); i++ ) {
    message += " " + server.argName ( i ) + ": " + server.arg ( i ) + "\n";
  }

  server.send ( 404, "text/plain", message );
}


