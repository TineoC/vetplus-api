FROM node:iron-alpine3.18

WORKDIR /usr/src/app

COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]

RUN npm install --production --silent && mv node_modules ../

COPY . .

RUN npm run build

EXPOSE 3000

RUN chown -R node /usr/src/app

USER node

ENV NODE_ENV=production

CMD ["npm", "run", "start:prod"]
