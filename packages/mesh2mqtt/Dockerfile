FROM node:lts-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN apk add --no-cache --virtual .gyp python make g++ \
    && npm install --no-optional \
    && apk del .gyp

COPY *.js .
CMD ["node", "index.js"]
