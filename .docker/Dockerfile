# Dockerfile for a Node.js application
# This Dockerfile defines the build process for a Node.js application
# It sets up the environment, installs dependencies, builds the application,
# and configures it to run when the container starts.

# Stage 1: Create a temporary build stage with Node.js
FROM public.ecr.aws/docker/library/node:lts-alpine3.18 AS deps

# Update Alpine Linux package manager
RUN apk update

# Upgrade installed packages
RUN apk upgrade

# Install curl for debugging purposes
RUN apk -a info curl
RUN apk add curl

# Install libc6-compat to provide compatibility with some Node.js dependencies
RUN apk add --no-cache libc6-compat

# Set the working directory within the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package.json package-lock.json ./

# Install Node.js dependencies using npm, including legacy peer dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application source code to the container
COPY . .

# Build the application
RUN npm run build

# Expose port 3000 for the application
EXPOSE 3000

# Set an environment variable for the application's port
ENV PORT 3000

# Define the command to run when the container starts
CMD npm start
