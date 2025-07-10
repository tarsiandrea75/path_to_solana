FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

ARG USERNAME=solanero
ARG USER_UID=1001
ARG USER_GID=1001

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
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME -s /bin/bash \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME || echo "fallo el chmod"

# Instalar las dependencias del curso
RUN curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | sh -s -- -y

# Instalar starship
RUN curl -sS https://starship.rs/install.sh | sh -s -- -y

USER $USERNAME
WORKDIR /home/$USERNAME

ENV PATH="/home/${USERNAME}/.cargo/bin:/home/${USERNAME}/.local/bin:$PATH"

# Crear la carpeta de configuración de starship y copiar el archivo
COPY starship.toml /home/${USERNAME}/.config/starship.toml

# Dar permisos correctos y setear la variable de entorno
RUN chown -R ${USERNAME}:${USERNAME} /home/${USERNAME}/.config

ENV STARSHIP_CONFIG=/home/${USERNAME}/.config/starship.toml

# Agregar el prompt de starship
RUN echo '\neval "$(starship init bash)"' >> /home/${USERNAME}/.bashrc
