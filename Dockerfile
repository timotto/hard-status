FROM node:9-alpine AS build

ADD . /build

WORKDIR /build

RUN yarn install && \
    yarn run test && \
    yarn run tsc && \
    rm -rf node_modules/ && \
    yarn install --production=true

FROM node:9-alpine AS runtime

COPY --from=build /build /app

WORKDIR /app

ENV PORT 3001

CMD node dist