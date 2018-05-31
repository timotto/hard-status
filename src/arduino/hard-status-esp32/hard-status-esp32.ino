/**
 * This is the ESP32 firmware of the Hard Status monitor.
 * 
 * This Arduino sketch attempts a smooth LED animation by distributing the work to both LX6 
 * CPU cores usually available on an ESP32 module.
 * 
 * SoftAP / WiFi hotspot is super buggy, AP takes ages to appear and connections fail often.
 * DNS doesn't seem to work at all. Might be related to second core use.
 * 
 * Needs FastLED master branch or > 3.1.8
 **/

#include "common.h"

config_t config;

char apiId[32];
uint8_t otaState = OTA_STATE_IDLE;
uint8_t wifiState = WL_NO_SHIELD;

void second_core_task( void * pvParameters) {
  setup_async();
  while(true) loop_async();
}

void setup() {
  Serial.begin(115200);
  DEBUG("setup(sync) started");
  
  setup_fs();
  setup_config();
  setup_api();
  setup_wifi();
  setup_ota_sync();
  setup_ota_async();
  setup_webserver();
  
  // https://techtutorialsx.com/2017/05/09/esp32-running-code-on-a-specific-core/
  xTaskCreatePinnedToCore(
                    second_core_task, /* Function to implement the task */
                    "async",    /* Name of the task */
                    16384,      /* Stack size in words */
                    NULL,       /* Task input parameter */
                    2,          /* Priority of the task */
                    NULL,       /* Task handle. */
                    1);         /* Core where the task should run */


  DEBUG("setup(sync) complete");
}

void setup_async() {
  setup_led();
}

void loop() {
  loop_wifi();
  loop_ota_async();
  loop_api();
  loop_ota_sync();
  loop_webserver();

  // delay is important so the other FreeRTOS tasks have time to run, like the WiFi stack.
  delay(1);
}

void loop_async() {
  loop_led();
  loop_ota_reboot();

  delay(1);
}

