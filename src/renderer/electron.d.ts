export interface IElectronAPI {
    getAppVersion: () => Promise<string>;
}

declare global {
    interface Window {
        electron: IElectronAPI;
    }
}
