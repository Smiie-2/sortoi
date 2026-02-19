import React, { useEffect, useState } from 'react';

function App() {
    const [version, setVersion] = useState<string>('Loading...');

    useEffect(() => {
        window.electron.getAppVersion().then(setVersion);
    }, []);

    return (
        <div className="app">
            <h1>Sortoi GUI</h1>
            <p>Project initialization complete.</p>
            <p>Version: {version}</p>
        </div>
    );
}

export default App;
