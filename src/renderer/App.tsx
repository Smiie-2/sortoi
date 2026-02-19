import React, { useEffect, useState } from 'react';
import Layout from './components/Layout';
import SortView from './components/SortView';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';

function App() {
    const [version, setVersion] = useState<string>('...');
    const [config, setConfig] = useState<any>(null);
    const [activeView, setActiveView] = useState<string>('sort');

    useEffect(() => {
        window.electron.getAppVersion().then(setVersion);
        window.electron.getConfig().then(setConfig);
    }, []);

    const renderView = () => {
        switch (activeView) {
            case 'sort':
                return <SortView />;
            case 'history':
                return <HistoryView />;
            case 'settings':
                return <SettingsView />;
            default:
                return <div>View not found</div>;
        }
    };

    return (
        <Layout activeView={activeView} onViewChange={setActiveView}>
            {renderView()}

            <div style={{
                position: 'absolute',
                bottom: '2rem',
                right: '2rem',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)'
            }}>
                v{version}
            </div>
        </Layout>
    );
}

export default App;
