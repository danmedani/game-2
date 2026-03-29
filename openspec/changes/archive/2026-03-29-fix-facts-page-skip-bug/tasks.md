## 1. Investigate & Reproduce

- [x] 1.1 Read `waitForAnswerDismiss()` and surrounding call sites in `animal-game/js/game.js` to confirm the race condition location
- [x] 1.2 Trace the full answer flow: `handleAnswer()` → `showAnswerView()` → `waitForAnswerDismiss()` → `nextQuestion()`/`endLevel()`

## 2. Fix the Race Condition

- [x] 2.1 Replace the `setTimeout(0)` in `waitForAnswerDismiss()` with a `requestAnimationFrame`-gated approach: set a `dismissReady` boolean to `false` before rendering, flip it to `true` inside a `requestAnimationFrame` callback, and have the click listener only resolve the promise when `dismissReady === true`
- [x] 2.2 Ensure the click listener is installed synchronously (before rAF fires) so there is no window where DOM clearing can race with listener installation
- [x] 2.3 Verify the keyboard dismiss path (Space/Enter synthetic click on `#question-area`) still works correctly with the new gating logic

## 3. Verify

- [ ] 3.1 Manually play through 10+ questions and confirm the facts page appears every time before the next question loads
- [ ] 3.2 Confirm that clicking an answer does not simultaneously dismiss the facts view (two separate clicks required: one to answer, one to advance)
- [ ] 3.3 Confirm keyboard dismissal (Space/Enter) still advances from the facts page correctly
