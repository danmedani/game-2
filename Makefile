.PHONY: all local fetch-data fetch-one add-dinos fill-dinos assign-levels count clean

all:
	open http://localhost:8080 & python3 -m http.server 8080

local:
	open "http://localhost:8080?dev=1" & python3 -m http.server 8080

fetch-data:
	python3 scripts/fetch-dino-data.py

fetch-one:
	python3 scripts/fetch-one.py "$(DINO)"

add-dinos:
	python3 scripts/add-dinos.py $(if $(FILE),"$(FILE)","$(N)")

fill-dinos:
	python3 scripts/fill-dinos.py

assign-levels:
	python3 scripts/assign-levels.py

count:
	@python3 scripts/count.py

clean:
	echo 'const DINO_DATA = {};' > js/dino-data.js
