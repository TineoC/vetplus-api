FROM node:20.5-alpine3.18

WORKDIR /usr/src/app

COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]

RUN npm install --production --silent && mv node_modules ../

COPY . .

RUN npm run build

EXPOSE 3000

RUN chown -R root /usr/src/app

USER root

ENV NODE_ENV=production

ENV SNYK_TOKEN=dd14f5f1-a363-4efa-826e-89d1abbea686

CMD ["npm", "run", "start:prod"]
