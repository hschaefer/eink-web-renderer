FROM ghcr.io/puppeteer/puppeteer:latest

# Setup application working directory
WORKDIR /home/pptruser/app

# Copy package descriptors with correct ownership
COPY --chown=pptruser:pptruser package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of the application files
COPY --chown=pptruser:pptruser . .

# Expose the web server port
EXPOSE 8080

# Command to launch the microservice
CMD ["node", "index.js"]
