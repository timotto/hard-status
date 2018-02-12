#!/bin/sh

set -e -x

SRC="${1:-.}"
DST="${2:-.}"

cat > "${DST}/hardware.h" << EOT
/**
 * This is a separate file with all typical Arduino hardware related parameters.
 */
#ifndef _HS_HARDWARE_H
#define _HS_HARDWARE_H

#define LED_PIXEL_COUNT     $LED_COUNT
#define LED_PIN             $LED_PIN

#endif

EOT

cat "${DST}/hardware.h"
