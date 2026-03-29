## Context

After a player answers a question in the animal game, `showAnswerView()` renders the facts page synchronously, then `waitForAnswerDismiss()` installs a click listener to wait for the player to dismiss it. The listener is installed inside a `setTimeout(..., 0)` — deferred to the next event loop tick. If the call stack that follows `waitForAnswerDismiss()` somehow resolves before that tick fires, `renderQuestion()` clears the DOM with `area.innerHTML = ''`, destroying the facts view before the listener ever attaches.

In practice this doesn't seem to be the direct cause in isolation, but it creates a fragile timing window. The more likely trigger is that the `await waitForAnswerDismiss()` promise resolves prematurely — either because a stale click event propagates into the listener during the setTimeout gap, or because `state.answeredThisRound` and keyboard/click handlers interact in a way that fires the dismiss before the user intends it. The end result is intermittent: sometimes the facts page flashes and vanishes, sometimes it never appears at all.

## Goals / Non-Goals

**Goals:**
- The facts/answer view is always displayed and the player must explicitly dismiss it before the next question loads
- The fix is minimal and contained to the dismissal flow — no architectural changes

**Non-Goals:**
- Redesigning the facts page UI
- Changing when or what facts are displayed
- Fixing the unrelated `evolved-first` dead-code reference

## Decisions

**Decision: Replace `setTimeout(0)` with synchronous listener installation**

The `setTimeout(0)` in `waitForAnswerDismiss()` was presumably added to avoid catching the same click that triggered `handleAnswer()`. A cleaner solution is to use a one-time flag or to listen for a `pointerup`/`click` on the *next* event after the current one — achieved by calling `addEventListener` synchronously but consuming the event only after a reliable guard (e.g., checking that `state.answeredThisRound === true`, or using `{ once: true }` combined with an `e.stopImmediatePropagation()` on the answer-triggering click).

The safest minimal fix: install the listener synchronously after `showAnswerView()` renders, but guard it with a timestamp or a boolean that is only set to "ready to dismiss" after the current call stack unwinds. This eliminates the race while keeping the same logical flow.

**Alternative considered: Promise-based event** — wrapping in a `new Promise(resolve => area.addEventListener('click', resolve, { once: true }))` without the setTimeout. Cleaner, but has the same potential to catch the triggering click unless properly guarded.

**Chosen approach:** Remove the `setTimeout` and instead set a `dismissReady` flag synchronously to `false` before rendering, then flip it to `true` via `requestAnimationFrame` (which fires after paint, guaranteeing the answer view is visible and the triggering click has fully propagated). The click listener checks this flag; only resolves when `dismissReady` is `true`.

## Risks / Trade-offs

- [Risk: `requestAnimationFrame` adds ~16ms delay before dismiss is active] → Acceptable — the player cannot physically click faster than one frame, and it ensures the facts view is actually painted before dismissal is possible
- [Risk: Regression on keyboard dismiss path] → The keyboard handler in `game.js` synthesizes a click on `#question-area`; this path is unaffected as long as the `rAF` fires before the player presses a key (which it always will at human speed)
