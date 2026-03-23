.PHONY: all local fetch-data fetch-one clean

all:
	open http://localhost:8080 & python3 -m http.server 8080

local:
	open "http://localhost:8080?dev=1" & python3 -m http.server 8080

fetch-data:
	python3 scripts/fetch-dino-data.py

fetch-one:
	python3 scripts/fetch-one.py "$(DINO)"

clean:
	echo 'const DINO_DATA = {};' > js/dino-data.js
