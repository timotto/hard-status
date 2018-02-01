#!/bin/bash

set -e -x

SRC="${1:-.}"
HTML="${2:-.}"
DEFAULTS="${3:-.}"
DST="${4:-.}"

mkdir -p $HOME/Arduino/libraries/

git clone --depth=1 neopixelbus-library-source $HOME/Arduino/libraries/NeoPixelBus
git clone --depth=1 webserver-library-source $HOME/Arduino/libraries/WebServer_tng
git clone --depth=1 arduinojson-library-source $HOME/Arduino/libraries/ArduinoJson

cp -v "$HTML"/html.h "$SRC"/src/arduino/hard-status-esp32/html.h
cp -v "$DEFAULTS"/defaults.h "$SRC"/src/arduino/hard-status-esp32/defaults.h

cd "$SRC"

arduino --verbose --verify --preserve-temp-files \
  --board espressif:esp32:lolin32 --pref build.flash_freq=80m \
  src/arduino/hard-status-esp32/hard-status-esp32.ino

cd -

cp -v /tmp/arduino_build_*/hard-status-esp32.ino.bin "$DST"/hard-status-esp32-lolin32.bin
