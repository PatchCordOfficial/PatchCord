/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import {
    applyShareData,
    ApplyShareResult,
    buildCloudShareLink,
    buildShareData,
    decodeShareCode,
    downloadShareCode,
    encodeShareCode,
    getAllShareableCandidates,
    getShareablePlugins,
    PluginShareData,
    settings as pluginSharingSettings,
    uploadShareCode
} from "@api/PluginSharing";
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Notice } from "@components/Notice";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { copyWithToast } from "@utils/discord";
import { TextArea, useState } from "@webpack/common";

/* ─── SVG Icons ──────────────────────────────────────── */
function SvgUpload({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
    );
}

function SvgDownload({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    );
}

function SvgCloud({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        </svg>
    );
}

function SvgCopy({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    );
}

function SvgCheck({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function SvgWarning({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

/* ─── Utils ──────────────────────────────────────────── */
function toggleInSet(set: Set<string>, value: string): Set<string> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
}

function PluginCheckList({ names, selected, onToggle }: { names: string[]; selected: Set<string>; onToggle(name: string): void; }) {
    if (!names.length) {
        return <div className="vc-share-checklist-empty">No plugins to show.</div>;
    }

    return (
        <div className="vc-share-checklist">
            {names.map(name => (
                <div key={name} className="vc-share-checklist-item">
                    <FormSwitch
                        title={name}
                        value={selected.has(name)}
                        onChange={() => onToggle(name)}
                        hideBorder
                        className="vc-share-switch-compact"
                    />
                </div>
            ))}
        </div>
    );
}

/* ─── Guide Banner ───────────────────────────────────── */
function GuideBanner() {
    return (
        <div className="vc-share-guide">
            <div className="vc-share-guide-icon">
                <SvgCloud size={32} />
            </div>
            <div className="vc-share-guide-content">
                <h3>Quick Guide: Sharing Plugins</h3>
                <div className="vc-share-guide-steps">
                    <div className="vc-share-guide-step">
                        <span className="vc-share-step-num">1</span>
                        <span><b>Export:</b> Generate a code below and copy it. Turn on Cloud for a shorter link.</span>
                    </div>
                    <div className="vc-share-guide-step">
                        <span className="vc-share-step-num">2</span>
                        <span><b>Share:</b> Paste it in a DM. Alternatively, just type <code>/share plugins</code> in chat!</span>
                    </div>
                    <div className="vc-share-guide-step">
                        <span className="vc-share-step-num">3</span>
                        <span><b>Import:</b> Friends can paste your link into the Import tab here to instantly enable them.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Export Section ─────────────────────────────────── */
function ShareSection() {
    const shareablePlugins = getShareablePlugins();
    const [shareAll, setShareAll] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set(shareablePlugins));
    const [useCloud, setUseCloud] = useState(pluginSharingSettings.store.useCloud);
    const [generatedCode, setGeneratedCode] = useState("");
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    async function generate() {
        setError("");
        setGeneratedCode("");
        setCopied(false);

        const names = shareAll ? shareablePlugins : Array.from(selected);
        if (!names.length) {
            setError("Pick at least one plugin to share.");
            return;
        }

        const data = buildShareData(shareAll ? "all" : "specific", names);
        const code = encodeShareCode(data);

        if (!useCloud) {
            setGeneratedCode(code);
            return;
        }

        setGenerating(true);
        try {
            const id = await uploadShareCode(code);
            setGeneratedCode(buildCloudShareLink(id));
        } catch (e) {
            setError(`Cloud sharing failed (${(e as Error).message}). Showing the local code instead.`);
            setGeneratedCode(code);
        } finally {
            setGenerating(false);
        }
    }

    const handleCopy = () => {
        copyWithToast(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="vc-share-card">
            <div className="vc-share-card-header">
                <div className="vc-share-card-icon" style={{ background: "rgba(88,101,242,0.15)", color: "#7289da" }}>
                    <SvgUpload size={20} />
                </div>
                <div>
                    <h2>Export & Share</h2>
                    <p>Create a shareable link or code containing your current plugin setup.</p>
                </div>
            </div>

            <div className="vc-share-card-body">
                <div className="vc-share-controls">
                    <FormSwitch
                        title="Share all enabled plugins"
                        description="Turn off to hand-pick specific plugins instead"
                        value={shareAll}
                        onChange={setShareAll}
                        className="vc-share-switch-padded"
                    />

                    {!shareAll && (
                        <div className="vc-share-picker-box">
                            <h4>Select Plugins to Share</h4>
                            <PluginCheckList
                                names={getAllShareableCandidates()}
                                selected={selected}
                                onToggle={name => setSelected(s => toggleInSet(s, name))}
                            />
                        </div>
                    )}

                    <FormSwitch
                        title="Use PatchCord Cloud (Recommended)"
                        description="Generates a short, clean URL instead of a massive block of text."
                        value={useCloud}
                        onChange={v => {
                            setUseCloud(v);
                            pluginSharingSettings.store.useCloud = v;
                        }}
                        className="vc-share-switch-padded"
                    />
                </div>

                <div className="vc-share-action-row">
                    <Button size="medium" onClick={generate} disabled={generating}>
                        {generating ? "Generating..." : "Generate Share Code"}
                    </Button>
                </div>

                {error && <Notice.Warning className="vc-share-mt-16">{error}</Notice.Warning>}

                {generatedCode && (
                    <div className="vc-share-result-box">
                        <TextArea
                            value={generatedCode}
                            onChange={() => { }}
                            rows={3}
                            readOnly
                            className="vc-share-textarea"
                        />
                        <Button size="small" variant={copied ? "positive" : "primary"} onClick={handleCopy}>
                            <Flex gap="6px" align="center">
                                {copied ? <SvgCheck size={14} /> : <SvgCopy size={14} />}
                                {copied ? "Copied!" : "Copy Code"}
                            </Flex>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Import Section ─────────────────────────────────── */
function ImportSection() {
    const [input, setInput] = useState("");
    const [preview, setPreview] = useState<PluginShareData | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ApplyShareResult | null>(null);

    async function previewCode() {
        setError("");
        setResult(null);
        setPreview(null);

        const raw = input.trim();
        if (!raw) {
            setError("Please paste a share code or PatchCord Cloud link first.");
            return;
        }

        setLoading(true);
        try {
            const code = raw.startsWith("http") ? await downloadShareCode(raw) : raw;
            const data = decodeShareCode(code);

            if (!data.plugins.length) {
                setError("That share code doesn't contain any plugins.");
                return;
            }

            setPreview(data);
            setSelected(new Set(data.plugins));
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }

    function importPlugins(names: string[]) {
        if (!preview) return;
        setResult(applyShareData(preview, names));
    }

    return (
        <div className="vc-share-card">
            <div className="vc-share-card-header">
                <div className="vc-share-card-icon" style={{ background: "rgba(59,165,93,0.15)", color: "#3ba55d" }}>
                    <SvgDownload size={20} />
                </div>
                <div>
                    <h2>Import Plugins</h2>
                    <p>Paste a code or PatchCord Cloud link below to apply someone else's setup.</p>
                </div>
            </div>

            <div className="vc-share-card-body">
                <TextArea
                    value={input}
                    onChange={setInput}
                    placeholder="Paste code or https://patchcord.itssolar.dev/cloud/..."
                    rows={2}
                    className="vc-share-textarea"
                />

                <div className="vc-share-action-row vc-share-mt-12">
                    <Button size="medium" onClick={previewCode} disabled={loading || !input.trim()}>
                        {loading ? "Loading..." : "Preview Plugins"}
                    </Button>
                </div>

                {error && <Notice.Warning className="vc-share-mt-16">{error}</Notice.Warning>}

                {preview && (
                    <div className="vc-share-import-preview">
                        <h4>Found {preview.plugins.length} plugin{preview.plugins.length === 1 ? "" : "s"}</h4>
                        <p>Choose which plugins you want to enable from this pack:</p>

                        <div className="vc-share-picker-box">
                            <PluginCheckList
                                names={preview.plugins}
                                selected={selected}
                                onToggle={name => setSelected(s => toggleInSet(s, name))}
                            />
                        </div>

                        <Flex gap="10px" className="vc-share-mt-16">
                            <Button size="small" variant="secondary" onClick={() => setSelected(new Set(preview.plugins))}>
                                Select All
                            </Button>
                            <Button size="small" variant="primary" onClick={() => importPlugins(Array.from(selected))} disabled={!selected.size}>
                                Apply {selected.size} Plugins
                            </Button>
                        </Flex>
                    </div>
                )}

                {result && (
                    <div className="vc-share-result-summary">
                        {result.enabled.length > 0 && <div className="vc-share-result-item success"><SvgCheck size={14} /> Enabled: {result.enabled.join(", ")}</div>}
                        {result.alreadyEnabled.length > 0 && <div className="vc-share-result-item info"><span className="vc-share-dot" /> Already enabled: {result.alreadyEnabled.join(", ")}</div>}
                        {result.missing.length > 0 && <div className="vc-share-result-item warning"><SvgWarning size={14} /> Not found: {result.missing.join(", ")}</div>}
                        {result.restartNeeded && (
                            <Notice.Warning className="vc-share-mt-12">
                                Restart PatchCord to fully apply these changes.
                            </Notice.Warning>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Main Component ─────────────────────────────────── */
function SharePluginsTab() {
    return (
        <SettingsTab>
            <div className="vc-share-root">
                <GuideBanner />
                <div className="vc-share-split">
                    <ShareSection />
                    <ImportSection />
                </div>
            </div>
        </SettingsTab>
    );
}

export default wrapTab(SharePluginsTab, "Share Plugins");
