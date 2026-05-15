FROM node:20-slim

# Set working directory
WORKDIR /app

# Install dependencies
# We copy package.json first to leverage Docker cache
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Expose port 4321
EXPOSE 4321

# Start the Astro dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
