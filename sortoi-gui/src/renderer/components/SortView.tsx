import React, { useState, useEffect } from 'react';
import { FolderOpen, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const SortView: React.FC = () => {
    const [directory, setDirectory] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [organizing, setOrganizing] = useState(false);
    const [complete, setComplete] = useState(false);

    useEffect(() => {
        window.electron.onProgress((data: any) => {
            if (data.type === 'start') setProgress({ current: 0, total: data.total });
            if (data.type === 'increment') setProgress(prev => ({ ...prev, current: prev.current + 1 }));
            if (data.type === 'update') setProgress(prev => ({ ...prev, current: data.current }));
        });
    }, []);

    const handleSelectDirectory = async () => {
        const path = await window.electron.selectDirectory();
        if (path) {
            setDirectory(path);
            setResults([]);
            setComplete(false);
        }
    };

    const handleAnalyze = async () => {
        if (!directory) return;
        setAnalyzing(true);
        setResults([]);
        try {
            const data = await window.electron.analyzeDirectory(directory);
            setResults(data);
        } catch (error) {
            console.error('Analysis failed', error);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleOrganize = async () => {
        if (!directory || results.length === 0) return;
        setOrganizing(true);
        try {
            await window.electron.organizeFiles(directory, results);
            setComplete(true);
        } catch (error) {
            console.error('Organization failed', error);
        } finally {
            setOrganizing(false);
        }
    };

    return (
        <div className="sort-view">
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }} className="glow-text">Smart Sort</h2>

            {!directory ? (
                <div
                    onClick={handleSelectDirectory}
                    style={{
                        border: '2px dashed var(--border-glass)',
                        borderRadius: '16px',
                        padding: '4rem 2rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: 'rgba(255,255,255,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-glass)'}
                >
                    <FolderOpen size={48} color="var(--accent-primary)" />
                    <div>
                        <p style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.25rem' }}>Select a folder to organize</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Or drag and drop a directory here</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{
                        padding: '1rem 1.5rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid var(--border-glass)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <FolderOpen size={20} color="var(--accent-primary)" />
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{directory}</span>
                        </div>
                        <button
                            onClick={handleSelectDirectory}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            Change
                        </button>
                    </div>

                    {!analyzing && results.length === 0 && (
                        <button
                            className="btn-primary"
                            onClick={handleAnalyze}
                            style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
                        >
                            <Play size={20} fill="white" />
                            Start Analysis
                        </button>
                    )}

                    {analyzing && (
                        <div style={{
                            padding: '2rem',
                            textAlign: 'center',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-glass)'
                        }}>
                            <Loader2 size={40} className="spinner" style={{ marginBottom: '1rem', color: 'var(--accent-primary)', animation: 'spin 2s linear infinite' }} />
                            <p style={{ fontWeight: 500, marginBottom: '1.5rem' }}>Analyzing files with AI...</p>

                            {progress.total > 0 && (
                                <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                        <span>Progress</span>
                                        <span>{progress.current} / {progress.total}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${(progress.current / progress.total) * 100}%`,
                                            height: '100%',
                                            background: 'var(--accent-primary)',
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {results.length > 0 && !complete && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="glass" style={{ maxHeight: '400px', overflowY: 'auto', borderRadius: '12px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-glass)' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '1rem' }}>File Name</th>
                                            <th style={{ textAlign: 'left', padding: '1rem' }}>Suggested Category</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((file, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '0.75rem 1rem' }}>{file.path.split(/[\\/]/).pop()}</td>
                                                <td style={{ padding: '0.75rem 1rem', color: 'var(--accent-primary)' }}>
                                                    {file.category}{file.subcategory ? ` / ${file.subcategory}` : ''}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                className="btn-primary"
                                onClick={handleOrganize}
                                disabled={organizing}
                                style={{ padding: '1rem', marginTop: '1rem' }}
                            >
                                {organizing ? 'Organizing...' : 'Execute Organization'}
                            </button>
                        </div>
                    )}

                    {complete && (
                        <div style={{
                            padding: '3rem',
                            textAlign: 'center',
                            background: 'rgba(34, 211, 238, 0.05)',
                            borderRadius: '24px',
                            border: '1px solid var(--accent-neon)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem'
                        }}>
                            <CheckCircle2 size={64} color="var(--accent-neon)" />
                            <h3 style={{ fontSize: '1.5rem' }}>Organization Complete!</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                {results.length} files have been successfully categorized and moved.
                            </p>
                            <button
                                onClick={() => { setDirectory(null); setResults([]); setComplete(false); }}
                                style={{ marginTop: '1rem', background: 'transparent', border: '1px solid var(--accent-neon)', color: 'var(--accent-neon)', padding: '0.5rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                Start New Session
                            </button>
                        </div>
                    )}
                </div>
            )}

            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default SortView;
