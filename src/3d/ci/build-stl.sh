#!/bin/sh

set -e -x

openscad \
    -o stl-output/${NAME}.stl \
    --render \
    3d-source/src/3d/openscad/${NAME}.scad
