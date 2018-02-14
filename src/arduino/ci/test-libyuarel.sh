#!/bin/bash

set -e -x

apt-get update
apt-get install -y make gcc

cd ${1:-.}

make
make check
