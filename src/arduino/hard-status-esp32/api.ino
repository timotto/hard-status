/**
 * The "API" sketch file handles the calls to the Hard Status backend.
 * The string received from the backend is transformed into pixel colors without
 * any checking, so error messages might cause funny colors.
 */
#include "common.h"
#include "hardware.h"
#include <WiFiClientSecure.h>

bool api_setup_ok = false;
char api_request[2048];
char api_host[512];
int api_port;
bool api_https;

void setup_api() {
  Serial.println("API: setup: started");
  setup_api_request();
  Serial.println("API: setup: complete");
}

void loop_api() {
  switch(wifiState) {
    case WL_CONNECTED:
      break;
    default:
      return;
  }
  if(otaState != OTA_STATE_IDLE) return;
  if (!api_setup_ok) return;
  
  static uint32_t nextApiCall = 0;
  const uint32_t now = millis();
  if (now < nextApiCall) return;
  nextApiCall = now + (1000 * config.apiCheckDelay);

  WiFiClientSecure client;
  if (!client.connect(api_host, api_port)) {
    DEBUG("API: https connect failed");
    return;
  }

  client.print(api_request);
  while (client.connected()) {
    String line = client.readStringUntil('\n');
    if (line == "\r") {
      break;
    }
  }
  String line = client.readStringUntil('\n');
  
  if(otaState != OTA_STATE_IDLE) return;

  int n = line.length();
  if (n <= 0 || n % 2 != 0) return;
  
  int offset = 0;
  while(offset < LED_PIXEL_COUNT) {
    for(int i=0;i<line.length();i+=2) {
      const int led = offset + (i / 2);
      if (led >= LED_PIXEL_COUNT) continue;
      led_set_color(
        led, 
        codeToColor(line.charAt(i)), 
        codeToColor(line.charAt(i+1)));
    }
    offset += n/2;
  }
  nextApiCall = millis() + (1000 * config.apiCheckDelay);
}

void setup_api_request() {
  api_setup_ok = false;
  const uint64_t chipid = ESP.getEfuseMac();
  sprintf(apiId, "%04X%08X", (uint16_t)(chipid>>32), (uint32_t)chipid);

  struct url_parser_url_t parsed;
  struct wifi_client_url_t converted;
  parse_url(config.apiUrl, &parsed);
  int error = url_convert(&parsed, &converted);
  if(error != 0) {
    DEBUGf("API: setup: url parse failed [%d]\n", error);
    free_parsed_url(&parsed);
    return;
  }
  strncpy(api_host, converted.host, sizeof(api_host));
  api_port = converted.port;
  api_https = converted.https;
  snprintf(api_request, sizeof(api_request), 
    "GET %s%s%s HTTP/1.0\r\n"
    "Host: %s\r\n"
    "User-Agent: HardStatus\r\n"
    "X-Chip-Id: %s\r\n"
    "Connection: close\r\n"
    "\r\n", 
    converted.path, 
    converted.query_string==NULL?"":"?", 
    converted.query_string==NULL?"":converted.query_string, 
    converted.host, apiId);
  DEBUGf("API: setup: request:\n---SNIP---\n%s---SNAP---\n", api_request);
  api_setup_ok = true;
}

