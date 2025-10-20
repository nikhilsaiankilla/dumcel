FROM ubuntu:focal

RUN apt-get update

RUN apt-get install -y curl

RUN curl -sL https://deb.nodesource.com/setup_22.x | bash -

RUN apt-get upgrade -y

RUN apt-get install -y nodejs

WORKDIR /home/app

COPY package*.json .

COPY . .

RUN npm install

EXPOSE 8001

CMD ["node", "index.js"]
