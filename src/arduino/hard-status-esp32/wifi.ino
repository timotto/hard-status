/**
 * The "WiFi" sketch file contains code to enable the hotspot when the device cannot connect to
 * a WiFi network.
 * 
 * The DNS server does not work, might be related to second core issues.
 */
#include <WiFi.h>
#include <WiFiMulti.h>
#include <WiFiClientSecure.h>
#include <DNSServer.h>
#include <ESPmDNS.h>
#include <WiFiUdp.h>
#include "common.h"

bool wifiHotspotEnabled = false;
uint32_t wifiHotspotLastPossible = 0;
uint32_t wifiHotspotLastUsed = 0;

IPAddress apIP(172, 31, 255, 254);
DNSServer dnsServer;
WiFiMulti wifiMulti;

void setup_wifi() {
  DEBUG("WiFi: setup: started");
  WiFi.mode(WIFI_STA);
  WiFi.enableIpV6();
  WiFi.begin();
  char tmp[128];
  snprintf(tmp, 128, "%s.local", config.name);
  WiFi.setHostname(tmp);
  DEBUGf("WiFi: setup: hostname %s\n", tmp);
  dnsServer.start(53, "*", apIP);
  
  for(int i=0; i<MAX_USER_WIFI; i++) {
    if (strlen(config.wifi[i].login) > 0) {
      if (strlen(config.wifi[i].password) > 0) {
        wifiMulti.addAP(config.wifi[i].login, config.wifi[i].password);
      } else {
        wifiMulti.addAP(config.wifi[i].login);
      }
    }
  }
  DEBUG("WiFi: setup: complete");
}

void loop_wifi() {
  dnsServer.processNextRequest();
  
  static uint32_t nextMultiWiFi  = 0;
  if (nextMultiWiFi > millis()) return;
  
  const uint8_t currentStatus =  wifiMulti.run();
  nextMultiWiFi = millis() + 5000;

  if (wifiState == currentStatus) {
    wifi_handle_same_state(wifiState);
    return;
  }

  wifi_handle_state_change(currentStatus);
  wifiState = currentStatus;
  led_show_wifi();
}

void wifi_handle_same_state(const uint8_t currentState) {
  switch(currentState) {
    case WL_CONNECTED:
      if (!wifiHotspotEnabled) break;
      if (millis() - wifiHotspotLastUsed < 10000) break;

      wifiHotspotEnabled = false;
      wifi_hotspot_disable();
      break;
      
    case WL_DISCONNECTED:
    case WL_IDLE_STATUS:
    case WL_NO_SSID_AVAIL:
      if (wifiHotspotEnabled) break;
      if (millis() - wifiHotspotLastPossible < 5000) break;

      wifiHotspotEnabled = true;
      wifi_hotspot_enable();
      break;
      
  }
}

void wifi_handle_state_change(const uint8_t newState) {
  switch(newState) {
    case WL_CONNECTED:
      DEBUG("WiFi: connected");
      wifiHotspotLastUsed = millis();
      api_trigger_request();
      break;
      
    case WL_DISCONNECTED:
    case WL_IDLE_STATUS:
    case WL_NO_SSID_AVAIL:
      DEBUG("WiFi: disconnected");
      wifiHotspotLastPossible = millis();
      break;
      
    default:
      DEBUGf("WiFi: unknown state: %d\n", newState);
      break;
  }
}

void wifi_hotspot_enable() {
  DEBUG("WiFi: hotspot: enable");
  WiFi.mode(WIFI_AP_STA);
  if (strlen(config.hotspot.password) >= 8) {
    WiFi.softAP(config.hotspot.login, config.hotspot.password);
  } else {
    WiFi.softAP(config.hotspot.login);
  }
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
}

void wifi_hotspot_disable() {
  DEBUG("WiFi: hotspot: disable");
  WiFi.mode(WIFI_STA);
}

