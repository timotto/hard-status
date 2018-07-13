#include <Readline.h>
#include "common.h"

const char delim[] = " ";
ReadLine r;

void setup_console() {
  Serial.println("Command prompt enabled, use \"help\" for a list of commands.\n>");
}

void loop_console() {
  char *line = r.feed(&Serial);
  if (line == NULL) return;
  
  char copy[READLINE_MAX];
  strncpy(copy, line, sizeof(copy) - 1);
  Serial.println(copy);
  
  char *ptr = strtok(copy, delim);
  if (ptr == NULL) {
    console_err();
    return;
  }

  if (strcmp("help", ptr) == 0) {
    console_help();
    return;
  }

  if (strcmp("list", ptr) == 0) {
    console_list();
    return;
  }

  if (strcmp("get", ptr) == 0) {
    console_get();
    return;
  }

  if (strcmp("set", ptr) == 0) {
    console_set();
    return;
  }

  console_err();
}

void console_set() {
  char *ptr = strtok(NULL, delim);
  if (ptr == NULL) {
    console_err();
    return;
  }
  char *valPtr = strtok(NULL, delim);
  if (valPtr == NULL) {
    console_err();
    return;
  }
  if (strcmp("brightness", ptr) == 0) console_set_brightness(valPtr);
  else if (strcmp("pulse", ptr) == 0) console_set_pulse(valPtr);
  else if (strcmp("api", ptr) == 0) console_set_api(valPtr);
  else if (strcmp("otaurl", ptr) == 0) console_set_otaurl(valPtr);
  else if (strcmp("otaauth", ptr) == 0) console_set_otaauth(valPtr);
  else {
    console_err();
    return;
  }

  config_load_defaults();
  config_save_sync();
  led_update_brightness();
  led_reset_pulseFrequency();
  setup_api_request();
  setup_ota_request();

  console_prompt();
}

void console_get() {
  char *ptr = strtok(NULL, delim);
  if (ptr == NULL) {
    console_err();
    return;
  }
  if (strcmp("brightness", ptr) == 0) console_get_brightness();
  else if (strcmp("pulse", ptr) == 0) console_get_pulse();
  else if (strcmp("api", ptr) == 0) console_get_api();
  else if (strcmp("otaurl", ptr) == 0) console_get_otaurl();
  else if (strcmp("otaauth", ptr) == 0) console_get_otaauth();
  else {
    console_err();
    return;
  }
  console_prompt();
}

void console_set_brightness(char *val) {
  int32_t brightness = atoi(val);
  if (brightness > 0 && brightness < 256) config.brightness = brightness;
  console_get_brightness();
}

void console_get_brightness() {
  Serial.print("\tbrightness\t : ");
  Serial.println(config.brightness);
}

void console_set_pulse(char *val) {
  int32_t pulse = atoi(val);
  if (pulse >= 10 && pulse <= 10000) config.pulseFrequency = pulse;
  console_get_pulse();
}

void console_get_pulse() {
  Serial.print("\tpulse\t\t : ");
  Serial.println(config.pulseFrequency);
}

void console_set_api(char *val) {
  strncpy(config.apiUrl, val, sizeof(config.apiUrl));
  console_get_api();
}

void console_get_api() {
  Serial.print("\tapi\t\t : ");
  Serial.println(config.apiUrl);
}

void console_set_otaurl(char *val) {
  strncpy(config.otaUrl, val, sizeof(config.otaUrl));
  console_get_otaurl();
}

void console_get_otaurl() {
  Serial.print("\totaurl\t\t : ");
  Serial.println(config.otaUrl);
}

void console_set_otaauth(char *val) {
  strncpy(config.otaAuth, val, sizeof(config.otaAuth));
  console_get_otaauth();
}

void console_get_otaauth() {
  Serial.print("\totaauth\t\t : ");
  if (strlen(config.otaAuth) == 0) Serial.println("<not set>");
  else Serial.println("**********");
}

void console_list() {
  console_get_brightness();
  console_get_pulse();
  console_get_api();
  console_get_otaurl();
  console_get_otaauth();
  
  console_prompt();
}

void console_help() {
  Serial.println("help                  this help\n"
                 "list                  show all parameters and values\n"
                 "get <param>           show value of <param>\n"
                 "set <param> <value>   set value of <param> to <value>\n");
  console_prompt();
}

void console_prompt() {
  Serial.print(">");
}

void console_err() {
  Serial.println("invalid command\n");
  console_prompt();
}


