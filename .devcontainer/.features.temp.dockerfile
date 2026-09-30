FROM jb-devcontainer-athlify:latest
COPY --from=jb-devcontainer-features-e116c9e3866166a5f0b10f10e7b14bef /tmp/jb-devcontainer-features /tmp/jb-devcontainer-features/
ENV NVM_DIR="/usr/local/share/nvm"
ENV NVM_SYMLINK_CURRENT="true"
ENV PATH="/usr/local/share/nvm/current/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/home/vscode/.dotnet:/home/vscode/.dotnet/tools"
ENV APP_UID="1654"
ENV ASPNETCORE_HTTP_PORTS="8080"
ENV DOTNET_RUNNING_IN_CONTAINER="true"
ENV DOTNET_VERSION="10.0.0-rc.2.25502.107"
ENV ASPNET_VERSION="10.0.0-rc.2.25502.107"
ENV DOTNET_GENERATE_ASPNET_CERTIFICATE="false"
ENV DOTNET_NOLOGO="true"
ENV DOTNET_SDK_VERSION="10.0.100-rc.2.25502.107"
ENV DOTNET_USE_POLLING_FILE_WATCHER="true"
ENV NUGET_XMLDOC_MODE=""
ENV POWERSHELL_DISTRIBUTION_CHANNEL="PSDocker-DotnetSDK-Ubuntu-24.04"
ENV DOTNET_ROLL_FORWARD="Major"
ENV _CONTAINER_USER="root"
ENV _CONTAINER_USER_HOME="/root"
ENV _REMOTE_USER="vscode"
ENV _REMOTE_USER_HOME="/home/vscode"

USER root
RUN chmod -R 0755 /tmp/jb-devcontainer-features/ghcr.io-devcontainers-features-docker-outside-of-docker-1 \
&& cd /tmp/jb-devcontainer-features/ghcr.io-devcontainers-features-docker-outside-of-docker-1 \
&& chmod +x ./devcontainer-feature-setup.sh \
&& ./devcontainer-feature-setup.sh
ENV NVM_DIR="/usr/local/share/nvm"
ENV NVM_SYMLINK_CURRENT="true"
ENV PATH="/usr/local/share/nvm/current/bin:${PATH}"
USER root
RUN chmod -R 0755 /tmp/jb-devcontainer-features/ghcr.io-devcontainers-features-node-1 \
&& cd /tmp/jb-devcontainer-features/ghcr.io-devcontainers-features-node-1 \
&& chmod +x ./devcontainer-feature-setup.sh \
&& ./devcontainer-feature-setup.sh
USER root
RUN chmod -R 0755 /tmp/jb-devcontainer-features/ghcr.io-devcontainers-features-github-cli-1 \
&& cd /tmp/jb-devcontainer-features/ghcr.io-devcontainers-features-github-cli-1 \
&& chmod +x ./devcontainer-feature-setup.sh \
&& ./devcontainer-feature-setup.sh