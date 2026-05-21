# Mnemo

A vocabulary learning app built with React Native and Expo. Mnemo uses spaced repetition to help you retain words in a foreign language, with a calm and minimal interface designed to keep you focused on the content.

---

## Features

### Spaced Repetition (SM-2)
Words are scheduled for review based on how well you know them. After each session, you rate every word — *don't know*, *vague*, or *know* — and the next review date is calculated automatically. Words you struggle with come back sooner; words you know well are spaced further apart. The algorithm also tracks lapses and adjusts difficulty accordingly.

### Multiple Languages
Supports German, French, Spanish, Italian, Japanese, Korean, Portuguese, Russian, and English. Each language is kept separate: its own word list, its own word groups, and its own daily review queue. Switching languages in Settings instantly updates the entire experience.

### Daily Word Limit
Set a cap on how many words appear in each review session (presets: 5, 10, 20, 30, 50, or a custom number). When there are more due words than the limit, Mnemo prioritises the ones that are most overdue or that you have historically found hardest.

### Word List
Browse your full vocabulary, sorted alphabetically. Each entry shows the word, its first example sentence in italics, and the definition below. A gender dot (colour-coded for masculine/feminine/neuter) sits beside gendered words. Tap any entry to edit it; long-press to delete.

- **Search** — filter the list by word or definition in real time.
- **Word groups** — organise words into named collections (long-press a group tab to delete it). The carousel at the top slides between groups with a depth animation; the selected group is always centred.
- **Add words** — manually enter a word, part of speech, gender, definition, and example sentence. Multiple senses per word are supported.
- **AI example sentences** — generate a contextual example sentence via the DeepSeek API with one tap when adding or editing a word.

### Study Mode
Cards are shown one at a time. Tap to reveal the answer; swipe or tap a rating button to move on. Progress is saved after every card so a session can be resumed if interrupted.

### Home Screen
Displays the language name and a short literary quote in the language you are studying. A subtle prompt shows how many words are due for today. Tap anywhere to jump straight into the review session.

### Backup and Restore
Export the entire word database (words + groups) to a JSON file that can be shared or stored anywhere. Import the same file on another device to restore everything. The import is additive — words that already exist are skipped.

### LinguaAI Integration
Words saved in [LinguaAI](#) can be exported and imported directly into Mnemo using the standard *Import Backup* button. LinguaAI exports in Mnemo's native backup format (version 2), so no separate import step or format conversion is needed.

### Appearance
- Light and dark themes, toggled in Settings.
- The system status bar and Android navigation bar auto-hide after 3.5 seconds of inactivity on any screen, and reappear on the next touch.
- The bottom tab bar follows the same rhythm — it slides down after the same delay and slides back up on activity.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native 0.81 (New Architecture enabled) |
| Build toolchain | Expo SDK 54 |
| Navigation | React Navigation 7 — Material Top Tabs + Native Stack |
| Storage | AsyncStorage |
| AI | DeepSeek API (example sentence generation) |
| Fonts | Lora (Google Fonts via `expo-google-fonts`) |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npx expo start
```

Scan the QR code in Expo Go, or press `a` to open an Android emulator / `i` for the iOS simulator.

To use AI-generated example sentences, add your DeepSeek API key in **Settings → AI**.

---

## Related

**[LinguaAI](https://github.com/LumineTraveller/LinguaAI)** — a web app for reading AI-generated articles in a foreign language. Words saved to LinguaAI's vocabulary notebook can be exported and imported into Mnemo.
