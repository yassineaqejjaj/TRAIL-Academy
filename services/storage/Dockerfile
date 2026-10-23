# Railway service "storage": MinIO built from source (the project no longer publishes container images on Docker Hub or Quay).
# Attach a volume at /data. Variables: MINIO_ROOT_USER, MINIO_ROOT_PASSWORD, MINIO_API_CORS_ALLOW_ORIGIN (the site origin).
FROM golang:1-bookworm AS build
RUN CGO_ENABLED=0 go install github.com/minio/minio@latest

FROM debian:bookworm-slim
COPY --from=build /go/bin/minio /usr/local/bin/minio
EXPOSE 9000
CMD ["minio", "server", "/data", "--address", ":9000"]
