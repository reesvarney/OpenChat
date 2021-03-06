FROM node:latest
WORKDIR /usr/src/openchat

COPY server/package*.json ./

COPY server/ .

RUN  apt-get update \
     && apt-get install -y wget gnupg ca-certificates \
     && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
     && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
     && apt-get update \
     && apt-get install -y libxss1 google-chrome-stable \
     && rm -rf /var/lib/apt/lists/*

RUN npm install

EXPOSE 443
CMD [ "node", "server.js" ]

