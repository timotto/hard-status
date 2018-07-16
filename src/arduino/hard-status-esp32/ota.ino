/**
 * There are different OTAs:
 * - ArduinoOTA.h is for push flash via esptool or Arduino IDE
 * - Update.h is for custom implementation with download via HTTPS
 * 
 * The ArduinoOTA related code is running on the "sync" loop(). The 
 * HTTPS download is running on the second core during download, but 
 * the actual flashing is happening on the main loop().
 * 
 * The pull update via HTTPs is sending the "If-Modified-Since" HTTP
 * header. The web server containing the update has to understand this 
 * header (as almost all seem to) and should answer with a non-200 
 * status code in the response.
 */
#include "common.h"
#include <ArduinoOTA.h>
#include <Update.h>
#define bufferLength 1024

char ota_host[128];
int ota_port;
bool ota_https;
char ota_request[512];
char ota_last_modified[64];
int otaContentLength = 0;

// Utility to extract header value from headers
String getHeaderValue(String header, String headerName);

uint32_t otaPushNextPrint = 0;

void setup_ota() {
  DEBUG("OTA: setup: started");
  setup_ota_push();
  setup_ota_lastModified();
  setup_ota_request();
  DEBUG("OTA: setup: complete");
}

void setup_ota_push() {
  ArduinoOTA
    .onStart([]() {
      otaState = OTA_STATE_PUSH;
      led_show_ota();
      String type;
      if (ArduinoOTA.getCommand() == U_FLASH)
        type = "sketch";
      else // U_SPIFFS
        type = "filesystem";

      // NOTE: if updating SPIFFS this would be the place to unmount SPIFFS using SPIFFS.end()
      Serial.println("OTA: push: start: " + type);
    })
    .onEnd([]() {
      Serial.println("OTA: push: end");
    })
    .onProgress([](unsigned int progress, unsigned int total) {
      if (millis() < otaPushNextPrint) return;
      otaPushNextPrint = millis() + 100;
      Serial.printf("OTA: push: progress: %u%%\n", (progress / (total / 100)));
      led_show_progress(black, blue, progress, total);
    })
    .onError([](ota_error_t error) {
      Serial.printf("OTA: push: error[%u]: ", error);
      if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
      else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
      else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
      else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
      else if (error == OTA_END_ERROR) Serial.println("End Failed");
      otaState = OTA_STATE_IDLE;
    });
  ArduinoOTA.begin();
}

void setup_ota_lastModified() {
  strncpy(ota_last_modified, "", sizeof(ota_last_modified));
  File firmwareDateFile = SPIFFS.open("/firmware.date", FILE_READ);
  if (!firmwareDateFile) {
    DEBUG("OTA: setup: pull: cannot open /firmware.date");
    return;
  }
  
  char tmp[bufferLength];
  int len = firmwareDateFile.read((uint8_t*)tmp, bufferLength - 1);
  tmp[len++] = 0;

  if (strlen(tmp) == 0) return;
  
  sprintf(ota_last_modified, "If-Modified-Since: %s\n", tmp);
  firmwareDateFile.close();
  DEBUGf("OTA: setup: pull: have firmware date: [%s] (%d)\n", tmp, strlen(tmp));
}

void setup_ota_request() {
  struct url_parser_url_t parsed;
  struct wifi_client_url_t converted;
  parse_url(config.otaUrl, &parsed);
  int error = url_convert(&parsed, &converted);
  if(error != 0) {
    DEBUGf("OTA: setup: url parse failed [%d]\n", error);
    free_parsed_url(&parsed);
    return;
  }

  const bool auth = strlen(config.otaAuth)>0;
  strncpy(ota_host, converted.host, sizeof(ota_host));
  ota_port = converted.port;
  ota_https = converted.https;
  snprintf(ota_request, sizeof(ota_request), 
    "GET %s%s%s HTTP/1.0\r\n"
    "Host: %s\r\n"
    "User-Agent: HardStatus\r\n"
    "X-Chip-Id: %s\r\n"
    "Connection: close\r\n"
    // Authentication
    "%s%s%s"
    // If-Modified-Since
    "%s"
    "\r\n", 
    converted.path == NULL ? "/" : converted.path, 
    converted.query_string == NULL ? "" : "?", 
    converted.query_string == NULL ? "" : converted.query_string, 
    converted.host, 
    apiId, 
    auth ? "Authorization: Basic " : "", 
    auth ? config.otaAuth : "", 
    auth ? "\r\n" : "",
    ota_last_modified);
}

void loop_ota_sync() {
  ArduinoOTA.handle();
  switch(otaState) {
    case OTA_STATE_FLASH:
      break;
    default:
      return;
  }
  led_show_ota();

  DEBUG("OTA: sync update started");
  listDir(SPIFFS, "/", 0);
  File file = SPIFFS.open("/ota.bin", FILE_READ);
  if (!file) {
    DEBUG("ota failed: unable to read ota.date file for update");
  }
  bool canBegin = Update.begin(otaContentLength);
  if (canBegin) {
    uint8_t buffer[512];
    int pos;
    int wrx;
    int written = 0;
    int total = file.size();
    while(total > written) {
      pos = file.read(buffer, 512);
      wrx = Update.write(buffer, pos);
      written += wrx;

      if (millis() >= otaPushNextPrint) {;
        otaPushNextPrint = millis() + 100;
        Serial.printf("OTA: sync: progress: %u%%\n", (written / (total / 100)));
        led_show_progress(black, green, total + written, total + total);
      }

      if (pos != wrx) {
        Serial.printf("OTA: Failed to write all bytes, had %d but wrote only %d\n", pos, wrx);
        return;
      }
    }
    if (written == otaContentLength) {
      Serial.println("Written : " + String(written) + " successfully");
      if (Update.end()) {
        Serial.println("OTA done!");
        if (Update.isFinished()) {
          Serial.println("Update successfully completed. Rebooting.");
          SPIFFS.remove("/firmware.date");
          SPIFFS.rename("/ota.date", "/firmware.date");
          SPIFFS.remove("/ota.bin");
          led_show_ota();
          otaState = OTA_STATE_REBOOT;
          return;
        } else Serial.println("Update not finished? Something went wrong!");
      } else Serial.println("Error Occurred. Error #: " + String(Update.getError()));
    } else Serial.println("Written only : " + String(written) + "/" + String(otaContentLength) + ". Retry?" );
  }
  otaState = OTA_STATE_ERROR;
}

void loop_ota_reboot() {
  if (otaState == OTA_STATE_REBOOT)
    ESP.restart();
}

void loop_ota_async() {
  switch(wifiState) {
    case WL_CONNECTED:
      break;
    default:
      return;
  }
  
  switch(otaState) {
    case OTA_STATE_IDLE:
    case OTA_STATE_LOAD:
      break;
    case OTA_STATE_ERROR:
      otaState = OTA_STATE_IDLE;
      break;
    default:
      return;
  }
  
  static uint32_t nextOtaCall = 0;
  const uint32_t now = millis();
  if (now < nextOtaCall) return;
  nextOtaCall = now + (1000 * config.otaCheckDelay);
  
  WiFiClientSecure client;

  DEBUG("OTA: pull: connecting");
  if (!client.connect(ota_host, ota_port)) {
    DEBUG("OTA: pull: error: HTTPS connect failed");
    otaState = OTA_STATE_ERROR;
    return;
  }
  nextOtaCall = millis() + (1000 * config.otaCheckDelay);

  client.print(ota_request);
  bool isValidContentType = false;
  String lastModified = "";
  while (client.connected()) {
    String line = client.readStringUntil('\n');
    DEBUGf("OTA: pull: download header [%s]\n", line.c_str());
    if (line == "\r") break;
    if (line.startsWith("HTTP/1.")) {
      if (line.indexOf("200") < 0) {
        DEBUG("OTA: pull: go non 200 status code, exiting OTA update");
        return;
      }
    }
    if (line.startsWith("Content-Length: ")) {
      otaContentLength = atoi((getHeaderValue(line, "Content-Length: ")).c_str());
      Serial.println("OTA: pull: download size is [" + String(otaContentLength) + "] bytes");
    }
    // Next, the content type
    if (line.startsWith("Content-Type: ")) {
      String contentType = getHeaderValue(line, "Content-Type: ");
      Serial.println("OTA: pull: download content type is [" + contentType + "]");
      if (contentType == "application/octet-stream") {
        isValidContentType = true;
      }
    }
    if (line.startsWith("Last-Modified: ")) {
      lastModified = getHeaderValue(line, "Last-Modified: ");
      Serial.println("OTA: pull: download last modified is [" + lastModified + "]");
    }
  }
  uint8_t buffer[bufferLength];
  int bufferPos = 0;
  File otaDataFile = SPIFFS.open("/ota.bin", FILE_WRITE);
  if (!otaDataFile) {
    DEBUG("OTA: pull: error: failed to create /ota.bin file");
    otaState = OTA_STATE_ERROR;
    return;
  }
  otaState = OTA_STATE_LOAD;
  led_show_ota();
  uint32_t total = 0;
  uint32_t nextTime = 0;
  uint16_t wok = 0;
  uint16_t wfail = 0;
  uint32_t tstart = millis();
  while(client.connected()) {
    bufferPos = client.read(buffer, bufferLength);
    if (bufferPos > 0) {
      total += bufferPos;
      if (nextTime <= millis()) {
        Serial.printf("OTA: pull: download progress: %d bytes\n", total);
        nextTime = millis() + 1000;
      }
      if (millis() >= otaPushNextPrint) {;
        otaPushNextPrint = millis() + 100;
        Serial.printf("OTA: sync: download: %u%%\n", (total / (otaContentLength / 100)));
        led_show_progress(black, green, total, otaContentLength + otaContentLength);
      }
      if(0 > otaDataFile.write(buffer, bufferPos)) {
        wfail++;
      } else wok++;
    }
  }
  Serial.printf("OTA: pull: download result: %d bytes (%.2fkB/s), writes: %d OK, %d failed\n", 
    total, (total * 1.024) / (millis() - tstart), wok, wfail);
  otaDataFile.flush();
  otaDataFile.close();
  if (wfail > 0) {
    DEBUG("OTA: pull: error: download incomplete");
    otaState = OTA_STATE_ERROR;
    return;
  }

  File otaDateFile = SPIFFS.open("/ota.date", FILE_WRITE);
  if (!otaDateFile) {
    DEBUG("OTA: pull: error: failed to create /ota.date file");
    otaState = OTA_STATE_ERROR;
    return;
  }
  otaDateFile.write((uint8_t*)(lastModified.c_str()), lastModified.length()+1);
  otaDateFile.flush();
  otaDateFile.close();

  // TODO load signature & verify
  DEBUG("OTA: pull: download complete");
  otaState = OTA_STATE_FLASH;
  led_show_ota();
  delay(1000);
  nextOtaCall = millis() + (1000 * config.otaCheckDelay);
}

String getHeaderValue(String header, String headerName) {
  return header.substring(strlen(headerName.c_str()));
}

