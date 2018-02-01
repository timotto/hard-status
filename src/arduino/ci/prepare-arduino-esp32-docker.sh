#!/bin/sh

set -e -x

cp -rv arduino-esp32-docker-source/src/arduino/ci/arduino-esp32-docker/* build/
cp -r arduino-esp32-source build/

# This 'pointless' grep makes sure the expected line exists in the Dockerfile
# If it didn't exist, the sed line would do nothing causing the result to be unexpected
grep '^FROM .* AS base$' build/Dockerfile
sed -es'/^FROM .* AS base$/FROM '"$FROM"' AS base/' -i build/Dockerfile
