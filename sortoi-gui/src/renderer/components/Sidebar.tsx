import React from 'react';
import { LayoutGrid, History, Settings, Zap } from 'lucide-react';

interface SidebarProps {
    activeView: string;
    onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
    const menuItems = [
        { id: 'sort', label: 'Sort Files', icon: LayoutGrid },
        { id: 'history', label: 'History', icon: History },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="sidebar" style={{
            width: 'var(--sidebar-width)',
            height: '100vh',
            background: 'var(--bg-sidebar)',
            padding: '2rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--border-glass)'
        }}>
            <div className="logo" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '3rem',
                padding: '0 0.5rem'
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    padding: '8px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Zap size={24} color="white" fill="white" />
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
                    Sort<span style={{ color: 'var(--accent-primary)' }}>oi</span>
                </h1>
            </div>

            <nav style={{ flex: 1 }}>
                <ul style={{ listStyle: 'none' }}>
                    {menuItems.map((item) => (
                        <li key={item.id} style={{ marginBottom: '0.5rem' }}>
                            <button
                                onClick={() => onViewChange(item.id)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: activeView === item.id ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                    color: activeView === item.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontSize: '0.95rem',
                                    fontWeight: 500,
                                    textAlign: 'left'
                                }}
                            >
                                <item.icon size={20} />
                                {item.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="footer" style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                <p>© 2026 Sortoi v1.0.1</p>
            </div>
        </div>
    );
};

export default Sidebar;
