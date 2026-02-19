export interface IElectronAPI {
    getAppVersion: () => Promise<string>;
    getConfig: () => Promise<any>;
    setConfigValue: (key: string, value: any) => Promise<boolean>;
    resetConfig: () => Promise<any>;
    selectDirectory: () => Promise<string | null>;
    analyzeDirectory: (directory: string, categorizationOptions?: any) => Promise<any[]>;
    organizeFiles: (directory: string, categorizedFiles: any[]) => Promise<any>;
    onProgress: (callback: (data: any) => void) => void;
}

declare global {
    interface Window {
        electron: IElectronAPI;
    }
}
