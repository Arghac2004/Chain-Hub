FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
