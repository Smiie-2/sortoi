import React, { useEffect, useState } from 'react';

function App() {
    const [version, setVersion] = useState<string>('Loading...');
    const [config, setConfig] = useState<any>(null);

    useEffect(() => {
        window.electron.getAppVersion().then(setVersion);
        window.electron.getConfig().then(setConfig);
    }, []);

    const maskedApiKey = config?.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'Not set';

    return (
        <div className="app">
            <h1>Sortoi GUI</h1>
            <p>Project initialization complete.</p>
            <p>Version: {version}</p>
            <p>API Key: {maskedApiKey}</p>
            {config && (
                <div style={{ marginTop: '20px', textAlign: 'left' }}>
                    <h3>Config:</h3>
                    <pre>{JSON.stringify({ ...config, apiKey: '********' }, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}

export default App;
