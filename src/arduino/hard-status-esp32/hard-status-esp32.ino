/**
 * This is the ESP32 firmware of the Hard Status monitor.
 * 
 * This Arduino sketch attempts a smooth LED animation by distributing the work to both LX6 
 * CPU cores usually available on an ESP32 module. Using the second core requires some more 
 * knowledge about the hardware and the FreeRTOS implementation used in the ESP32-Arduino
 * layer. Some things don't work on the second core like running the webserver or accessing
 * the SPIFFS which is why there is an unfortunate amount of workaround code.
 * 
 * SoftAP / WiFi hotspot is super buggy, AP takes ages to appear and connections fail often.
 * DNS doesn't seem to work at all. Might be related to second core use.
 * 
 * SPIFFS seems to have problems when run on the second core, that's why there is "async_fs".
 * 
 * On ESP32 the NeoPixelBus library version must be > 2.2.9. Currently git master is required.
 * Otherwise the LEDs will show lots of random colors. I don't know if this is caused by
 * un-maskable interrupts or slightly off bit timing for the WS2812/13 LED controllers.
 * 
 * Stuff running on the second core is called "async". There's a setup_async() and a 
 * loop_async() function that run on the second core.
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
  
  setup_async_fs();
  setup_config();
  setup_api();
  setup_led();
  setup_wifi();
  setup_ota_sync();
  setup_webserver();
  
  // https://techtutorialsx.com/2017/05/09/esp32-running-code-on-a-specific-core/
  xTaskCreatePinnedToCore(
                    second_core_task, /* Function to implement the task */
                    "async",    /* Name of the task */
                    16384,      /* Stack size in words */
                    NULL,       /* Task input parameter */
                    0,          /* Priority of the task */
                    NULL,       /* Task handle. */
                    1);         /* Core where the task should run */


  DEBUG("setup(sync) complete");
}

void setup_async() {
  DEBUG("setup(async) started");
  setup_ota_async();
  setup_async_fs_async();
  DEBUG("setup(async) complete");
}

void loop() {
  loop_wifi();
  loop_ota_async();
  loop_api();

  // When OTA from Arduino IDE is active, there's another inner loop that keeps calling loop_led()
  loop_ota_sync();

  // accepting TCP connections doesn't work reliably on the second core
  loop_webserver();

  // SPIFFS access doesn't work on the second core.
  loop_async_fs();

  // delay is important so the other FreeRTOS tasks have time to run, like the WiFi stack.
  delay(1);
}

/**
 * (almose) all blocking IO related tasks
 */
void loop_async() {
  // The main purpose of this loop()
  loop_led();
}

