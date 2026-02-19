import Store from 'electron-store';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AppConfig {
    apiKey: string;
    model: string;
    concurrency: number;
    presets: Record<string, string>;
    theme: 'dark' | 'light';
}

const schema = {
    apiKey: {
        type: 'string',
        default: '',
    },
    model: {
        type: 'string',
        default: 'gemini-1.5-flash',
    },
    concurrency: {
        type: 'number',
        default: 5,
        minimum: 1,
        maximum: 20,
    },
    presets: {
        type: 'object',
        default: {
            'Default': 'Organize into categories like Documents, Images, Videos, etc.',
            'Project-based': 'Organize files based on related project names or themes.',
        },
    },
    theme: {
        type: 'string',
        enum: ['dark', 'light'],
        default: 'dark',
    },
} as const;

export class ConfigurationService {
    private store: Store<AppConfig>;

    constructor() {
        this.store = new Store<AppConfig>({ schema });
        this.migrateFromEnv();
    }

    private migrateFromEnv() {
        // Only migrate if store is empty or key is missing
        if (!this.store.get('apiKey')) {
            // Try to find .env in project root or relative to dist
            const envPaths = [
                path.join(process.cwd(), '.env'),
                path.join(__dirname, '../../.env'),
                path.join(__dirname, '../../../.env'),
            ];

            for (const envPath of envPaths) {
                if (fs.existsSync(envPath)) {
                    const envConfig = dotenv.parse(fs.readFileSync(envPath));
                    if (envConfig.GOOGLE_GENERATIVE_AI_API_KEY) {
                        this.store.set('apiKey', envConfig.GOOGLE_GENERATIVE_AI_API_KEY);
                        console.log(`Migrated API key from ${envPath}`);
                        break;
                    }
                }
            }
        }
    }

    getConfig(): AppConfig {
        return this.store.store;
    }

    get<K extends keyof AppConfig>(key: K): AppConfig[K] {
        return this.store.get(key);
    }

    set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
        this.store.set(key, value);
    }

    reset(): void {
        this.store.clear();
    }
}
