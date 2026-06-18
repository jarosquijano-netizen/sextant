FROM node:20-alpine

WORKDIR /app

# Copy only backend deps first for layer caching
COPY backend/package*.json ./backend/

RUN cd backend && npm install --production

# Copy the rest of the backend source
COPY backend/ ./backend/

EXPOSE 3000

CMD ["node", "backend/server.js"]
