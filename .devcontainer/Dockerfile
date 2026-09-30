FROM mcr.microsoft.com/devcontainers/dotnet:1-10.0

# The base image ships a Yarn apt source whose signing key has expired, which makes every
# `apt-get update` fail (and with it the docker-outside-of-docker feature install).
# Yarn is not used here; the frontend uses npm.
RUN rm -f /etc/apt/sources.list.d/yarn.list
