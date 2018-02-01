FROM debian:latest AS base

ARG version

RUN [ -n "$version" ]

RUN apt-get update && \
    apt-get install -y git make gcc ant openjdk-8-jdk xz-utils unzip bzip2

FROM base AS build

ARG version

ADD arduino-release /arduino-release
# TODO sha512 check
RUN xzcat arduino-release/Arduino-${version}.tar.xz | tar x && \
    cd Arduino-${version}/build && \
    ant && \
    ant test && \
    echo "$version" | ant dist && \
    xzcat linux/arduino-${version}-linux64.tar.xz|tar xC /
    
FROM base AS runtime

ARG version

COPY --from=build /arduino-${version} /arduino-${version}

RUN ln -s /arduino-${version}/arduino /usr/local/bin/arduino
