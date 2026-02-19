# @sortoi/core

The engine behind Sortoi. This package contains the core AI categorization logic, file system utilities, and the CLI interface.

## Features

- AI-powered file categorization using Google Gemini.
- Intelligent file scanning and organization.
- Robust history and rollback system.
- Secure path validation and security checks.

## Usage

As a CLI tool:

```bash
pnpm run dev -- [directory] [options]
```

Or as a library:

```typescript
import { CategorizationService } from '@sortoi/core';
```
