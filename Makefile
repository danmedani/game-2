.PHONY: all fetch-data

all:
	open http://localhost:8080 & python3 -m http.server 8080

fetch-data:
	python3 scripts/fetch-dino-data.py
