# ---------- 1) بناء الواجهة الأمامية (React) ----------
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- 2) بناء الخلفية (Spring Boot) مع تضمين الواجهة ----------
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /app/backend
COPY backend/pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY backend/src ./src
RUN rm -rf src/main/resources/static
COPY --from=frontend /app/frontend/dist ./src/main/resources/static
RUN mvn -q -B package -DskipTests

# ---------- 3) صورة التشغيل ----------
FROM eclipse-temurin:21-jre
# curl لفحص صحة النظام (healthcheck)
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend /app/backend/target/van-erp-backend.jar app.jar
ENV SERVER_PORT=8090 \
    TZ=Asia/Amman
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fs http://localhost:8090/actuator/health || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
