export const ERROR_CODES = {
  API_KEY_NOT_FOUND: {
    code: 'E001',
    message: 'API Key not found. Please run in interactive mode first to configure it: `sortoi --interactive`',
  },
  DIRECTORY_NOT_PROVIDED: {
    code: 'E002',
    message: 'Please provide a directory to sort. Use --help for more information.',
  },
  INTERACTIVE_JSON_UNSUPPORTED: {
    code: 'E003',
    message: 'JSON output mode is not available in interactive mode.',
  },
  UNEXPECTED_ERROR: {
    code: 'E999',
    message: 'An unexpected error occurred during execution.',
  },
};

export class SortoiError extends Error {
  public readonly code: string;

  constructor(errorCode: keyof typeof ERROR_CODES, originalError?: any) {
    const errorInfo = ERROR_CODES[errorCode];
    let message = `[${errorInfo.code}] ${errorInfo.message}`;
    if (originalError) {
      const errorMessage = originalError instanceof Error ? originalError.message : String(originalError);
      message += `\n  Original error: ${errorMessage}`;
    }
    
    super(message);
    this.name = 'SortoiError';
    this.code = errorInfo.code;
  }
}

export class CategorizationError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly reason: 'network' | 'invalid_file' | 'api_limit' | 'auth' | 'api_error' | 'unknown',
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'CategorizationError';
  }
}