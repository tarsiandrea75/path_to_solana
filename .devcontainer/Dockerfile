FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=1000

# Instalar dependencias
RUN apt-get update && apt-get install -y \
    curl \
    git \
    git-lfs \
    gnupg2 \
    ca-certificates \
    sudo \
    software-properties-common \
    wget \
    unzip \
    build-essential \
    bash-completion \
    libssl-dev \
    pkg-config \
    neovim \
    zsh \
    ripgrep \
    tmux \
    && rm -rf /var/lib/apt/lists/*

# Rust install
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:$PATH"

# Add user
RUN groupadd --gid $USER_GID $USERNAME || echo "fallo el groupadd" \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME -s /bin/bash || echo "fallo el useradd"\
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$USERNAME || echo "fallo el sudoers"\
    && chmod 0440 /etc/sudoers.d/$USERNAME || echo "fallo el chmod"

# Install starship
RUN curl -sS https://starship.rs/install.sh | sh -s -- -y

USER $USERNAME
WORKDIR /home/$USERNAME

ENV PATH="/home/${USERNAME}/.cargo/bin:/home/${USERNAME}/.local/bin:$PATH"

# Add Starship to prompt
RUN echo '\neval "$(starship init bash)"' >> /home/${USERNAME}/.bashrc
