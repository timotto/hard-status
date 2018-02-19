#!/bin/sh

set -e -x

# workaround to silence this error message
# ERROR: boost::filesystem::canonical: No such file or directory: "/root/.local/share"

mkdir -p $HOME/.local/share

openscad \
    -o stl-output/${NAME}.stl \
    --render \
    3d-source/src/3d/openscad/${NAME}.scad
