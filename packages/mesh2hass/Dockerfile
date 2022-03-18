FROM node:lts-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY *.js .
COPY devices ./devices/
CMD ["node", "index.js"]
