import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { CategorizedFile, ILLMClient, CategorizationOptions } from '../core/types.js';
import { generateObject } from 'ai';
import { z } from 'zod';
import logger from './Logger.js';

export class GeminiClient implements ILLMClient {
  private readonly googleAI;

  constructor(apiKey: string) {
    this.googleAI = createGoogleGenerativeAI({ apiKey });
  }

  async categorize(filePath: string, options: CategorizationOptions = {}): Promise<CategorizedFile> {
    try {
      const modelName = options.model || 'gemini-1.5-flash';
      const model = this.googleAI(modelName);

      logger.debug('Categorizing file with Gemini', { filePath, model: modelName });

      let prompt = `Categorize the following file based on its path: ${filePath}. Provide a main category and an optional, more specific subcategory.`;

      if (options.context) {
        prompt += `\nContext about the files being sorted: ${options.context}.`;
      }

      if (options.language) {
        prompt += `\nThe expected language of the content within the file is: ${options.language}.`;
      }

      if (options.preset) {
        prompt += `\nYou MUST follow this folder structure preset as strictly as possible:\n${options.preset}`;
      }

      const { object } = await generateObject({
        model,
        schema: z.object({
          category: z.string().describe('The main category for the file (e.g., "Documents", "Images", "Code").'),
          subcategory: z.string().optional().describe('A more specific subcategory (e.g., "Reports", "Screenshots", "JavaScript").'),
        }),
        prompt,
      });

      const result: CategorizedFile = {
        path: filePath,
        category: object.category,
      };

      if (object.subcategory) {
        result.subcategory = object.subcategory;
      }

      logger.debug('File categorized successfully', {
        filePath,
        category: result.category,
        subcategory: result.subcategory
      });

      return result;
    } catch (error) {
      // Log the actual error for debugging - include full details
      const errorDetails: Record<string, unknown> = {
        filePath,
        model: options.model || 'gemini-1.5-flash',
      };

      if (error instanceof Error) {
        errorDetails.error = error.message;
        errorDetails.stack = error.stack;
        // Many SDK errors have a 'cause' or 'data' property with the actual API response
        if ('cause' in error) errorDetails.cause = String(error.cause);
        if ('data' in error) errorDetails.data = (error as any).data;
        if ('status' in error) errorDetails.status = (error as any).status;
        if ('statusCode' in error) errorDetails.statusCode = (error as any).statusCode;
      }

      logger.error('Gemini API error', errorDetails);
      console.error(`\n🔍 GEMINI ERROR for ${filePath}:\n  Model: ${options.model || 'gemini-1.5-flash'}\n  Error: ${error instanceof Error ? error.message : String(error)}`);

      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Failed to categorize ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }
}

