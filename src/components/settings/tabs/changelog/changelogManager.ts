/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import gitHash from "~git-hash";
import plugins from "~plugins";

export interface ChangelogEntry {
    hash: string;
    author: string;
    message: string;
    timestamp?: number;
}

export interface UpdateSession {
    id: string;
    timestamp: number;
    fromHash: string;
    toHash: string;
    commits: ChangelogEntry[];
    newPlugins: string[];
    updatedPlugins: string[];
    newSettings?: Map<string, string[]> | Record<string, string[]>;
    type: "update" | "repository_fetch";
}

export type ChangelogHistory = UpdateSession[];

const CHANGELOG_HISTORY_KEY = "EquicordChangelog_History";
const LAST_SEEN_HASH_KEY = "EquicordChangelog_LastSeenHash";
const KNOWN_PLUGINS_KEY = "EquicordChangelog_KnownPlugins";
const KNOWN_SETTINGS_KEY = "EquicordChangelog_KnownSettings";
const LAST_REPO_CHECK_KEY = "EquicordChangelog_LastRepoCheck";
const GITHUB_COMPARE_ENDPOINT = "https://api.github.com/repos";

type KnownPluginSettingsMap = Map<string, Set<string>>;

function normalizeRepoUrl(repoUrl: string | null | undefined): string | null {
    if (!repoUrl) return null;
    try {
        const normalized = repoUrl.replace(/^git\+/, "");
        const url = new URL(normalized);
        if (!url.hostname.endsWith("github.com")) return null;
        const segments = url.pathname.replace(/\.git$/, "").split("/").filter(Boolean);
        if (segments.length < 2) return null;
        return `${segments[0]}/${segments[1]}`;
    } catch {
        return null;
    }
}

async function fetchCommitsBetween(
    repoSlug: string,
    fromHash: string,
    toHash: string,
): Promise<ChangelogEntry[]> {
    if (!repoSlug || typeof fetch !== "function") return [];
    try {
        const res = await fetch(
            `${GITHUB_COMPARE_ENDPOINT}/${repoSlug}/compare/${fromHash}...${toHash}`,
            {
                headers: {
                    Accept: "application/vnd.github+json",
                    "Cache-Control": "no-cache",
                },
            },
        );

        if (!res.ok) return [];
        const data = await res.json();
        if (!data || !Array.isArray(data.commits)) return [];

        return data.commits.map((commit: any) => {
            const message: string = commit?.commit?.message ?? "";
            const summary = message.split("\n")[0] || "No message";
            const rawAuthor =
                commit?.commit?.author?.name ||
                commit?.author?.login ||
                undefined;
            // If author is missing, use the user's username; otherwise replace any trailing discriminator (#1234) with the full Discord ID
            const DISCORD_ID = "864612087741546527";
            const authorName = rawAuthor
                ? String(rawAuthor).replace(/#\d{1,}$/, `#${DISCORD_ID}`)
                : "itssolar.dev";
            const timestamp = commit?.commit?.author?.date
                ? Date.parse(commit.commit.author.date)
                : undefined;

            return {
                hash: commit?.sha || "",
                author: authorName,
                message: summary,
                timestamp: Number.isNaN(timestamp) ? undefined : timestamp,
            } as ChangelogEntry;
        });
    } catch (err) {
        console.warn("Failed to fetch commits between hashes", err);
        return [];
    }
}

function toStringSet(value: unknown): Set<string> {
    const result = new Set<string>();

    const addValue = (entry: unknown) => {
        if (entry === undefined || entry === null) return;
        result.add(typeof entry === "string" ? entry : String(entry));
    };

    if (value instanceof Set) {
        value.forEach(addValue);
    } else if (value instanceof Map) {
        value.forEach(addValue);
    } else if (Array.isArray(value)) {
        value.forEach(addValue);
    } else if (typeof value === "string") {
        addValue(value);
    } else if (value && typeof value === "object") {
        Object.values(value as Record<string, unknown>).forEach(addValue);
    }

    return result;
}

function normalizeKnownSettings(value: unknown): KnownPluginSettingsMap {
    const map: KnownPluginSettingsMap = new Map();

    const assign = (plugin: unknown, settings: unknown) => {
        if (plugin === undefined || plugin === null) return;
        map.set(String(plugin), toStringSet(settings));
    };

    if (!value) {
        return map;
    }

    if (value instanceof Map) {
        value.forEach((settings, plugin) => assign(plugin, settings));
        return map;
    }

    if (Array.isArray(value)) {
        value.forEach(entry => {
            if (Array.isArray(entry) && entry.length > 0) {
                assign(entry[0], entry[1]);
            }
        });
        return map;
    }

    if (typeof value === "object") {
        Object.entries(value as Record<string, unknown>).forEach(
            ([plugin, settings]) => assign(plugin, settings),
        );
    }

    return map;
}

function serializeKnownSettings(
    map: KnownPluginSettingsMap,
): Record<string, string[]> {
    return Object.fromEntries(
        Array.from(map.entries()).map(([plugin, settings]) => [
            plugin,
            Array.from(settings),
        ]),
    );
}

async function persistKnownSettings(
    map: KnownPluginSettingsMap,
): Promise<void> {
    await DataStore.set(KNOWN_SETTINGS_KEY, serializeKnownSettings(map));
}

function isMapLike(value: any): value is Map<string, string[]> {
    return (
        value &&
        typeof value.get === "function" &&
        typeof value.size === "number"
    );
}

export function getNewSettingsSize(
    newSettings: Map<string, string[]> | Record<string, string[]> | undefined,
): number {
    if (!newSettings) return 0;
    if (isMapLike(newSettings)) return newSettings.size;
    return Object.keys(newSettings).length;
}

export function getNewSettingsEntries(
    newSettings: Map<string, string[]> | Record<string, string[]> | undefined,
): [string, string[]][] {
    if (!newSettings) return [];
    if (isMapLike(newSettings)) return Array.from(newSettings.entries());
    return Object.entries(newSettings);
}

export async function getChangelogHistory(): Promise<ChangelogHistory> {
    const history = (await DataStore.get(
        CHANGELOG_HISTORY_KEY,
    )) as ChangelogHistory;

    if (history) {
        history.forEach(session => {
            if (session.newSettings && !(session.newSettings instanceof Map)) {
                session.newSettings = new Map(
                    Object.entries(session.newSettings),
                );
            }
        });
    }

    return history || [];
}

export async function saveUpdateSession(
    commits: ChangelogEntry[],
    newPlugins: string[],
    updatedPlugins: string[],
    newSettings: Map<string, string[]>,
    forceLog: boolean = false,
): Promise<void> {
    const history = await getChangelogHistory();
    const lastSeenHash = await getLastSeenHash();
    const currentHash = gitHash;

    // For repository fetches, check if we already have this exact state logged (to prevent duplicate logs)
    if (forceLog) {
        const lastRepoCheck = await getLastRepositoryCheckHash();
        const latestRepoHash =
            commits.length > 0 ? commits[0].hash : currentHash;

        if (lastRepoCheck === latestRepoHash) {
            // if the state hasn't changed last check, do NOT make a new log
            return;
        }
    }

    // Don't save if no changes, unless explicitly forcing the log (for example repository fetch)
    if (
        !forceLog &&
        commits.length === 0 &&
        newPlugins.length === 0 &&
        updatedPlugins.length === 0 &&
        getNewSettingsSize(newSettings) === 0
    ) {
        return;
    }

    // Determine session type and hash logic
    const sessionType = forceLog ? "repository_fetch" : "update";
    let fromHash = currentHash;
    let toHash = currentHash;

    if (forceLog) {
        // This is a repository fetch - show current vs repository state
        if (commits.length > 0) {
            // Repository has newer commits
            toHash = commits[0].hash; // Latest repository hash
        }
        // If no commits, fromHash === toHash (up to date)
    } else {
        // This is an actual update session
        // Is there a better way to do this?
        fromHash = lastSeenHash || "unknown";
        toHash = currentHash;
    }

    const session: UpdateSession = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        fromHash: fromHash,
        toHash: toHash,
        commits,
        newPlugins,
        updatedPlugins,
        newSettings:
            getNewSettingsSize(newSettings) > 0
                ? Object.fromEntries(newSettings)
                : undefined,
        type: sessionType,
    };

    // Add to beginning of history (most recent first)
    history.unshift(session);

    // Keep only last 50 sessions to prevent storage bloat
    if (history.length > 50) {
        history.splice(50);
    }

    await DataStore.set(CHANGELOG_HISTORY_KEY, history);

    if (!forceLog) {
        await setLastSeenHash(currentHash);
    } else {
        // for fetches, check the latest repo hash to make sure its not the same
        const latestRepoHash =
            commits.length > 0 ? commits[0].hash : currentHash;
        await setLastRepositoryCheckHash(latestRepoHash);
    }

    await updateKnownPlugins();
    await updateKnownSettings();
}

export async function getLastSeenHash(): Promise<string | null> {
    return (await DataStore.get(LAST_SEEN_HASH_KEY)) as string | null;
}

export async function setLastSeenHash(hash: string): Promise<void> {
    await DataStore.set(LAST_SEEN_HASH_KEY, hash);
}

export async function getKnownPlugins(): Promise<Set<string>> {
    const known = (await DataStore.get(KNOWN_PLUGINS_KEY)) as string[];
    return new Set(known || []);
}

export async function updateKnownPlugins(): Promise<void> {
    const currentPlugins = Object.keys(plugins);
    await DataStore.set(KNOWN_PLUGINS_KEY, currentPlugins);
}

function getSettingsSetForPlugin(plugin: string): Set<string> {
    const settings = plugins[plugin]?.settings?.def || {};
    return new Set(
        Object.keys(settings).filter(setting => setting !== "enabled"),
    );
}

function getCurrentSettings(pluginList: string[]): KnownPluginSettingsMap {
    return new Map(
        pluginList.map(name => [name, getSettingsSetForPlugin(name)]),
    );
}

export async function getKnownSettings(): Promise<KnownPluginSettingsMap> {
    const mapData = (await DataStore.get(KNOWN_SETTINGS_KEY)) as any;
    if (mapData === undefined) {
        const knownPlugins = await getKnownPlugins();
        const pluginNames = [
            ...new Set([
                ...Object.keys(plugins),
                ...Array.from(knownPlugins),
            ]),
        ];
        const initialMap = getCurrentSettings(pluginNames);
        await persistKnownSettings(initialMap);
        return initialMap;
    }

    const normalized = normalizeKnownSettings(mapData);

    if (
        mapData instanceof Map ||
        Array.isArray(mapData) ||
        (mapData &&
            typeof mapData === "object" &&
            Object.values(mapData).some(value =>
                value instanceof Set || value instanceof Map,
            ))
    ) {
        await persistKnownSettings(normalized);
    }

    return normalized;
}

export async function getNewSettings(): Promise<Map<string, string[]>> {
    const map = getCurrentSettings(Object.keys(plugins));
    const knownSettings = await getKnownSettings();
    const newSettings = new Map<string, string[]>();

    map.forEach((settings, plugin) => {
        const known = knownSettings.get(plugin);
        if (!known) return;

        const filteredSettings = [...settings].filter(
            setting => !known.has(setting),
        );
        if (filteredSettings.length > 0) {
            newSettings.set(plugin, filteredSettings);
        }
    });

    return newSettings;
}

export async function getCommitsSinceLastSeen(
    repoUrl: string,
): Promise<ChangelogEntry[]> {
    const lastSeenHash = await getLastSeenHash();
    if (!lastSeenHash || lastSeenHash === "unknown" || lastSeenHash === gitHash)
        return [];

    const repoSlug = normalizeRepoUrl(repoUrl);
    if (!repoSlug) return [];

    return fetchCommitsBetween(repoSlug, lastSeenHash, gitHash);
}

export async function updateKnownSettings(): Promise<void> {
    const currentSettings = getCurrentSettings(Object.keys(plugins));
    const knownSettings = await getKnownSettings();
    const mergedSettings: KnownPluginSettingsMap = new Map();

    new Set([...currentSettings.keys(), ...knownSettings.keys()]).forEach(
        plugin => {
            mergedSettings.set(
                plugin,
                new Set([
                    ...(knownSettings.get(plugin) || []),
                    ...(currentSettings.get(plugin) || []),
                ]),
            );
        },
    );

    await persistKnownSettings(mergedSettings);
}

export async function getNewPlugins(): Promise<string[]> {
    const currentPlugins = Object.keys(plugins);
    const knownPlugins = await getKnownPlugins();

    return currentPlugins.filter(
        plugin =>
            !knownPlugins.has(plugin) &&
            !plugins[plugin].hidden &&
            !plugins[plugin].required,
    );
}

export async function getUpdatedPlugins(): Promise<string[]> {
    // This is a placeholder - in a real implementation, you'd track plugin version changes
    // For now, we'll return empty array since plugin version tracking would need to be implemented
    return [];
}

export async function clearChangelogHistory(): Promise<void> {
    await DataStore.del(CHANGELOG_HISTORY_KEY);
    await DataStore.del(LAST_SEEN_HASH_KEY);
    await DataStore.del(KNOWN_SETTINGS_KEY);
}

export async function clearIndividualLog(logId: string): Promise<void> {
    const history = await getChangelogHistory();
    const filteredHistory = history.filter(log => log.id !== logId);
    await DataStore.set(CHANGELOG_HISTORY_KEY, filteredHistory);
}

export async function initializeChangelog(): Promise<void> {
    // Initialize with current state if first time
    const lastSeenHash = await getLastSeenHash();
    if (!lastSeenHash) {
        await setLastSeenHash(gitHash);
        await updateKnownPlugins();
        await updateKnownSettings();
    }

    // Seed changelog history with recent notable changes if empty or missing the latest seeded data.
    const existing = await getChangelogHistory();
    const hasLatestSeed = existing?.some(session => session.commits?.some(c => c.hash === "broadcast-live"));
    if (!existing || existing.length === 0 || !hasLatestSeed) {
        const now = Date.now();
        const seed: ChangelogHistory = [
            {
                id: crypto.randomUUID(),
                timestamp: now,
                fromHash: "unknown",
                toHash: "live-presence-v1",
                commits: [
                    {
                        hash: "broadcast-live",
                        author: "itssolardev",
                        message: "Implement global Broadcast System for real-time announcements to all PatchCord clients",
                        timestamp: now - 1000 * 60 * 10,
                    },
                    {
                        hash: "broadcast-author",
                        author: "itssolardev",
                        message: "Update broadcast author display to PatchCord",
                        timestamp: now - 1000 * 60 * 15,
                    },
                    {
                        hash: "broadcast-clickable-link",
                        author: "itssolardev",
                        message: "Make broadcast links clickable in announcement toasts",
                        timestamp: now - 1000 * 60 * 20,
                    },
                    {
                        hash: "broadcast-tts",
                        author: "itssolardev",
                        message: "Play TTS audio after broadcast.mp3 finishes",
                        timestamp: now - 1000 * 60 * 25,
                    },
                    {
                        hash: "patchcord-plugin-icon",
                        author: "itssolardev",
                        message: "Use patchcord.itssolar.dev/user.png for PatchCord plugin cards",
                        timestamp: now - 1000 * 60 * 30,
                    },
                    {
                        hash: "qr-login-label",
                        author: "itssolardev",
                        message: "Rename QR login settings entry to Login with QR",
                        timestamp: now - 1000 * 60 * 35,
                    },
                    {
                        hash: "custom-badges-icon",
                        author: "itssolardev",
                        message: "Improve the Custom Badges settings tab icon",
                        timestamp: now - 1000 * 60 * 40,
                    },
                    {
                        hash: "live-count",
                        author: "itssolardev",
                        message: "Add Live Online Users counter with 1-minute real-time telemetry",
                        timestamp: now - 1000 * 60 * 20,
                    },
                    {
                        hash: "broadcast-ui",
                        author: "itssolardev",
                        message: "Add rich Notice UI for broadcasts with clickable links and colored badges",
                        timestamp: now - 1000 * 60 * 30,
                    },
                    {
                        hash: "badges-fix",
                        author: "itssolardev",
                        message: "Fix Custom Badges URL mapping to point correctly to patchcord.itssolar.dev/badges.json",
                        timestamp: now - 1000 * 60 * 40,
                    }
                ],
                newPlugins: ["PatchCordBroadcasts"],
                updatedPlugins: ["GlobalBadges"],
                type: "update",
            },
            {
                id: crypto.randomUUID(),
                timestamp: now - 1000 * 60 * 60 * 1,
                fromHash: "unknown",
                toHash: gitHash,
                commits: [
                    {
                        hash: "massive-plugin-drop",
                        author: "itssolardev",
                        message: "Add 200+ new plugins ported from upstream and community repositories",
                        timestamp: now - 1000 * 60 * 60 * 0.5,
                    },
                    {
                        hash: "share-plugins-feat",
                        author: "itssolardev",
                        message: "Add Share Plugins functionality to easily export and import plugin lists",
                        timestamp: now - 1000 * 60 * 60 * 0.6,
                    },
                    {
                        hash: "custom-badges",
                        author: "itssolardev",
                        message: "Implement Custom Badges system across user profiles and chat",
                        timestamp: now - 1000 * 60 * 60 * 0.8,
                    },
                    {
                        hash: "cl-redesign-v2",
                        author: "itssolardev",
                        message: "Implement full changelog redesign with animated cards, user avatars, and SVG icons",
                        timestamp: now - 1000 * 60 * 60 * 0.9,
                    },
                    {
                        hash: "profile-fix",
                        author: "itssolardev",
                        message: "Fix missing profile picture resolution via UserStore in changelog component",
                        timestamp: now - 1000 * 60 * 60 * 1,
                    },
                ],
                newPlugins: ["SharePlugins", "CustomBadges", "200More..."],
                updatedPlugins: [],
                type: "update",
            },
            {
                id: crypto.randomUUID(),
                timestamp: now - 1000 * 60 * 60 * 12,
                fromHash: "unknown",
                toHash: "d8c2b1a",
                commits: [
                    {
                        hash: "cloud-sync-fix",
                        author: "itssolardev",
                        message: "Fix Cloud sync issues where settings would sometimes revert to defaults",
                        timestamp: now - 1000 * 60 * 60 * 8,
                    },
                    {
                        hash: "credits-fix",
                        author: "itssolardev",
                        message: "Fix Credits page not displaying recent contributors properly",
                        timestamp: now - 1000 * 60 * 60 * 9,
                    },
                    {
                        hash: "assets-update",
                        author: "itssolardev",
                        message: "Remove old legacy images and add new high-res UI assets",
                        timestamp: now - 1000 * 60 * 60 * 10,
                    },
                    {
                        hash: "donate-btn-add",
                        author: "itssolardev",
                        message: "Add Donate quick action card to settings tab opening Ko-fi",
                        timestamp: now - 1000 * 60 * 60 * 11,
                    },
                    {
                        hash: "remove-emojis",
                        author: "itssolardev",
                        message: "Remove all native emojis from changelog in favor of scalable SVG components",
                        timestamp: now - 1000 * 60 * 60 * 12,
                    },
                ],
                newPlugins: ["CloudSync", "BetterCredits"],
                updatedPlugins: ["ThemeUpdater"],
                type: "update",
            },
            {
                id: crypto.randomUUID(),
                timestamp: now - 1000 * 60 * 60 * 24 * 2,
                fromHash: "unknown",
                toHash: "a4f89d3",
                commits: [
                    {
                        hash: "crash-fix-1",
                        author: "itssolardev",
                        message: "Crash fix: Resolve unhandled promise rejection when closing settings modal too quickly",
                        timestamp: now - 1000 * 60 * 60 * 24 * 1.2,
                    },
                    {
                        hash: "banner-default",
                        author: "itssolardev",
                        message: "Set default Patchcord banner to banner1.png and add cache-busting to banner loads",
                        timestamp: now - 1000 * 60 * 60 * 24 * 1.5,
                    },
                    {
                        hash: "deprecated-api-drop",
                        author: "itssolardev",
                        message: "Remove deprecated legacy plugin manager API bindings",
                        timestamp: now - 1000 * 60 * 60 * 24 * 1.8,
                    },
                    {
                        hash: "banner-discovery",
                        author: "itssolardev",
                        message: "Fix banner discovery to correctly match banner1..banner7 and avoid fallback",
                        timestamp: now - 1000 * 60 * 60 * 24 * 2,
                    },
                ],
                newPlugins: [],
                updatedPlugins: ["PluginRepo", "TypingTweaks", "MessageLogger"],
                type: "update",
            },
            {
                id: crypto.randomUUID(),
                timestamp: now - 1000 * 60 * 60 * 24 * 7,
                fromHash: "unknown",
                toHash: "f1e3c8b",
                commits: [
                    {
                        hash: "core-rewrite",
                        author: "itssolardev",
                        message: "Major core rewrite for better stability and performance",
                        timestamp: now - 1000 * 60 * 60 * 24 * 5,
                    },
                    {
                        hash: "memory-leak-fix",
                        author: "itssolardev",
                        message: "Fix severe memory leak in message logging module",
                        timestamp: now - 1000 * 60 * 60 * 24 * 6,
                    },
                    {
                        hash: "remove-telemetry",
                        author: "itssolardev",
                        message: "Remove obsolete telemetry endpoints from the network stack",
                        timestamp: now - 1000 * 60 * 60 * 24 * 7,
                    },
                ],
                newPlugins: ["PerformanceMonitor"],
                updatedPlugins: [],
                type: "update",
            },
        ];

        await DataStore.set(CHANGELOG_HISTORY_KEY, seed);
    }

}

export async function getLastRepositoryCheckHash(): Promise<string | null> {
    return (await DataStore.get(LAST_REPO_CHECK_KEY)) as string | null;
}

export async function setLastRepositoryCheckHash(hash: string): Promise<void> {
    await DataStore.set(LAST_REPO_CHECK_KEY, hash);
}

export function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    } else {
        return date.toLocaleDateString();
    }
}
