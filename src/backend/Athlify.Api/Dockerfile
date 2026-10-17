FROM node:22-alpine AS frontend-build
WORKDIR /frontend

COPY src/frontend/athlify/package.json src/frontend/athlify/package-lock.json ./
RUN npm ci

COPY src/frontend/athlify/ .
RUN npm run relay && npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["src/backend/Athlify.Api/Athlify.Api.csproj", "src/backend/Athlify.Api/"]
RUN dotnet restore "src/backend/Athlify.Api/Athlify.Api.csproj"

COPY src/backend/ src/backend/
WORKDIR "/src/src/backend/Athlify.Api"
RUN dotnet publish "Athlify.Api.csproj" \
    --configuration Release \
    --output /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
RUN apt-get update \
    && apt-get install --no-install-recommends --yes curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish .
COPY --from=frontend-build /frontend/dist ./wwwroot

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

USER $APP_UID
ENTRYPOINT ["dotnet", "Athlify.Api.dll"]
