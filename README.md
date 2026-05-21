# Mnemo

**English** | [中文](#中文)

A vocabulary learning app built with React Native and Expo. Mnemo uses spaced repetition to help you retain words in a foreign language, with a calm and minimal interface designed to keep you focused on the content.

---

## Features

### Spaced Repetition (SM-2)
Words are scheduled for review based on how well you know them. After each session you rate every word — *don't know*, *vague*, or *know* — and the next review date is calculated automatically. Words you struggle with come back sooner; words you know well are spaced further apart. The algorithm also tracks lapses and adjusts difficulty over time.

### Multiple Languages
Supports German, French, Spanish, Italian, Japanese, Korean, Portuguese, Russian, and English. Each language is fully isolated: its own word list, word groups, and daily review queue. Switching languages in Settings instantly updates the entire experience.

### Daily Word Limit
Set a cap on how many words appear in each review session (presets: 5, 10, 20, 30, 50, or a custom number). When there are more due words than the limit, Mnemo prioritises the ones that are most overdue or that you have historically found hardest.

### Word List
Browse your full vocabulary sorted alphabetically. Each entry shows the word, its first example sentence in italics, and the definition. A colour-coded dot marks the grammatical gender of gendered words. Tap to edit; long-press to delete.

- **Search** — filter by word or definition in real time.
- **Word groups** — organise words into named collections. The carousel at the top slides between groups with a depth animation; the active group is always centred. Long-press a group tab to delete it.
- **Multiple senses** — a single word can hold multiple part-of-speech entries, each with its own definition and example sentence.
- **AI example sentences** — generate a contextual example sentence via the DeepSeek API when adding or editing a word.

### Study Mode
Cards are shown one at a time. Tap to reveal the answer, then rate your recall. Progress is persisted after every card so a session can be resumed if interrupted.

### Home Screen
Shows the language name and a literary quote in your target language. A prompt indicates how many words are due today. Tap anywhere to jump straight into the review session.

### Backup and Restore
Export the entire word database — words and groups — to a JSON file. Import it on another device to restore everything. The import is additive: existing words are never overwritten.

### LinguaAI Integration
Words saved in [LinguaAI](https://github.com/LumineTraveller/LinguaAI) can be exported and imported into Mnemo using the standard *Import Backup* button. LinguaAI exports in Mnemo's native backup format, so no separate import step is needed.

### Appearance
- Light and dark themes, toggled in Settings.
- The system status bar and Android navigation bar auto-hide after 3.5 seconds of inactivity on any screen, and reappear on the next touch.
- The bottom tab bar follows the same rhythm — it slides down after the same delay and slides back up on activity.

---

## Tech Stack

| | |
|---|---|
| Framework | React Native 0.81 (New Architecture) |
| Build toolchain | Expo SDK 54 |
| Navigation | React Navigation 7 — Material Top Tabs + Native Stack |
| Storage | AsyncStorage |
| AI | DeepSeek API |
| Fonts | Lora via `expo-google-fonts` |

---

## Getting Started

```bash
npm install
npx expo start
```

Scan the QR code in Expo Go, or press `a` / `i` to open an emulator. To use AI example sentence generation, add your DeepSeek API key under **Settings → AI**.

---
---

# 中文

[English](#mnemo) | **中文**

Mnemo 是一款基于 React Native 和 Expo 构建的外语词汇学习应用，采用间隔重复算法帮助你长期记忆单词，界面简洁克制，让注意力始终集中在内容本身。

---

## 功能介绍

### 间隔重复（SM-2 算法）
每次复习结束后，你对每个单词进行评分——**不认识**、**有印象**、**认识**——系统据此自动计算下次复习时间。掌握程度越差的单词越快再次出现，掌握得越好的单词间隔越长。算法同时追踪遗忘次数，随时间动态调整难度。

### 多语言支持
支持德语、法语、西班牙语、意大利语、日语、韩语、葡萄牙语、俄语和英语。每种语言完全独立，拥有各自的单词库、分组和每日复习队列。在设置中切换语言，整个界面立即响应。

### 每日词量上限
可以为每次复习设定单词数量上限（预设值：5、10、20、30、50，或自定义数字）。当到期单词超过上限时，Mnemo 优先安排最逾期或历史上最容易出错的单词。

### 单词本
按字母顺序浏览全部词汇。每条记录显示单词、斜体例句和释义。有语法性别的语言（如德语）会用彩色小圆点标注阴/阳/中性。单击进入编辑，长按删除。

- **搜索** — 按单词或释义实时过滤。
- **分组** — 将单词整理进命名分组。顶部走马灯以景深动画切换，当前分组始终居中显示；长按分组标签可删除该分组。
- **多义项** — 同一个单词可以记录多个词性条目，每条有独立的释义和例句。
- **AI 例句** — 添加或编辑单词时，一键调用 DeepSeek API 生成语境例句。

### 学习模式
单词卡片逐张展示，点击翻面后评分作答。每张卡片完成后立即保存进度，中途退出下次可继续。

### 主页
显示当前学习语言的名称及一段该语言的文学引言，并提示今日待复习单词数。点击任意位置直接跳转至复习环节。

### 数据备份与恢复
将全部单词和分组导出为 JSON 文件，可随时保存或分享。在另一台设备上导入即可还原数据。导入为合并模式，已有单词不会被覆盖。

### LinguaAI 联动
在 [LinguaAI](https://github.com/LumineTraveller/LinguaAI) 中收录的生词可以通过 Mnemo 的标准**导入备份**按钮直接导入，两者使用相同的备份格式，无需任何额外转换步骤。

### 外观
- 深色/浅色主题，在设置中一键切换。
- 任意界面静止 3.5 秒后，系统状态栏与 Android 导航栏自动隐藏；触摸屏幕后恢复显示。
- 底部标签栏与系统栏保持同步节奏——相同延迟后滑出，有操作时滑回。

---

## 技术栈

| | |
|---|---|
| 框架 | React Native 0.81（新架构已启用） |
| 构建工具 | Expo SDK 54 |
| 导航 | React Navigation 7 — Material Top Tabs + Native Stack |
| 本地存储 | AsyncStorage |
| AI 接口 | DeepSeek API |
| 字体 | Lora（`expo-google-fonts`） |

---

## 快速开始

```bash
npm install
npx expo start
```

用 Expo Go 扫描二维码，或按 `a` / `i` 启动模拟器。如需使用 AI 例句生成功能，请在**设置 → AI 连接**中填入你的 DeepSeek API Key。
