# syntax=docker/dockerfile:1

FROM node:lts-krypton

ARG DEBIAN_FRONTEND=noninteractive

USER root
WORKDIR /root
ENV HOME="/root"

RUN apt update && apt install -y \
    apt-transport-https ca-certificates gnupg lsb-release iputils-ping net-tools \
    curl wget git zip unzip less zsh jq lsof ripgrep

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
# Node.js
# --------------------------------------
RUN npm i -g pnpm@12.3.4
# --------------------------------------

# --------------------------------------
# Go & tools
# --------------------------------------
RUN curl -sSL https://go.dev/dl/go1.26.4.linux-amd64.tar.gz | tar -C /usr/local -xz
ENV PATH="${PATH}:/usr/local/go/bin"

# Install Go tools useful for dev
RUN go install github.com/go-delve/delve/cmd/dlv@latest \
    && go install golang.org/x/tools/gopls@latest

ENV PATH="$PATH:$(go env GOPATH)/bin"
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
RUN touch ~/.ssh/id_ed25519 && chmod 600 ~/.ssh/id_ed25519
# --------------------------------------
