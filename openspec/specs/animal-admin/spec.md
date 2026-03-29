## ADDED Requirements

### Requirement: Admin UI loads CenozoiQuest animal data
The admin UI at `animal-game/admin.html` SHALL load `ANIMALS` from `animal-game/js/animals.js` and `ANIMAL_DATA` from `animal-game/js/animal-data.js` to populate the sidebar and editor.

#### Scenario: Sidebar renders all animals
- **WHEN** the admin page loads
- **THEN** the sidebar SHALL show all 200 entries from `ANIMALS` with thumbnail, name, level, and extinct/extant status

#### Scenario: Missing image badge
- **WHEN** an animal has no `img` field in `ANIMAL_DATA`
- **THEN** the sidebar item SHALL show a "no img" badge

#### Scenario: Broken image badge
- **WHEN** an animal's `img` URL fails to load
- **THEN** the sidebar item SHALL show a broken image badge (✗)

### Requirement: Admin UI filters animals by name or wiki key
The admin UI SHALL provide a filter input in the header that filters the sidebar list in real time.

#### Scenario: Filter by name
- **WHEN** the user types in the filter input
- **THEN** only animals whose name or wiki key contains the typed string (case-insensitive) SHALL be shown

### Requirement: Admin UI allows editing image URL and descriptions
Selecting an animal in the sidebar SHALL open an editor panel with fields for image URL, short description, and full description.

#### Scenario: Editor shows current values
- **WHEN** the user selects an animal
- **THEN** the editor SHALL show the current `img`, `short`, and `full` values from `ANIMAL_DATA`

#### Scenario: Preview image URL
- **WHEN** the user clicks the Preview button
- **THEN** the editor SHALL update the preview image to the URL currently in the image input

#### Scenario: Save changes
- **WHEN** the user clicks Save
- **THEN** the editor SHALL POST the updated fields to `POST /api/update` and show a success indicator on success

### Requirement: Admin server persists changes to animal-data.js
`scripts/admin-animal-server.py` SHALL handle `POST /api/update` by reading `animal-game/js/animal-data.js`, applying the `img`/`short`/`full` field changes for the given `wiki` key, and writing the file back.

#### Scenario: Valid update
- **WHEN** a POST to `/api/update` contains a valid `wiki` key and at least one of `img`, `short`, `full`
- **THEN** the server SHALL update `ANIMAL_DATA[wiki]` and return `{"ok": true}`

#### Scenario: Missing wiki key
- **WHEN** a POST to `/api/update` is missing the `wiki` field
- **THEN** the server SHALL return HTTP 400

### Requirement: Admin server runs on port 8082
The animal admin server SHALL listen on port 8082 so it can run simultaneously with the dino admin (port 8081).

#### Scenario: Separate ports
- **WHEN** both `make admin` and `make animal-admin` are running
- **THEN** each SHALL serve independently without port conflict

### Requirement: Makefile target launches the animal admin
A `make animal-admin` target SHALL start `scripts/admin-animal-server.py`.

#### Scenario: Launch
- **WHEN** the user runs `make animal-admin`
- **THEN** the admin server SHALL start and print the local URL to stdout
