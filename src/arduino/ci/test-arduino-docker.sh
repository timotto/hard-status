#!/bin/bash

set -e -x

arduino --verify --verbose /arduino-*/examples/01.Basics/BareMinimum/BareMinimum.ino
arduino --install-library "NeoPixelBus by Makuna"
