## ADDED Requirements

### Requirement: Faster question type
The system SHALL implement a question mode identified as `'faster'` that presents two animals and asks the player which one is faster (higher top speed).

The question SHALL display:
- Both animals' names (and images if available)
- The prompt "Which is FASTER?"
- Two answer buttons, one per animal

The correct answer is the animal with the higher `speed` value. When `speed` values are equal or differ by less than 2 km/h, the pair SHALL NOT be used for this question type.

#### Scenario: Correct answer selection
- **WHEN** the player selects the animal with the higher `speed` value
- **THEN** the answer SHALL be marked correct, points awarded, and the feedback SHALL reveal both animals' speeds in km/h (and mph in parentheses)

#### Scenario: Incorrect answer selection
- **WHEN** the player selects the animal with the lower `speed` value
- **THEN** the answer SHALL be marked incorrect, and feedback SHALL show both speeds so the player learns

#### Scenario: Too-close pair excluded
- **WHEN** the question generator selects two animals whose `speed` values differ by less than 2 km/h
- **THEN** the pair SHALL be discarded and a new pair selected

#### Scenario: Speed display in feedback
- **WHEN** a faster question answer is revealed
- **THEN** both speeds SHALL be shown as "{speed} km/h ({mph} mph)" where mph is rounded to the nearest integer

### Requirement: Faster layout
The faster question SHALL reuse the same two-option layout as the evolved-first and size-battle question types, with full keyboard navigation support.

#### Scenario: Keyboard navigation
- **WHEN** the faster question is displayed
- **THEN** left/right arrow keys SHALL move focus between options and Space/Enter SHALL confirm selection

#### Scenario: Speed hint indicator
- **WHEN** the faster question is displayed (before answer)
- **THEN** no speed values SHALL be revealed — the player must rely on knowledge alone

#### Scenario: Image display
- **WHEN** both animals have available images
- **THEN** both images SHALL be shown alongside names

#### Scenario: Text-only fallback
- **WHEN** one or both animals lack images
- **THEN** only names SHALL be displayed
