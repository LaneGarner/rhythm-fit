# TODO

- [ ] Enhance the coach AI to analyze workout history and make recommendations
- [ ] Improve natural language understanding for recurring activities
- [ ] Make the app name configurable from a central config file
- [ ] Add accessibility features to all components (labels, hints, screen reader support)g
- [ ] Add unit and integration tests
- [ ] ensure text input in chat is always cleared after submitting... sometimes i see the previous message populated here
- [ ] when i delete all chat history and then go back to the chat tab it keeps the most recent chat.. this shoudl go to a new chat since the old one shouldn't be saved anymore

- add longer chat memory. maybe make a profile of the user over time.
- use the data on the schedule and stats to inform profile
- clickable suggestions in chat. either a response to the last message or ideas for prompts. Pull workout examples. Make me a leg day workout. Make me a full body workout over 3 days. What can I do for recovery? How can I improve my nutrition? Make a bunch of these and always show random ones. I don't want too many to show in the ui... maybe like 3-5.
- add link to youtube search for workout term (open in app? open youtube app? probably youtube)
- long press copy messages in chat.
- weird thing in chat where it goes to next page
- add more things to settings
- instructions?
- dev mode button that we can hide later in top right of entire app. clear all data. clear all workout data. clear all chat data. anythign else that might be useful. make the button red and small and obvious that it is for dev only.

---

## Implementation Instructions

### Splash Screen

- Pure black background in dark mode
- Configurable app name (pull from constants)
- Particle burst animation (particles explode outward then converge)
- Smooth transitions
- Accessibility features
- Native iOS-style design

### Dropdown Fixes

- Use a modal for suggestions
- Show suggestions immediately on focus
- Do not close suggestions when scrolling

### General

- Follow all step-by-step guidance in RHYTHM_FEATURE_IMPLEMENTATION.md for new features
- Only change what is explicitly specified in the instructions
- Do not regenerate files or majorly change UI beyond the exact changes described

---

## Rules for Parsing and Following Instructions

- **Do not change anything else in the app except what is explicitly specified in the instructions.**
- **Take no liberties.**
- **Do not regenerate any files or majorly change any UI beyond the exact changes described.**
- **Follow the instructions to the letter without adding any additional features, UI changes, or modifications not explicitly mentioned.**
- **If a step is unclear, clarify before proceeding.**
- **If a file or feature is not mentioned, do not modify it.**
- **Always check for and follow any critical instructions or warnings at the top of the instruction files.**
