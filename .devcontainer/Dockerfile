FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

ARG USERNAME
ARG USER_UID
ARG USER_GID

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
        zsh \
        ripgrep \
        tmux \
        && rm -rf /var/lib/apt/lists/*

# Agragar usuario
RUN apt-get update && apt-get install -y sudo \
    && if ! getent group $USER_GID > /dev/null; then \
        groupadd --gid $USER_GID $USERNAME; \
    fi \
    && if getent passwd $USER_UID > /dev/null; then \
        usermod -l $USERNAME -d /home/$USERNAME -m -g $USER_GID $(getent passwd $USER_UID | cut -d: -f1); \
    else \
        useradd --uid $USER_UID --gid $USER_GID -m $USERNAME -s /bin/bash; \
    fi \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME
# Seteando el ambiente
USER $USERNAME
WORKDIR /home/$USERNAME

# Instalar las dependencias del curso (rust, solana-cli y anchor)
RUN curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash

# Instalar starship, con full path the cargo porque no esta en el env.
RUN /home/${USERNAME}/.cargo/bin/cargo install starship --locked

# Configurando starship como prompt
COPY starship.toml /home/${USERNAME}/.config/starship.toml
ENV STARSHIP_CONFIG=/home/${USERNAME}/.config/starship.toml
RUN echo '\neval "$(starship init bash)"' >> /home/${USERNAME}/.bashrc
