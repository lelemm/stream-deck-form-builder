# Use the electron builder wine image
FROM electronuserland/builder:wine

# Set working directory
WORKDIR /project

# Copy package files
COPY package.json package-lock.json* ./
COPY electron-builder.yml ./
COPY dist/ ./


# Install dependencies
RUN npm install


# Create a user with the same UID/GID as the host user to avoid permission issues
# The user ID will be passed as a build argument
ARG USER_ID=1000
ARG GROUP_ID=1000
RUN groupadd -g $GROUP_ID -o appuser || true && \
    useradd -m -u $USER_ID -g $GROUP_ID appuser || true

# Create cache directories and change ownership
RUN mkdir -p /tmp/.cache/electron /tmp/.cache/electron-builder && \
    chown -R appuser:appuser /project /tmp/.cache

# #RUN find . -path ./node_modules -prune -o -print
# RUN ls -la .

# # Fix ownership of all copied files
# RUN chown -R appuser:appuser /project

# RUN ls -la .

# Switch to the appuser for all subsequent operations
USER appuser

# Build the application
CMD ["npm", "run", "build-electron"]