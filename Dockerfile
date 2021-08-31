FROM node:14.4.0-stretch

RUN mkdir /app
WORKDIR /app
COPY ./public /app/public
COPY ./views /app/views
COPY ./app.js /app
COPY ./router.js /app
COPY ./router.api.js /app
COPY ./package.json /app
COPY ./services /app/services
COPY ./utils /app/utils
COPY ./interceptors /app/interceptors
COPY ./stage.env /app
RUN npm install

ENV NODE_ENV=stage

CMD ["node", "app.js"]