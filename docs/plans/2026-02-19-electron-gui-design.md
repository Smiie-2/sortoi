# Sortoi Electron GUI Design

## Overview
This document outlines the design for the graphical user interface (GUI) of Sortoi, transforming it from a CLI-only tool to a full-featured desktop application. The GUI will leverage Electron to provide a premium, user-friendly experience for file organization while maintaining the core logic and clean architecture of the original project.

## Architecture
Wait for it... we're using **Clean Architecture** as our guiding principle.

### Components
1.  **Main Process (Electron Backend)**: 
    *   Manages application lifecycle.
    *   Handles file system operations.
    *   Interfaces with existing `src/core` and `src/infrastructure` modules.
    *   Exposes secure IPC channels for the Renderer process.
2.  **Preload Script**: 
    *   Acts as a secure bridge between the Main and Renderer processes.
    *   Exposes a limited `window.electronAPI` to the frontend using `contextBridge`.
3.  **Renderer Process (Frontend)**:
    *   Built with **React** and **TypeScript**.
    *   Styled with **Vanilla CSS** (following premium design guidelines).
    *   Handles user interaction, state management (UI-only), and data visualization.

### Data Flow
- **Configuration**: Swapping `.env` for `electron-store` for persistent user settings.
- **Communication**: Inter-Process Communication (IPC) for all system actions (scaling, analyzing, moving).
- **Updates**: Real-time progress updates from Main to Renderer during sorting sessions.

## User Experience

### Layout
- **Sidebar**: Sticky persistent navigation on the left.
- **Main Canvas**: Flexible area for switching between "Sort", "History", and "Settings" views.

### Key Views
1.  **Sort View (Primary)**:
    *   Visual folder selector (drag-and-drop support).
    *   **Context Hints**: Input field for user-provided context.
    *   **Folder Structure Preset**: Per-session input to override defaults.
    *   **Preview Stage**: Interactive table with checkboxes to selectively apply proposed moves.
    *   **Progress Dashboard**: Progress bars and live tickers for active jobs.
2.  **History Explorer**:
    *   Visual table showing past sessions (ID, Date, Count, Status).
    *   "Rollback" button to undo specific sessions via `Infrastructure/HistoryRollback`.
3.  **Settings Editor**:
    *   Secure input for Google Gemini API Key.
    *   Dropdown for Gemini Model selection.
    *   Language preference selection (Auto/English/Swedish).

## Security
- **Sandboxing**: Renderer process will be sandboxed.
- **No Direct Access**: The UI will never directly call `fs` or `child_process`.
- **Key Storage**: API keys will be stored locally in the application's secure data path.

## Design Aesthetic
- **Color Palette**: Dark mode base (#0f172a) with Slate Blue (#1e293b) cards.
- **Accents**: Cyan-to-Indigo gradients for primary actions (#38bdf8 to #818cf8).
- **Typography**: Inter (Google Fonts).
- **Interactions**: Glassmorphism on overlays, smooth CSS transitions (0.2s cubic-bezier), and subtle hover state scaling.

## Success Criteria
- [ ] Users can select a folder and get a move-map preview within the GUI.
- [ ] Users can provide custom context and presets per session.
- [ ] Users can selectively apply or skip specific move recommendations.
- [ ] Past sessions are visible and can be rolled back with one click.
- [ ] Configuration (API keys, models) can be managed without terminal access.
