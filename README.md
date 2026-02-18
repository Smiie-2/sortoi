# 🤖 Sortoi — Enhanced Edition

> The intelligent AI file organizer you actually have control over.

Sortoi is an AI-powered CLI tool that uses Google Gemini to automatically categorize and organize your files. This fork adds significant power-user features, deeper customization, and a refined interactive workflow compared to the original version.

---

## ✨ What's New in This Fork?

This version of Sortoi has been significantly enhanced to give users more control over how the AI perceives and organizes their files.

### 🌎 Language Support
*   **English & Swedish Support**: Specifically optimized for Swedish and English file names.
*   **Auto-detection**: Smartly detects the primary language of your files to ensure the AI understands the semantic meaning of your documents.

### 🧠 Advanced Model Selection
Choose exactly which brain you want to use for categorization:
*   **Gemini 2.0 Flash**: The default balance of speed and intelligence.
*   **Gemini 2.0 Flash-Lite**: Optimized for extreme speed and low cost.
*   **Gemini 2.5 Flash**: Higher reasoning capabilities for complex file sets.
*   **Gemini 2.5 Pro**: The ultimate model for deep document understanding.

### 🎯 Deep Context Injection
Tell the AI exactly what these files are! You can now provide **context** (e.g., "These are university course materials from 2023" or "These are raw unedited vacation photos from Italy") to guide the categorization logic.

### 📁 Custom Folder Structures
Don't settle for the standard "Category/Subcategory" layout. You can now define a **Folder Structure Preset** (e.g., `Year/Project/Filetype`) directly in the prompts, and the AI will adapt its categorization to fit your personal workflow.

### 🛡️ Refined Preview Mode
*   **Visual Move Map**: See exactly where every file is going with the new `source → destination` mapping.
*   **Apply After Preview**: You no longer have to quit and restart in "Live" mode. Once you see the preview and like it, just hit `Y` to apply the changes immediately.

### 🔍 Pro Debugging
*   Enhanced error logs capture full API responses (Status Codes, Cause, Data), helping you diagnose API key or quota issues with precision.

---

## 🚀 Quick Start

### 1. Requirements
*   **Node.js 18+**
*   **Google AI API Key** — Get one for free at [Google AI Studio](https://aistudio.google.com/app/apikey)

### 2. Setup
```bash
git clone https://github.com/Smiie-2/Sortoi.git
cd Sortoi/sortoi
pnpm install
pnpm run build
```

### 3. Run
Launch the guided experience:
```bash
pnpm run dev
```

---

## 🛠 Usage Options

### Interactive Mode (Recommended)
Simply run `sortoi` (or `pnpm run dev`) and follow the beautiful, color-coded prompts.

### CLI Flags (Advanced)
Directly control Sortoi from your terminal:
```bash
sortoi [directory] [options]

Options:
  -l, --language <lang>    Specify "English", "Swedish", or "Auto"
  -m, --model <name>       Gemini model name (e.g., gemini-2.0-flash)
  -c, --context <context>  Provide context about your files
  -p, --preset <structure> Define desired folder structure (e.g. "Year/Subject/Type")
  --dry-run                Preview proposed moves without applying them
```

### Rollback & History
Made a mistake? Every session is tracked.
```bash
pnpm history list                   # View past organization sessions
pnpm history rollback <session-id>  # Undo a specific session perfectly
```

---

## 🏗 Architecture
This project is built on **Clean Architecture** principles, ensuring that the core logic is divorced from the implementation details. 

*   **Core**: Domain logic, types, and the Categorization orchestrator.
*   **App**: CLI and Interactive prompt handlers.
*   **Infrastructure**: Gemini API Client, File Scanner, SQLite Cache, and History Rollback.

*For a deep dive into the technical structure, see [ARCHITECTURE.md](./docs/ARCHITECTURE.md).*

---

## 📄 Credits
*   **Original Creator**: [Miluska Romero](https://github.com/Milumon)
*   **Enhanced Fork**: [Smiie-2](https://github.com/Smiie-2)

---

## ⚖️ License
Licensed under the **MIT License**. Use it, fork it, make your files happy.