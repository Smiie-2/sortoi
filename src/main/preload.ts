import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getConfig: () => ipcRenderer.invoke('get-config'),
    setConfigValue: (key: string, value: any) => ipcRenderer.invoke('set-config-value', key, value),
    resetConfig: () => ipcRenderer.invoke('reset-config'),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    analyzeDirectory: (directory: string, options: any) => ipcRenderer.invoke('analyze-directory', directory, options),
    organizeFiles: (directory: string, files: any[]) => ipcRenderer.invoke('organize-files', directory, files),
    onProgress: (callback: any) => ipcRenderer.on('progress-update', (_event, data) => callback(data)),
    getHistory: () => ipcRenderer.invoke('get-history'),
    rollbackSession: (sessionId: string) => ipcRenderer.invoke('rollback-session', sessionId),
});
