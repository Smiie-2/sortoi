import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConfigurationService } from './ConfigurationService.js';
import {
    FileScanner,
    GeminiClient,
    CategorizationService,
    ConflictResolver,
    FileOrganizer,
    HistoryService,
    ConsoleOutput,
    ConflictStrategy
} from '@sortoi/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
const configService = new ConfigurationService();

// Mock output to avoid terminal flooding but we could redirect to a separate log
const silentOutput = new ConsoleOutput();

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#0f172a',
    });

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('get-config', () => {
    return configService.getConfig();
});

ipcMain.handle('set-config-value', (_event, key: string, value: any) => {
    configService.set(key as any, value);
    return true;
});

ipcMain.handle('reset-config', () => {
    configService.reset();
    return configService.getConfig();
});

ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

ipcMain.handle('analyze-directory', async (_event, directory: string, options: any) => {
    const apiKey = configService.get('apiKey');
    const model = configService.get('model');

    const fileScanner = new FileScanner();
    const llmClient = new GeminiClient(apiKey);
    const userDataPath = app.getPath('userData');
    const historyService = new HistoryService(path.join(userDataPath, 'history'));
    const conflictResolver = new ConflictResolver();
    const fileOrganizer = new FileOrganizer(conflictResolver, historyService);

    const progressReporter = {
        start: (total: number) => mainWindow?.webContents.send('progress-update', { type: 'start', total }),
        update: (current: number) => mainWindow?.webContents.send('progress-update', { type: 'update', current }),
        increment: () => mainWindow?.webContents.send('progress-update', { type: 'increment' }),
        stop: () => mainWindow?.webContents.send('progress-update', { type: 'stop' }),
    };

    const categorizer = new CategorizationService(
        fileScanner,
        llmClient,
        silentOutput,
        progressReporter,
        fileOrganizer
    );

    return await categorizer.categorizeDirectory(directory, {
        categorizationOptions: {
            ...options,
            model: options?.model || model
        }
    });
});

ipcMain.handle('organize-files', async (_event, directory: string, categorizedFiles: any[]) => {
    const userDataPath = app.getPath('userData');
    const historyService = new HistoryService(path.join(userDataPath, 'history'));
    const conflictResolver = new ConflictResolver();
    const fileOrganizer = new FileOrganizer(conflictResolver, historyService);

    await historyService.load();
    const sessionId = historyService.startSession();

    const results = await fileOrganizer.organize(
        directory,
        categorizedFiles,
        ConflictStrategy.RENAME,
        false,
        sessionId
    );

    historyService.endSession(sessionId);
    await historyService.save();

    return results;
});

ipcMain.handle('get-history', async () => {
    const userDataPath = app.getPath('userData');
    const historyService = new HistoryService(path.join(userDataPath, 'history'));
    await historyService.load();
    return historyService.getAllSessions();
});

ipcMain.handle('rollback-session', async (_event, sessionId: string) => {
    const userDataPath = app.getPath('userData');
    const historyService = new HistoryService(path.join(userDataPath, 'history'));
    await historyService.load();
    const result = await historyService.rollback(sessionId);
    await historyService.save();
    return result;
});
