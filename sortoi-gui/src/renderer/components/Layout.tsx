import React from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
    children: React.ReactNode;
    activeView: string;
    onViewChange: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange }) => {
    return (
        <div className="layout" style={{ display: 'flex', height: '100vh', width: '100vw' }}>
            <Sidebar activeView={activeView} onViewChange={onViewChange} />

            <main style={{
                flex: 1,
                padding: '2rem',
                overflowY: 'auto',
                background: 'var(--bg-main)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div className="glass" style={{
                    flex: 1,
                    borderRadius: '24px',
                    padding: '2rem',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
