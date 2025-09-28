# Definition of the image for Service1
FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY app.js ./app.js

# non-root + writable vstorage dir
RUN adduser -D -u 10001 appuser && mkdir -p /app/vstorage && chown -R appuser /app
USER appuser

EXPOSE 8199
CMD ["node", "app.js"]