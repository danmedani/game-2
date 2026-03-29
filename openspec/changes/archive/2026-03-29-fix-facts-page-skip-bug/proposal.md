## Why

After answering a question, the facts page (showing animal info, image, and details) is intermittently skipped — the game jumps straight to the next question without giving the player a chance to read the facts. This is a core part of the learning experience and the bug breaks it unpredictably.

## What Changes

- Fix the race condition in `waitForAnswerDismiss()` where a `setTimeout(0)` delay causes the click listener to sometimes be installed after `renderQuestion()` has already cleared the DOM
- Ensure the facts/answer view is always shown and awaited before transitioning to the next question

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `animal-game-shell`: The answer dismissal flow must reliably show the facts view before advancing — the current intermittent-skip behavior is a bug against this requirement

## Impact

- `animal-game/js/game.js`: `waitForAnswerDismiss()` function and its interaction with `showAnswerView()` / `renderQuestion()`
- No API, dependency, or data changes
