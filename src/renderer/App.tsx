import React, { useEffect, useState } from 'react';
import Layout from './components/Layout';

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
                return (
                    <div>
                        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }} className="glow-text">Smart Sort</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                            Upload a folder to begin organizing your files with AI-powered categorization.
                        </p>

                        <div style={{
                            border: '2px dashed var(--border-glass)',
                            borderRadius: '16px',
                            padding: '4rem 2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s'
                        }}>
                            <p style={{ color: 'var(--text-secondary)' }}>Click to select a directory or drag and drop here</p>
                        </div>
                    </div>
                );
            case 'history':
                return (
                    <div>
                        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }} className="glow-text">History</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>Your recent sorting sessions and rollbacks will appear here.</p>
                    </div>
                );
            case 'settings':
                return (
                    <div>
                        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }} className="glow-text">Settings</h2>
                        <div style={{ marginTop: '2rem' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Model</label>
                                <div style={{
                                    padding: '0.75rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-glass)'
                                }}>
                                    {config?.model || 'Loading...'}
                                </div>
                            </div>
                        </div>
                    </div>
                );
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
