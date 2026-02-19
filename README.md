# 🤖 Sortoi — Enhanced Edition

> The intelligent AI file organizer you actually have control over. Now with a Desktop GUI!

Sortoi is an AI-powered file organization suite that uses Google Gemini to automatically categorize and organize your files. This version features both a powerful **CLI** for terminal users and a modern **Desktop GUI** for a more visual experience.

---

## ✨ Key Features

### 🖥️ Modern Desktop GUI
*   **Visual Organization**: Drag and drop (coming soon) or select directories to analyze.
*   **Interactive Preview**: See exactly where your files will go before they move.
*   **Easy Configuration**: Manage your API keys and model settings through a clean interface.

### 🌎 Language Support
*   **English & Swedish Support**: Specifically optimized for Swedish and English file names.
*   **Auto-detection**: Smartly detects the primary language of your files to ensure the AI understands the semantic meaning of your documents.

### 🧠 Advanced Model Selection
Choose exactly which brain you want to use for categorization:
*   **Gemini 2.0 Flash**: The default balance of speed and intelligence.
*   **Gemini 2.0 Flash-Lite**: Optimized for extreme speed and low cost.
*   **Gemini 2.5 Pro**: The ultimate model for deep document understanding.

### 🎯 Deep Context Injection
Tell the AI exactly what these files are! You can now provide **context** (e.g., "These are university course materials from 2023") to guide the categorization logic.

---

## 🚀 Quick Start

### 1. Requirements
*   **Node.js 18+**
*   **pnpm 8+**
*   **Google AI API Key** — Get one for free at [Google AI Studio](https://aistudio.google.com/app/apikey)

### 2. Setup
```bash
git clone https://github.com/Smiie-2/Sortoi.git
cd Sortoi
pnpm install
pnpm run build
```

### 3. Run

#### 🖼️ Desktop GUI (Recommended)
Launch the visual experience:
```bash
pnpm run gui:dev
```

#### 💻 CLI Mode
Launch the guided terminal experience:
```bash
pnpm run cli:dev
```

---

## 🛠 Project Structure

This is a monorepo managed with `pnpm` workspaces:

*   `packages/core`: The brain of Sortoi. Contains the AI logic, file scanner, and CLI.
*   `sortoi-gui`: The Electron-based desktop application.

---

## 🏗 Architecture
This project is built on **Clean Architecture** principles, ensuring that the core logic is divorced from the implementation details. 

*For a deep dive into the technical structure, see [ARCHITECTURE.md](./docs/ARCHITECTURE.md).*

---

## 📄 Credits
*   **Original Creator**: [Miluska Romero](https://github.com/Milumon)
*   **Enhanced Fork**: [Smiie-2](https://github.com/Smiie-2)

---

## ⚖️ License
Licensed under the **MIT License**. Use it, fork it, make your files happy.
