export interface IElectronAPI {
    getAppVersion: () => Promise<string>;
    getConfig: () => Promise<any>;
    setConfigValue: (key: string, value: any) => Promise<boolean>;
    resetConfig: () => Promise<any>;
}

declare global {
    interface Window {
        electron: IElectronAPI;
    }
}
