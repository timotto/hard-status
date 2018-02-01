#!/bin/sh

set -e

echo "app version: $(cat version/number)"
echo "version: $(cat version/number)" >> source-code/src/main/helm/hard-status/values.yaml

helm init --client-only
helm package --destination chart --version "$version" source-code/src/main/helm/hard-status
