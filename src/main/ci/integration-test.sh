#!/bin/sh

set -e -x

gracetime=${gracetime:-30}

test_url="${protocol}://${hostname}:${port}"
echo "testin ${test_url} in $gracetime seconds"
sleep $gracetime

if curl --insecure --max-time 30 ${test_url}/healthz; then
    if curl --fail --max-time 30 ${test_url}/healthz; then
        true
    else
        echo 'insecure works, secure not - lets wait 60s for lets encrypt'
        sleep 60
    fi
else
    exit 1
fi

curl --fail --max-time 30 "${test_url}/concourse?url=${concourse}"
