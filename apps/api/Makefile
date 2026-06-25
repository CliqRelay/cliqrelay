# Variables
APP_NAME=cliqrelay
BINARY_PATH=./tmp/$(APP_NAME)
OPENAPI_EXPORT_BINARY=./tmp/openapi-export
WORKER_BINARY=./tmp/$(APP_NAME)-worker

.PHONY: help build build-exe run dev test clean install setup
.PHONY: test-coverage
.PHONY: lint fmt vet deps-update all check quick-check ci
.PHONY: openapi-export build-openapi-export

# Help command
help: # Display this help screen
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# Build commands`
build: # Build the package (library)
	@echo "Building $(APP_NAME) package..."
	@go build ./...
	@echo "Build complete!"

build-exe: # Build the binary executable
	@echo "Building $(APP_NAME) binary..."
	@mkdir -p ./tmp
	@rm -rf ./tmp/$(APP_NAME)
	@go build -o $(BINARY_PATH) ./cmd/core/main.go
	@echo "Binary built: $(BINARY_PATH)"

run: # Run the application
	@rm -f ./tmp/$(APP_NAME)
	@go run ./cmd/core/main.go

dev: # Run the application with live reloading using air
	@rm -f ./tmp/$(APP_NAME)
	@go run ./cmd/core/main.go

build-worker: # Build the worker binary
	@mkdir -p ./tmp
	@go build -o $(WORKER_BINARY) ./cmd/worker/main.go

run-worker: # Run the worker standalone
	@go run ./cmd/worker/main.go

openapi-export: # Export the OpenAPI spec to a file (default: openapi.json). Usage: make openapi-export ARGS="--output ../../packages/api-client/openapi.json --format json"
	@echo "Exporting OpenAPI spec..."
	@go run ./cmd/openapi-export/ $(ARGS)
	@echo "Done!"

# Test commands
test: # Run all tests
	@echo "Running tests..."
	@go test -race -v ./...

test-coverage: # Run tests with coverage report
	@echo "Running tests with coverage..."
	@go test -race -v -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"
	@go tool cover -func=coverage.out | grep total | awk '{print "Total coverage: " $$3}'

# Dependency management
install: # Install dependencies
	@echo "Installing dependencies..."
	@go mod download
	@go mod tidy

deps-update: # Update dependencies
	@echo "Updating dependencies..."
	@go get -u ./...
	@go mod tidy

# Library mode development
library-test: test # Run library mode tests

# Development setup
setup: install # Setup development environment
	@echo "Setting up development environment..."
	@go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	@go install github.com/air-verse/air@latest
	@echo "Development environment setup complete!"

# Clean commands
clean: # Clean build artifacts
	@echo "Cleaning..."
	@rm -rf bin/
	@rm -f coverage.out coverage.html
	@go clean

# Code quality
lint: # Run linter
	@echo "Running linter..."
	@golangci-lint run

fmt: # Format code
	@echo "Formatting code..."
	@go fmt ./...

vet: # Run go vet
	@echo "Running go vet..."
	@go vet ./...

# All-in-one commands
all: clean install build check # Clean, install deps, build, and run all checks

check: fmt vet lint test # Run all checks (format, vet, lint, test)

quick-check: fmt vet test # Run quick checks (format, vet, fast tests)

ci: clean install check # CI pipeline (clean, install, check)

# Postgres test database management
test-pg-up: # Start a test Postgres container
	@echo "Starting test Postgres container..."
	@docker run -d --name cliqrelay-test-pg \
		-e POSTGRES_USER=postgres \
		-e POSTGRES_PASSWORD=postgres \
		-e POSTGRES_DB=testdb \
		-p 5432:5432 \
		postgres:18-alpine

test-pg-down: # Stop and remove the test Postgres container
	@echo "Stopping test Postgres container..."
	@docker rm -f cliqrelay-test-pg 2>/dev/null || true

test-pg: # Run repository tests against Postgres (auto-manages container lifecycle)
	@echo "Starting test Postgres container..."
	@docker run -d --rm --name cliqrelay-test-pg \
		-e POSTGRES_USER=postgres \
		-e POSTGRES_PASSWORD=postgres \
		-e POSTGRES_DB=testdb \
		-p 5432:5432 \
		postgres:18-alpine >/dev/null 2>&1 || true
	@echo "Waiting for Postgres to be ready..."
	@for i in $$(seq 1 30); do \
		if docker exec cliqrelay-test-pg pg_isready -q 2>/dev/null; then break; fi; \
		sleep 1; \
	done
	@echo "Running repository tests against Postgres..."
	@TEST_DATABASE_URL="postgres://postgres:postgres@$$(docker inspect cliqrelay-test-pg --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'):5432/testdb?sslmode=disable" go test -race -v -count=1 -p 1 ./repositories/...; status=$$?; \
		echo "Stopping test Postgres container..."; \
		docker stop cliqrelay-test-pg >/dev/null 2>&1 || true; \
		exit $$status

# Integration testing
integration-test: docker-down docker-up docker-test # Run integration tests with Docker

# Default target
.DEFAULT_GOAL := help
