FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
# try
ENV PORT=3000
ENV AWS_REGION=ap-southeast-1

EXPOSE 3000

CMD ["node", "server.js"]