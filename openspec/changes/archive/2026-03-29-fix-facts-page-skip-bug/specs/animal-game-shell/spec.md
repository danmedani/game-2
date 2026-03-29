## MODIFIED Requirements

### Requirement: Facts page shown reliably after every answer
After a player selects an answer, the game SHALL always display the facts/answer view and SHALL wait for an explicit player dismissal before advancing to the next question. The dismissal listener SHALL be installed in a way that cannot race with the answer-triggering interaction or with DOM clearing in `renderQuestion()`.

The implementation SHALL use `requestAnimationFrame` (or equivalent post-paint guarantee) to mark the dismiss listener as active, ensuring:
1. The facts view is fully rendered and painted before any click can dismiss it
2. The click that triggered the answer cannot accidentally also dismiss the facts view
3. `renderQuestion()` cannot clear the facts DOM before the player has dismissed

#### Scenario: Facts always shown
- **WHEN** a player selects any answer option
- **THEN** the facts/answer view SHALL be displayed before the next question renders, every time without exception

#### Scenario: Player must dismiss
- **WHEN** the facts view is displayed
- **THEN** the next question SHALL NOT render until the player clicks or taps to dismiss

#### Scenario: Answer click does not auto-dismiss
- **WHEN** a player clicks an answer option
- **THEN** that same click SHALL NOT count as a dismissal of the facts view that immediately follows

#### Scenario: Keyboard dismiss still works
- **WHEN** the facts view is displayed and the player presses Space or Enter
- **THEN** the facts view SHALL be dismissed and the next question SHALL load
