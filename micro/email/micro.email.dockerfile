# Build stage
FROM golang:alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN go build -o main .

# Run stage
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE 7979
CMD ["./main"]
