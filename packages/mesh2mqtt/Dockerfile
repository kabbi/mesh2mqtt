FROM node:lts-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN apk add --no-cache --virtual .gyp python3 make g++ \
    && npm install --no-optional \
    && apk del .gyp

COPY *.js .
COPY models ./models/
CMD ["node", "index.js"]
