#!/bin/bash

set -e -x

SRC="${1:-.}"
HTML="${2:-.}"
DEFAULTS="${3:-.}"
HARDWARE="${4:-.}"
DST="${5:-.}"

mkdir -p $HOME/Arduino/libraries/

git clone neopixelbus-library-source $HOME/Arduino/libraries/NeoPixelBus
git clone webserver-library-source $HOME/Arduino/libraries/WebServer_tng
git clone arduinojson-library-source $HOME/Arduino/libraries/ArduinoJson
git clone libyuarel-library-source $HOME/Arduino/libraries/yuarel
git clone fastled-library-source $HOME/Arduino/libraries/FastLED

cp -v "$HTML"/html.h "$SRC"/src/arduino/hard-status-esp32/html.h
cp -v "$DEFAULTS"/defaults.h "$SRC"/src/arduino/hard-status-esp32/defaults.h
cp -v "$HARDWARE"/hardware.h "$SRC"/src/arduino/hard-status-esp32/hardware.h

cd "$SRC"

echo "Patching Arduino-ESP32 to run WiFi on Core#0 instead of Core#1"
sed \
  -i /root/Arduino/hardware/espressif/esp32/libraries/WiFi/src/WiFiGeneric.cpp \
  -e's/define ARDUINO_RUNNING_CORE 1/define ARDUINO_RUNNING_CORE 0/'

arduino --verbose --verify --preserve-temp-files \
  --board espressif:esp32:lolin32 --pref build.flash_freq=80m \
  src/arduino/hard-status-esp32/hard-status-esp32.ino

cd -

cp -v /tmp/arduino_build_*/hard-status-esp32.ino.bin "$DST"/hard-status-esp32-lolin32.bin
