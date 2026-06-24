# syntax=docker/dockerfile:1

FROM node:lts-krypton

ARG DEBIAN_FRONTEND=noninteractive

USER root
WORKDIR /root

RUN apt update && apt install -y \
  apt-transport-https ca-certificates gnupg lsb-release iputils-ping net-tools \
  curl wget git zip unzip less zsh jq lsof ripgrep

ENV HOME="/root"

# --------------------------------------
# Git
# --------------------------------------
# Need to add the devcontainer workspace folder as a safe directory to enable git 
# version control system to be enabled in the containers file system.
RUN git config --global --add safe.directory "/workspaces/cliqrelay"
# --------------------------------------

# --------------------------------------
# Oh my zsh
# --------------------------------------
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" -- \
  -t robbyrussell \
  -p git -p node -p npm

ENV SHELL=/bin/zsh
# --------------------------------------

# --------------------------------------
# pnpm
# --------------------------------------
RUN npm i -g pnpm@11.9.0
# --------------------------------------

# --------------------------------------
# Python
# --------------------------------------
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="$PATH:/root/.local/bin"
# --------------------------------------

# --------------------------------------
# Docker
# --------------------------------------
# Recreate apt lists because we cleaned them earlier
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
  && rm -rf /var/lib/apt/lists/*

# Add Docker's official GPG key (keyring method)
RUN install -m 0755 -d /etc/apt/keyrings \
  && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
  && chmod a+r /etc/apt/keyrings/docker.asc

# Add the Docker apt source using docker.sources
RUN . /etc/os-release \
  && echo "Types: deb" > /etc/apt/sources.list.d/docker.sources \
  && echo "URIs: https://download.docker.com/linux/debian" >> /etc/apt/sources.list.d/docker.sources \
  && echo "Suites: ${VERSION_CODENAME}" >> /etc/apt/sources.list.d/docker.sources \
  && echo "Components: stable" >> /etc/apt/sources.list.d/docker.sources \
  && echo "Signed-By: /etc/apt/keyrings/docker.asc" >> /etc/apt/sources.list.d/docker.sources

RUN apt-get update && apt-get install -y --no-install-recommends \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin \
  && rm -rf /var/lib/apt/lists/*
# --------------------------------------

# --------------------------------------
# Go & tools
# --------------------------------------
RUN curl -sSL https://go.dev/dl/go1.26.4.linux-amd64.tar.gz | tar -C /usr/local -xz
ENV PATH="${PATH}:/usr/local/go/bin"

# Install Go tools useful for dev
RUN go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest \
&& go install github.com/go-delve/delve/cmd/dlv@latest \
&& go install golang.org/x/tools/gopls@latest
# --------------------------------------

# --------------------------------------
# Ngrok
# --------------------------------------
RUN curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \
  && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
  | tee /etc/apt/sources.list.d/ngrok.list \
  && apt update \
  && apt install -y ngrok
# --------------------------------------

# --------------------------------------
# SSH 
# --------------------------------------
RUN mkdir -p ~/.ssh
RUN touch ~/.ssh/config
RUN echo "Host github.com" >> ~/.ssh/config \
  && echo "    IdentityFile ~/.ssh/id_ed25519" >> ~/.ssh/config
RUN touch ~/.ssh/id_ed25519
# --------------------------------------
