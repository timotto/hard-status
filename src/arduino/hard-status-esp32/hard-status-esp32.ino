/**
 * This is the ESP32 firmware of the Hard Status monitor.
 * 
 * This Arduino sketch attempts a smooth LED animation by distributing the work to both LX6 
 * CPU cores usually available on an ESP32 module.
 * 
 * Unfortunately a hack is required to run the LED update routine on a dedicated core because
 * both network code as well as the loop() routing run on core#1 while something else is running
 * on core#0. A small change in two files of the Arduino ESP32 SDK is required to make the network
 * code and the loop() routine run on core#0 so core#1 can be used by the LED routine exclusively.
 * 
 * The CI script for this Arduino sketch does it with sed:
 * 
   sed \
     -i $HOME/Arduino/hardware/espressif/esp32/libraries/WiFi/src/WiFiGeneric.cpp \
     -e's/define ARDUINO_RUNNING_CORE 1/define ARDUINO_RUNNING_CORE 0/'
   
   sed \
     -i $HOME/Arduino/hardware/espressif/esp32/cores/esp32/main.cpp \
     -e's/define ARDUINO_RUNNING_CORE 1/define ARDUINO_RUNNING_CORE 0/'
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

  setup_shuffle();
  setup_fs();
  setup_config();
  setup_api();
  setup_wifi();
  setup_ota();
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
  delay(1);
  loop_ota_reboot();

  // do not update LED while SPIFFS is active
  switch(otaState) {
    case OTA_STATE_PUSH:
    case OTA_STATE_LOAD:
    case OTA_STATE_FLASH:
      return;
  }

  static uint32_t next = 0;
  const uint32_t now = millis();
  if (next > now) return;
  next = now + 20;

  loop_led();
}

