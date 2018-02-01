#!/bin/bash

set -e -x

apt-get update
apt-get install -y cmake make gcc g++

cd ${1:-.}

cmake .
make
make test
