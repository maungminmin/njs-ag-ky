FROM node:alpine3.20

WORKDIR /app

COPY package*.json ./
RUN apk update && apk upgrade && \
    apk add --no-cache openssl curl gcompat iproute2 coreutils bash && \
    npm install

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]