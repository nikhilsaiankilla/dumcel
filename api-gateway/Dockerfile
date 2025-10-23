# Use official Node.js image (based on Debian/Ubuntu)
FROM node:22-bullseye

# Set working directory
WORKDIR /home/app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm install --production=false

# Copy the rest of the source code
COPY . .

# Build the TypeScript project
RUN npm run build

# Start the application
CMD ["npm", "run", "start"]