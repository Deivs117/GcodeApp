BINARY_NAME=flux-gcode-api
FRONT_DIR=frontend
BACK_DIR=backend

.PHONY: dev build test lint clean docker-up run-back run-front run-frontend

dev:
	@echo "🚀 Starting development environment..."
	(cd $(BACK_DIR) && go run cmd/main.go) & (cd $(FRONT_DIR) && npm run dev)

run-back:
	cd $(BACK_DIR) && go run cmd/main.go

run-front: run-frontend

run-frontend:
	cd $(FRONT_DIR) && npm run dev

test:
	@echo "🧪 Running backend unit tests..."
	cd $(BACK_DIR) && go test ./... -v

lint:
	cd $(BACK_DIR) && go fmt ./...
	cd $(FRONT_DIR) && npm run lint

build:
	@echo "🏗️ Building binaries and bundles..."
	mkdir -p build
	cd $(BACK_DIR) && go build -o ../build/$(BINARY_NAME) cmd/main.go
	cd $(FRONT_DIR) && npm run build

docker-up:
	docker-compose up --build -d

clean:
	rm -rf build/
	rm -rf $(FRONT_DIR)/.next
	@echo "🧹 Cleanup complete."
