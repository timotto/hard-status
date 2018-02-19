#!/bin/sh

set -e -x

/Slic3r/slic3r-dist/slic3r \
    --layer-height $LAYER_HEIGHT \
    stl-output/${NAME}.stl \
    --output \
    gcode-output/${NAME}.gcode
