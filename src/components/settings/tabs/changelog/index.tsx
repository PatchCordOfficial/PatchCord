/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { React, UserStore } from "@webpack/common";

import {
    ChangelogHistory,
    clearIndividualLog,
    formatTimestamp,
    getChangelogHistory,
    initializeChangelog,
} from "./changelogManager";

/* ─── Constants ──────────────────────────────────────── */
const AUTHOR_DISCORD_ID = "864612087741546527";
const AUTHOR_DISPLAY = "itssolar.dev";

/* ─── SVG Icon Components ────────────────────────────── */
function SvgClipboard({ size = 20 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="4" rx="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <line x1="9" y1="12" x2="15" y2="12" />
            <line x1="9" y1="16" x2="13" y2="16" />
        </svg>
    );
}

function SvgGitCommit({ size = 14 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <line x1="1.05" y1="12" x2="7" y2="12" />
            <line x1="17.01" y1="12" x2="22.96" y2="12" />
        </svg>
    );
}

function SvgPlus({ size = 11 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 11H13V5a1 1 0 0 0-2 0v6H5a1 1 0 0 0 0 2h6v6a1 1 0 0 0 2 0v-6h6a1 1 0 0 0 0-2Z" />
        </svg>
    );
}

function SvgWrench({ size = 11 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.7 7.3a1 1 0 0 0-1.4 0l-1.6 1.6-1.4-1.4 1.6-1.6a1 1 0 0 0-1.4-1.4C14.8 5.8 14 8 14.7 10l-9 9a1 1 0 0 0 0 1.4l1.4 1.4a1 1 0 0 0 1.4 0l9-9c2 .7 4.2-.1 5.5-1.8a1 1 0 0 0-.3-1.7Z" />
        </svg>
    );
}

function SvgTrash({ size = 11 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 6h-5V4.33A2.33 2.33 0 0 0 13.67 2h-3.34A2.33 2.33 0 0 0 8 4.33V6H3a1 1 0 0 0 0 2h1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8h1a1 1 0 0 0 0-2ZM10 4.33c0-.18.15-.33.33-.33h3.34c.18 0 .33.15.33.33V6h-4V4.33ZM17 19a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8h10v11Z" />
        </svg>
    );
}

function SvgMinus({ size = 11 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 11h14a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
        </svg>
    );
}

function SvgWarning({ size = 11 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M23 19a2.38 2.38 0 0 1-2 3H3a2.38 2.38 0 0 1-2-3L10 3a2.35 2.35 0 0 1 4 0ZM12 9a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0v-4a1 1 0 0 0-1-1Zm1.5 9a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
        </svg>
    );
}

function SvgDiamond({ size = 10 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2 2 9l10 13L22 9Z" />
        </svg>
    );
}

function SvgSparkle({ size = 13 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
    );
}

function SvgRefreshCw({ size = 13 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
    );
}

function SvgInbox({ size = 40 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
    );
}

function SvgPlugin({ size = 13 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z" />
        </svg>
    );
}

function SvgChevronDown({ size = 14 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.3 9.3a1 1 0 0 1 1.4 0l5.3 5.29 5.3-5.3a1 1 0 1 1 1.4 1.42l-6 6a1 1 0 0 1-1.4 0l-6-6a1 1 0 0 1 0-1.42Z" />
        </svg>
    );
}

function SvgX({ size = 10 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
    );
}

/* ─── Commit Type Detection ───────────────────────────── */
type CommitType = "addition" | "fix" | "removal" | "crash" | "other";

function detectCommitType(msg: string): CommitType {
    const t = msg.toLowerCase();
    if (/crash|crashes|crashfix|crash fix|crash-/.test(t)) return "crash";
    if (/\b(add|added|addition|introduce|introduces|new|feat|implement)\b/.test(t)) return "addition";
    if (/\b(fix|fixed|fixes|bugfix|bug fix|patch|resolve|resolves|correct)\b/.test(t)) return "fix";
    if (/\b(remove|removed|remov(al)?|delete|deleted|deprecated|drop)\b/.test(t)) return "removal";
    return "other";
}

const TYPE_CONFIG: Record<CommitType, { label: string; color: string; bg: string; Icon: () => JSX.Element; }> = {
    addition: { label: "Added",   color: "#3ba55d", bg: "rgba(59,165,93,0.13)",  Icon: () => <SvgPlus /> },
    fix:      { label: "Fixed",   color: "#5865f2", bg: "rgba(88,101,242,0.13)", Icon: () => <SvgWrench /> },
    removal:  { label: "Removed", color: "#ed4245", bg: "rgba(237,66,69,0.13)",  Icon: () => <SvgMinus /> },
    crash:    { label: "Crash",   color: "#faa61a", bg: "rgba(250,166,26,0.13)", Icon: () => <SvgWarning /> },
    other:    { label: "Misc",    color: "#b5bac1", bg: "rgba(181,186,193,0.09)", Icon: () => <SvgDiamond /> },
};

/* ─── Sub-components ─────────────────────────────────── */
function TypeBadge({ type }: { type: CommitType; }) {
    const cfg = TYPE_CONFIG[type];
    return (
        <span
            className="vc-cl2-type-badge"
            style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: `${cfg.color}40` }}
        >
            <cfg.Icon />
            {cfg.label}
        </span>
    );
}

function AuthorChip() {
    const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

    React.useEffect(() => {
        try {
            const user = UserStore.getUser(AUTHOR_DISCORD_ID);
            if (user?.getAvatarURL) {
                setAvatarUrl(user.getAvatarURL(undefined, 64, true));
            }
        } catch {
            // user not cached — leave null
        }
    }, []);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        const url = `https://discord.com/users/${AUTHOR_DISCORD_ID}`;
        try { VencordNative.native.openExternal(url); } catch { window.open(url, "_blank"); }
    };

    return (
        <span className="vc-cl2-author-chip" onClick={handleClick} title={`Discord ID: ${AUTHOR_DISCORD_ID}`}>
            {avatarUrl
                ? <img className="vc-cl2-author-avatar" src={avatarUrl} alt={AUTHOR_DISPLAY} />
                : (
                    <span className="vc-cl2-author-avatar-fallback">
                        {AUTHOR_DISPLAY[0].toUpperCase()}
                    </span>
                )
            }
            <span className="vc-cl2-author-name">{AUTHOR_DISPLAY}</span>
            <span className="vc-cl2-author-arrow">→</span>
            <span className="vc-cl2-author-id">{AUTHOR_DISCORD_ID}</span>
        </span>
    );
}

function CommitRow({ hash, message, author, index }: {
    hash: string;
    message: string;
    author?: string;
    index: number;
}) {
    const type = detectCommitType(message);
    const shortHash = hash.length > 7 ? hash.slice(0, 7) : hash;

    return (
        <div className="vc-cl2-commit-row" style={{ animationDelay: `${index * 35}ms` }}>
            <div className="vc-cl2-commit-left">
                <TypeBadge type={type} />
                <code className="vc-cl2-commit-hash">{shortHash}</code>
            </div>
            <div className="vc-cl2-commit-body">
                <span className="vc-cl2-commit-message" style={{ color: TYPE_CONFIG[type].color }}>
                    {message}
                </span>
                {author && (
                    <span className="vc-cl2-commit-author">
                        {author === "itssolardev" || author === "itssolar.dev"
                            ? AUTHOR_DISPLAY
                            : author}
                    </span>
                )}
            </div>
        </div>
    );
}

function SessionCard({ log, index, onDelete }: {
    log: ChangelogHistory[number];
    index: number;
    onDelete: (id: string) => void;
}) {
    const [expanded, setExpanded] = React.useState(index === 0);

    const fromShort = log.fromHash === "unknown" ? "initial" : log.fromHash.slice(0, 7);
    const toShort = log.toHash.slice(0, 7);
    const hasContent = log.commits.length > 0 || log.newPlugins.length > 0 || log.updatedPlugins.length > 0;

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await clearIndividualLog(log.id);
        onDelete(log.id);
    };

    return (
        <div
            className={`vc-cl2-session ${expanded ? "expanded" : ""}`}
            style={{ animationDelay: `${index * 55}ms` }}
        >
            <div
                className="vc-cl2-session-header"
                onClick={() => setExpanded(v => !v)}
                role="button"
                aria-expanded={expanded}
            >
                <div className="vc-cl2-session-header-left">
                    <span className="vc-cl2-session-indicator" />
                    <div className="vc-cl2-session-meta">
                        <span className="vc-cl2-session-time">{formatTimestamp(log.timestamp)}</span>
                        <div className="vc-cl2-session-hashes">
                            <code className="vc-cl2-hash-chip from">{fromShort}</code>
                            <span className="vc-cl2-hash-arrow">→</span>
                            <code className="vc-cl2-hash-chip to">{toShort}</code>
                        </div>
                    </div>
                </div>

                <div className="vc-cl2-session-header-right">
                    {log.commits.length > 0 && (
                        <span className="vc-cl2-count-badge commits">
                            <SvgGitCommit size={11} />
                            {log.commits.length}
                        </span>
                    )}
                    {log.newPlugins.length > 0 && (
                        <span className="vc-cl2-count-badge new-plugins">
                            <SvgPlugin size={11} />
                            {log.newPlugins.length}
                        </span>
                    )}
                    <button
                        className="vc-cl2-delete-btn"
                        onClick={handleDelete}
                        title="Remove this entry"
                        aria-label="Delete log entry"
                    >
                        <SvgX size={10} />
                    </button>
                    <span className={`vc-cl2-chevron ${expanded ? "up" : ""}`}>
                        <SvgChevronDown size={14} />
                    </span>
                </div>
            </div>

            {expanded && hasContent && (
                <div className="vc-cl2-session-body">
                    {log.commits.length > 0 && (
                        <div className="vc-cl2-section">
                            <div className="vc-cl2-section-title">
                                <SvgGitCommit size={13} />
                                Commits
                            </div>
                            <div className="vc-cl2-commit-list">
                                {log.commits.map((c, i) => (
                                    <CommitRow key={c.hash} hash={c.hash} message={c.message} author={c.author} index={i} />
                                ))}
                            </div>
                        </div>
                    )}

                    {log.newPlugins.length > 0 && (
                        <div className="vc-cl2-section">
                            <div className="vc-cl2-section-title" style={{ color: "#3ba55d" }}>
                                <SvgPlugin size={13} />
                                New Plugins
                            </div>
                            <div className="vc-cl2-plugin-tags">
                                {log.newPlugins.map(p => (
                                    <span key={p} className="vc-cl2-plugin-tag new">{p}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {log.updatedPlugins.length > 0 && (
                        <div className="vc-cl2-section">
                            <div className="vc-cl2-section-title" style={{ color: "#5865f2" }}>
                                <SvgRefreshCw size={13} />
                                Updated Plugins
                            </div>
                            <div className="vc-cl2-plugin-tags">
                                {log.updatedPlugins.map(p => (
                                    <span key={p} className="vc-cl2-plugin-tag updated">{p}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function LoadingState() {
    return (
        <div className="vc-cl2-loading">
            <div className="vc-cl2-loading-spinner" />
            <span>Loading changelog…</span>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="vc-cl2-empty">
            <span className="vc-cl2-empty-icon">
                <SvgInbox size={40} />
            </span>
            <div className="vc-cl2-empty-text">No changelog history yet</div>
            <div className="vc-cl2-empty-sub">Entries will appear here after your first update.</div>
        </div>
    );
}

/* ─── Main Component ─────────────────────────────────── */
function ChangelogContent() {
    const [history, setHistory] = React.useState<ChangelogHistory>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const init = async () => {
            try {
                await initializeChangelog();
                setHistory(await getChangelogHistory());
            } catch (err) {
                console.error("Failed to initialize changelog:", err);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const handleDelete = React.useCallback((id: string) => {
        setHistory(prev => prev.filter(l => l.id !== id));
    }, []);

    return (
        <div className="vc-cl2-root">
            {/* Hero */}
            <div className="vc-cl2-hero">
                <span className="vc-cl2-hero-icon">
                    <SvgClipboard size={22} />
                </span>
                <div className="vc-cl2-hero-text">
                    <div className="vc-cl2-hero-title">Changelog</div>
                    <div className="vc-cl2-hero-sub">Recent update sessions, commits and plugin changes for PatchCord</div>
                </div>
                <AuthorChip />
            </div>

            {/* Body */}
            {isLoading ? (
                <LoadingState />
            ) : history.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="vc-cl2-session-list">
                    {history.map((log, i) => (
                        <SessionCard key={log.id} log={log} index={i} onDelete={handleDelete} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ChangelogTab() {
    return (
        <SettingsTab>
            <ChangelogContent />
        </SettingsTab>
    );
}

export default wrapTab(ChangelogTab, "Changelog");
