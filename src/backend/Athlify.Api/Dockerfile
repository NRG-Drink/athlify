# =========================== Stage 1: Build the Frontend ===========================
FROM node:22-alpine AS frontend-build
WORKDIR /frontend

# Check changes on dependencies first
COPY src/frontend/athlify/package.json src/frontend/athlify/package-lock.json ./
RUN npm ci

COPY src/frontend/athlify/ .
RUN npm run relay && npm run build


# =========================== Stage 2: Build the Backend ===========================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /backend

# Check changes on dependencies first
COPY ["src/backend/Athlify.Api/Athlify.Api.csproj", "Athlify.Api/"]
RUN dotnet restore "Athlify.Api/Athlify.Api.csproj"

COPY src/backend/ ./
WORKDIR "/backend/Athlify.Api"
RUN dotnet publish "Athlify.Api.csproj" \
    --configuration Release \
    --output /app/publish \
    --no-restore \
    /p:UseAppHost=false


# =========================== Stage 3: Runtime ======================================
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
