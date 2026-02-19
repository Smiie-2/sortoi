import React, { useState, useEffect } from 'react';
import { History, Undo, Check, AlertTriangle, Calendar, FileText } from 'lucide-react';

const HistoryView: React.FC = () => {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [rollingBack, setRollingBack] = useState<string | null>(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await window.electron.getHistory();
            // Sort sessions by date descending
            const sorted = data.sort((a: any, b: any) =>
                new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
            );
            setSessions(sorted);
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRollback = async (sessionId: string) => {
        if (!confirm('Are you sure you want to rollback this session? All files will be moved back to their original locations.')) {
            return;
        }

        setRollingBack(sessionId);
        try {
            const result = await window.electron.rollbackSession(sessionId);
            if (result.success) {
                alert(`Successfully rolled back ${result.operationsReverted} operations!`);
                loadHistory();
            } else {
                alert('Rollback completed with some errors. See logs for details.');
                loadHistory();
            }
        } catch (error) {
            console.error('Rollback failed', error);
            alert('Rollback failed. Check console for details.');
        } finally {
            setRollingBack(null);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading history...</div>;

    return (
        <div className="history-view">
            <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }} className="glow-text">Activity History</h2>

            {sessions.length === 0 ? (
                <div style={{
                    padding: '4rem',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '24px',
                    border: '1px solid var(--border-glass)'
                }}>
                    <History size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p style={{ color: 'var(--text-secondary)' }}>No sorting sessions found yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {sessions.map((session) => (
                        <div key={session.sessionId} className="glass" style={{
                            padding: '1.5rem',
                            borderRadius: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            border: session.rolledBack ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-glass)',
                            opacity: session.rolledBack ? 0.7 : 1
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{
                                        background: session.rolledBack ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 211, 238, 0.1)',
                                        padding: '10px',
                                        borderRadius: '12px'
                                    }}>
                                        {session.rolledBack ? <Undo size={24} color="#ef4444" /> : <History size={24} color="var(--accent-primary)" />}
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                                            {session.rolledBack ? 'Rolled Back Session' : 'File Organization Session'}
                                        </h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Calendar size={14} />
                                                {new Date(session.startTime).toLocaleString()}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <FileText size={14} />
                                                {session.operations.length} operations
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {!session.rolledBack && (
                                    <button
                                        onClick={() => handleRollback(session.sessionId)}
                                        disabled={rollingBack === session.sessionId}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            color: '#ef4444',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                    >
                                        {rollingBack === session.sessionId ? 'Rolling back...' : (
                                            <>
                                                <Undo size={14} />
                                                Rollback
                                            </>
                                        )}
                                    </button>
                                )}

                                {session.rolledBack && (
                                    <div style={{
                                        color: '#ef4444',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: '8px'
                                    }}>
                                        <Undo size={14} />
                                        REVERTED
                                    </div>
                                )}
                            </div>

                            {/* Operations Preview (Simple list of first 3) */}
                            <div style={{
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '8px',
                                padding: '0.75rem',
                                fontSize: '0.8rem'
                            }}>
                                {session.operations.slice(0, 3).map((op: any, i: number) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: i < 2 ? '0.4rem' : 0 }}>
                                        <Check size={12} color="var(--accent-primary)" />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {op.sourcePath?.split(/[\\/]/).pop()} → {op.destinationPath?.split(/[\\/]/).pop()}
                                        </span>
                                    </div>
                                ))}
                                {session.operations.length > 3 && (
                                    <div style={{ color: 'var(--text-secondary)', paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                                        + {session.operations.length - 3} more operations
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HistoryView;
