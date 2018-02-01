#!/bin/sh

set -e

npm install -g yarn
yarn
yarn run test
