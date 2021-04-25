FROM node:lts-alpine

WORKDIR /usr/src/app

RUN apk add bluez-deprecated

COPY package*.json ./
RUN npm install

COPY *.js .
CMD ["node", "index.js"]
