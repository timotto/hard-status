#!/bin/sh

set -e -x

SRC="${1:-.}"
DST="${2:-.}"

script="$SRC/src/arduino/hard-status-esp32/ui/convert.js"
html="$SRC/src/arduino/hard-status-esp32/ui/index.html"

cat > "${DST}/html.h" << EOT
#ifndef _HTML_H
#define _HTML_H

$(node "$script" "$html")

#endif
EOT

cat "${DST}/html.h"
