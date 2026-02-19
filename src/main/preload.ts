import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getConfig: () => ipcRenderer.invoke('get-config'),
    setConfigValue: (key: string, value: any) => ipcRenderer.invoke('set-config-value', key, value),
    resetConfig: () => ipcRenderer.invoke('reset-config'),
});
