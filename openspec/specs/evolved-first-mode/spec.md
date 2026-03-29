## ADDED Requirements

### Requirement: Evolved-first question type
The system SHALL implement a question mode identified as `'evolved-first'` that presents two animals and asks the player which one appeared earlier in evolutionary/geological time.

The question SHALL display:
- Both animals' names (and images if available)
- The prompt "Which evolved FIRST?" (or equivalent)
- Two answer buttons, one per animal

The correct answer is the animal with the smaller `appeared` value (earlier in time = more millions of years ago). When `appeared` values are equal or differ by less than 0.5 Ma, the pair SHALL NOT be used for this question type.

#### Scenario: Correct answer selection
- **WHEN** the player selects the animal with the smaller `appeared` value
- **THEN** the answer SHALL be marked correct, points awarded, and the feedback SHALL show both animals' `appeared` values and `period` labels

#### Scenario: Incorrect answer selection
- **WHEN** the player selects the animal with the larger `appeared` value
- **THEN** the answer SHALL be marked incorrect, a life deducted per normal rules, and the feedback SHALL show both `appeared` values so the player learns

#### Scenario: Ambiguous pair excluded
- **WHEN** the question generator selects two animals whose `appeared` values differ by less than 0.5 Ma
- **THEN** the pair SHALL be discarded and a new pair selected

#### Scenario: Modern vs extinct pairing
- **WHEN** one animal has `extinct: false` (living species) and one has `extinct: true`
- **THEN** the living species SHALL always be considered "more recent" and SHALL never be the correct answer when paired with any Cenozoic extinct animal with `appeared > 0.001`

### Requirement: Evolved-first layout
The evolved-first question SHALL use the same two-option side-by-side (or stacked) layout as the existing size-battle question type, with full keyboard navigation support (left/right arrow keys to focus, Space/Enter to select).

#### Scenario: Keyboard navigation
- **WHEN** the evolved-first question is displayed
- **THEN** the player SHALL be able to navigate between the two options using arrow keys and confirm with Space or Enter, consistent with the existing battle-mode keyboard behavior

#### Scenario: Image display
- **WHEN** both animals have available images (`img !== ""`)
- **THEN** both images SHALL be displayed alongside the animal names

#### Scenario: Text-only fallback
- **WHEN** one or both animals lack images
- **THEN** only animal names SHALL be shown (no broken image placeholders)
