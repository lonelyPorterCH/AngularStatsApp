FROM node:22 AS frontend
WORKDIR /app
COPY frontend/stats-app/package*.json ./
RUN npm install
COPY frontend/stats-app/ .
RUN npm run build

FROM gradle:8-jdk21 AS backend
WORKDIR /app
COPY backend/ .
COPY --from=frontend /app/dist/stats-app/browser src/main/resources/static
RUN gradle bootJar

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=backend /app/build/libs/*.jar app.jar
VOLUME /data
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]