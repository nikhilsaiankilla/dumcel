FROM ubuntu:focal

# Install dependencies
RUN apt-get update && \
    apt-get install -y curl build-essential && \
    curl -sL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs

# Set working directory
WORKDIR /home/app

# Copy package.json and package-lock.json first (for caching)
COPY package*.json ./

# Install node modules
RUN npm install

# Copy the rest of the code
COPY . .

# Build TypeScript
RUN npm run build

# Expose the port
EXPOSE 8000

# Start the app
CMD ["npm", "run", "start"]
