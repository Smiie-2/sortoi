import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, ShieldCheck, Cpu, Layers } from 'lucide-react';

const SettingsView: React.FC = () => {
    const [config, setConfig] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        window.electron.getConfig().then(setConfig);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            for (const [key, value] of Object.entries(config)) {
                await window.electron.setConfigValue(key, value);
            }
            setMessage({ text: 'Settings saved successfully!', type: 'success' });
        } catch (error) {
            setMessage({ text: 'Failed to save settings.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (confirm('Are you sure you want to reset all settings to default?')) {
            const newConfig = await window.electron.resetConfig();
            setConfig(newConfig);
            setMessage({ text: 'Settings reset to default.', type: 'success' });
        }
    };

    if (!config) return <div style={{ padding: '2rem' }}>Loading settings...</div>;

    return (
        <div className="settings-view">
            <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }} className="glow-text">Settings</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px' }}>

                {/* API Key Section */}
                <section className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <ShieldCheck size={24} color="var(--accent-primary)" />
                        <h3 style={{ fontSize: '1.25rem' }}>AI Authentication</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Google Gemini API Key</label>
                        <input
                            type="password"
                            value={config.apiKey}
                            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-glass)',
                                borderRadius: '8px',
                                padding: '0.75rem 1rem',
                                color: 'white',
                                fontSize: '1rem',
                                width: '100%',
                                outline: 'none'
                            }}
                            placeholder="Paste your API key here..."
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Your key is stored locally and never shared.
                        </p>
                    </div>
                </section>

                {/* Model Section */}
                <section className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Cpu size={24} color="var(--accent-primary)" />
                        <h3 style={{ fontSize: '1.25rem' }}>Model Configuration</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>AI Model</label>
                            <select
                                value={config.model}
                                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                style={{
                                    background: '#1e293b',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fastest)</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Most Capable)</option>
                                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Concurrency</label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={config.concurrency}
                                onChange={(e) => setConfig({ ...config, concurrency: parseInt(e.target.value) })}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    color: 'white'
                                }}
                            />
                        </div>
                    </div>
                </section>

                {/* Presets Section */}
                <section className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Layers size={24} color="var(--accent-primary)" />
                        <h3 style={{ fontSize: '1.25rem' }}>Category Presets</h3>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Define how the AI should interpret your organization style.
                    </p>

                    {Object.entries(config.presets).map(([name, instruction]: [string, any], idx) => (
                        <div key={idx} style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{name} Preset</span>
                            <textarea
                                value={instruction}
                                onChange={(e) => {
                                    const newPresets = { ...config.presets, [name]: e.target.value };
                                    setConfig({ ...config, presets: newPresets });
                                }}
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    color: 'white',
                                    minHeight: '60px',
                                    resize: 'vertical',
                                    fontSize: '0.85rem'
                                }}
                            />
                        </div>
                    ))}
                </section>

                {message && (
                    <div style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        background: message.type === 'success' ? 'rgba(34, 211, 238, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${message.type === 'success' ? 'var(--accent-neon)' : '#ef4444'}`,
                        color: message.type === 'success' ? 'var(--accent-neon)' : '#ef4444',
                        fontSize: '0.9rem',
                        textAlign: 'center'
                    }}>
                        {message.text}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>

                    <button
                        onClick={handleReset}
                        style={{
                            flex: 0.4,
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'var(--text-secondary)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <RotateCcw size={18} />
                        Reset Defaults
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
