#!/bin/sh

set -e -x

slicr3 \
    --layer-height $LAYER_HEIGHT \
    stl-output/${NAME}.stl \
    --output \
    gcode-output/${NAME}.gcode
