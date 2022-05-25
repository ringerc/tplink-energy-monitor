# This Dockerfile will work for most architectures including x86_64, i686,
# armv7l and armv8
#
# You must build with "docker buildx build"
#
# Use --no-cache or run "docker buildx prune -f" after a build to free space
# from build caches.
#
# Use --progress=plain for detailed progress output.
#
# For development builds, you can skip flattening the image with
#   --target=builder --arg NODE_ENV=development
#
# To build for arm32v6 use --build-arg BASE_IMAGE=hypriot/rpi-node:8.1-slim
# To build for arm32v7 use --build-arg BASE_IMAGE=arm32v7/node:8.11-slim
#

# Use a multi-stage build to keep npm droppings away from the final built image
ARG BASE_IMAGE=node:8-alpine
FROM $BASE_IMAGE as builder
USER node
WORKDIR /opt/tplink-monitor
# Install dependencies in a separate, cacheable layer
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
COPY package.json package-lock.json .
RUN --mount=type=cache,target=/var/cache/npm,uid=1000,gid=1000 \
  npm set cache /var/cache/npm && \
  npm ci
# Copy the rest of the app into the build layer
COPY . .

# This command option only has an effect when you use --target=builder to stop
# the multistage build here. Normally we'll use the command for the "app"
# flattened image below, which skips the "npm" wrapper.
ENTRYPOINT ["npm","start"]

# Flattened minimal production image with no excess layers and no npm launcher
# wrapper.
ARG BASE_IMAGE=node:8-alpine
FROM $BASE_IMAGE as app
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
USER node
WORKDIR /opt/tplink-monitor
COPY --from=builder /opt/tplink-monitor /opt/tplink-monitor
ENTRYPOINT ["node","app.js"]
