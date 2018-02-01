FROM timotto/arduino AS base

ADD arduino-esp32-source /root/Arduino/hardware/espressif/esp32

RUN apt-get update && \
    apt-get install -y python-pip && \
    pip install pyserial && \
    cd /root/Arduino/hardware/espressif/esp32/tools && \
    python get.py

