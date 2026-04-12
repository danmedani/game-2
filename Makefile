.PHONY: all local admin animal-admin moon-admin fetch-data fetch-one fetch-animal-one fetch-prehistoric merge-prehistoric add-dinos fill-dinos fill-lengths assign-levels count clean

all:
	open http://localhost:8080 & python3 -m http.server 8080

local:
	open "http://localhost:8080?dev=1" & python3 -m http.server 8080

admin:
	open http://localhost:8081/admin.html & python3 scripts/admin-server.py

animal-admin:
	open http://localhost:8082/animal-game/admin.html & python3 scripts/admin-animal-server.py

moon-admin:
	open http://localhost:8083/moon-game/admin.html & python3 scripts/admin-moon-server.py

fetch-data:
	python3 scripts/fetch-dino-data.py

fetch-animal-data:
	python3 scripts/fetch-animal-data.py

fetch-animal-one:
	python3 scripts/fetch-animal-one.py "$(ANIMAL)"

fetch-prehistoric:
	python3 scripts/fetch-prehistoric-wiki.py

merge-prehistoric:
	python3 scripts/merge-prehistoric.py

fetch-one:
	python3 scripts/fetch-one.py "$(DINO)"

add-dinos:
	python3 scripts/add-dinos.py $(if $(FILE),"$(FILE)","$(N)")

fill-dinos:
	python3 scripts/fill-dinos.py

fill-lengths:
	python3 scripts/fill-lengths.py

assign-levels:
	python3 scripts/assign-levels.py

count:
	@python3 scripts/count.py

clean:
	echo 'const DINO_DATA = {};' > js/dino-data.js
