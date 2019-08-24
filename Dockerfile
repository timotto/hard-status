FROM node:8-alpine AS build

ADD . /build

WORKDIR /build

RUN npm install && \
    npm run test && \
    npm run tsc && \
    rm -rf node_modules/ && \
    npm install --production

FROM node:8-alpine AS runtime

COPY --from=build /build /app

WORKDIR /app

ENV PORT 3001

CMD node dist