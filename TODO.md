# TODO

- [ ] Enhance the coach AI to analyze workout history and make recommendations
- [ ] Improve natural language understanding for recurring activities
- [ ] Make the app name configurable from a central config file
- [ ] Add accessibility features to all components (labels, hints, screen reader support)g
- [ ] Add unit and integration tests

- [ ] add to feat.md: follow tdd writing unit tests for each feature with the requirements and testing against them as its implemented to make sure it works properly. all features should be well tested. i prefer react testing library/jest.

- [ ] write some descriptions for the tone of voice to use in chat responses. could be a setting! choose your coach.

- [ ] Update readme to give comprehensive overview of app

- [ ] better splash screen

- [ ] simplify ai prompt logic

- [ ] clear chat history dev mode doesn't seem to work. remove only from all dev mode options.

- [ ] better name

- [ ] make sure we're always referencing exercieses list dynamically.

- [ ] edit screen shoudlnt have recurring schedule creation like the create screen does

- [ ] remove unused code, imports, components, files, etc.

- [ ] determine what should be moved to a backend/api and what should stay in the react native app.

- [ ] make the suggestions in the intial chat message use similar chips to the suggestions chips and clickable to fill the text field just like the suggestions chips.

- add longer chat memory. make a profile of the user over time. use the data on the schedule and stats to inform profile. use this profile as info when coach gives suggestions. use this to inform the chat suggestion buttons.

- [ x ] clickable suggestions in chat. either a response to the last message or ideas for prompts. Pull workout examples. Make me a leg day workout. Make me a full body workout over 3 days. What can I do for recovery? How can I improve my nutrition? Make a bunch of these and always show random ones. I don't want too many to show in the ui... maybe like 3-5.
- add link to youtube search for workout term (open in app? open youtube app? probably youtube)
- long press copy messages in chat.
- weird thing in chat where it goes to next page
- add more things to settings
- instructions?

- dev mode delete this week view.. just like we did the create random this week. if its in view of the weekly view current screen/week.

- make sure the ai references to exercises come from exercise database

- get rid of 3 most common exercises.
- show 3 most common activity types. keep same title.

- move arrows for down to center with whole title

- look into best ux patterns for the settings cog

- component cleanup. make things more "reusable" smaller components. split things up.

- convert everythign to use arrow functions

- convert everything to use named exports over default. imports will also need to be fixed.

- update import pattern.
