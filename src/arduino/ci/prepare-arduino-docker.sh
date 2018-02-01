#!/bin/sh

set -e

cp -rv arduino-docker-source/src/arduino/ci/arduino-docker/* arduino-release-docker-source
cp -rv arduino-release arduino-release-docker-source
echo '{"version": "'$(cat arduino-release/version)'"}' > build-args/arduino-build-args.json
cat build-args/arduino-build-args.json
