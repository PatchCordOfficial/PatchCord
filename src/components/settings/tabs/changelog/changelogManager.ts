/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Logger } from "@utils/Logger";
import { isObject } from "@utils/misc";

import gitHash from "~git-hash";
import plugins, { PluginMeta } from "~plugins";

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
const KNOWN_HASHES_KEY = "PatchCordChangelog_KnownHashes";
const GITHUB_COMPARE_ENDPOINT = "https://api.github.com/repos";

const logger = new Logger("Changelog");

function isRecord(value: unknown): value is Record<string, unknown> {
    return isObject(value);
}

type KnownPluginSettingsMap = Map<string, Set<string>>;

function normalizeRepoUrl(repoUrl: string | null | undefined): string | null {
    if (!repoUrl) return null;
    try {
        const normalized = repoUrl.replace(/^git\+/, "");
        const url = new URL(normalized);
        if (url.protocol !== "https:" || url.hostname !== "github.com") return null;
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
                signal: AbortSignal.timeout(15_000),
            },
        );

        if (!res.ok) return [];
        const data: unknown = await res.json();
        if (!isRecord(data) || !Array.isArray(data.commits)) return [];

        return data.commits.flatMap((entry: unknown): ChangelogEntry[] => {
            if (!isRecord(entry) || typeof entry.sha !== "string" || !isRecord(entry.commit)
                || typeof entry.commit.message !== "string") return [];
            const author = isRecord(entry.commit.author) ? entry.commit.author : undefined;
            const account = isRecord(entry.author) ? entry.author : undefined;
            const timestamp = typeof author?.date === "string" ? Date.parse(author.date) : undefined;
            return [{
                hash: entry.sha,
                author: typeof author?.name === "string" ? author.name : typeof account?.login === "string" ? account.login : "Unknown author",
                message: entry.commit.message.split("\n")[0] || "No message",
                timestamp: Number.isNaN(timestamp) ? undefined : timestamp,
            }];
        });
    } catch (err) {
        logger.warn("Failed to fetch commits between hashes", err);
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

function isMapLike(value: unknown): value is Map<string, string[]> {
    return value instanceof Map;
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

    return (history || []).filter(session => !session.commits.some(commit =>
        ["broadcast-live", "massive-plugin-drop", "cloud-sync-fix", "crash-fix-1", "core-rewrite"].includes(commit.hash),
    ));
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
    await DataStore.set(KNOWN_HASHES_KEY, Object.fromEntries(Object.entries(PluginMeta).map(([name, meta]) => [name, meta.hash])));
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
    const mapData: unknown = await DataStore.get(KNOWN_SETTINGS_KEY);
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
    const known = await DataStore.get<Record<string, string>>(KNOWN_HASHES_KEY);
    if (!known) return [];
    return Object.keys(plugins).filter(name =>
        Object.hasOwn(known, name) && known[name] !== PluginMeta[name].hash && !plugins[name].hidden && !plugins[name].required,
    );
}

export async function clearChangelogHistory(): Promise<void> {
    await DataStore.del(CHANGELOG_HISTORY_KEY);
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

    const knownHashes = await DataStore.get(KNOWN_HASHES_KEY);
    const commits = await getCommitsSinceLastSeen("https://github.com/PatchCordOfficial/PatchCord");
    const newPlugins = await getNewPlugins();
    const updatedPlugins = await getUpdatedPlugins();
    const newSettings = await getNewSettings();
    await saveUpdateSession(commits, newPlugins, updatedPlugins, newSettings);
    if (!knownHashes) {
        await DataStore.set(KNOWN_HASHES_KEY, Object.fromEntries(Object.entries(PluginMeta).map(([name, meta]) => [name, meta.hash])));
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
