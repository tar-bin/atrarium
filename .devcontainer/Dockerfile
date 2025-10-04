# Atrarium Development Container
FROM mcr.microsoft.com/devcontainers/base:noble

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=development

# Install basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install uv (Python package manager) for SpecKit
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Install SpecKit using uv
# Note: Claude Code will be installed via postCreateCommand after Node.js is available
RUN uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# Verify SpecKit installation
RUN specify check || echo "SpecKit installed successfully"

# Set working directory
WORKDIR /workspaces

# Default command (will be overridden by docker-compose)
CMD ["sleep", "infinity"]