FROM node:9
COPY . .
RUN npm install
EXPOSE 80
