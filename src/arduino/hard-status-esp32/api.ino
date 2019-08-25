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

static uint32_t nextApiCall = 0;

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
  
  const uint32_t now = millis();
  if (now < nextApiCall) return;
  nextApiCall = now + (1000 * config.apiCheckDelay);

  WiFiClientSecure client;
  DEBUG("API: connecting");
  if (!client.connect(api_host, api_port)) {
    DEBUG("API: https connect failed");
    return;
  }

  client.print(api_request);
  bool status200Ok = false;
  while (client.connected()) {
    String line = client.readStringUntil('\n');
    if (line.startsWith("HTTP/1") && line.endsWith(" 200 OK\r")) {
      status200Ok = true;
    }
      
    if (line == "\r") {
      break;
    }
  }
  String line = client.readStringUntil('\n');
  
  if(otaState != OTA_STATE_IDLE) {
    DEBUG("API: abort: OTA active");
    return;
  }
  if(!status200Ok) {
    DEBUG("API: abort: status not OK");
    return;
  }

  int n = line.length();
  if (n <= 0 || n % 2 != 0) {
    DEBUG("API: abort: odd response");
    return;
  }
  
  int offset = 0;
  int pixels = n /2;

  uint32_t good = 0;
  uint32_t bad = 0;
  uint32_t unknown = 0;
  uint32_t active = 0;
  offset = 0;
  while(offset < LED_PIXEL_COUNT && offset < pixels) {
    const char c0 = line.charAt(offset*2);
    const char c1 = line.charAt(offset*2+1);
    switch(c0) {
      case '+': good++; break;
      case '-': 
      case 'a': 
      case 'e': bad++; break;
      default: unknown++; break;
    }
    switch(c1) {
      case ' ': break;
      default: active++; break;
    }
    offset++;
  }
  uint32_t ratio = (good + bad) == 0 ? 5000 : 10000.0 * good / (good + bad);
  const bool ratioGood = ratio >= config.colorFlipRatio;

  // 10 is no change, 1 is faster, 100 is even slower
  const float f = (good + bad + unknown) == 0 ? 1.0 : 
      active == 0 ? 1.0 :
        1.0 / (10.0 * (float)active / (float)(good + bad + unknown) );
  dynamicPulseRatio = f < 0.1 ? 0.1 : f > 1.0 ? 1.0 : f;
  
  offset = 0;
  while(offset < LED_PIXEL_COUNT && offset < pixels) {
    const char c0 = line.charAt(offset*2);
    const char c1 = line.charAt(offset*2+1);
    led_set_color(
      offset, 
      codeToColor(c0), 
      codeToColor(c1));
    offset++;
  }
  while(offset < LED_PIXEL_COUNT) {
    led_set_idle(offset, ratioGood);
    offset++;
  }
  nextApiCall = millis() + (1000 * config.apiCheckDelay);

  DEBUG("API: done");
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

void api_trigger_request() {
  nextApiCall = 0;
}
