#!/bin/bash

set -e -x

arduino --verbose --verify \
  --board espressif:esp32:lolin32 --pref build.flash_freq=80m \
  /root/Arduino/hardware/espressif/esp32/libraries/ESP32/examples/ChipID/GetChipID/GetChipID.ino

arduino --install-library "NeoPixelBus by Makuna"
