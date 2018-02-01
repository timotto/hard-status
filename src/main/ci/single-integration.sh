#!/bin/sh

set -e -x

apk update && apk add curl
export PORT=3002
node /app/dist &
pid=$!
sleep 2

export protocol=http
export hostname=localhost
export port=$PORT
export gracetime=1

attempt=1
while true; do
  result=1
  if source-code/src/main/ci/integration-test.sh; then
    result=0
  else
    if [ $attempt -lt 10 ]; then
      attempt=$(($attempt+1))
      sleep 3
      continue
    else
      result=1
    fi
  fi
  kill $pid
  exit $result
done
