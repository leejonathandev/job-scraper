FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

# Cache dependencies layer
COPY package*.json ./

# Install all dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy source files
COPY . .

# Build TypeScript files
RUN npm run build


# Set Node to production mode
ENV NODE_ENV=production

# Explicitly specify the start command to run the compiled JavaScript
CMD ["node", "./dist/app.js"]
