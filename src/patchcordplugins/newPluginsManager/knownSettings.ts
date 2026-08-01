/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import plugins, { PluginMeta } from "~plugins";

export type KnownPluginSettingsMap = Map<string, Set<string>>;

export const KNOWN_PLUGINS_LEGACY_DATA_KEY = "NewPluginsManager_KnownPlugins";
export const KNOWN_SETTINGS_DATA_KEY = "NewPluginsManager_KnownSettings";
export const KNOWN_PLUGIN_HASHES_DATA_KEY = "NewPluginsManager_KnownPluginHashes";

function getSettingsSetForPlugin(plugin: string): Set<string> {
    const settings = plugins[plugin]?.settings?.def || {};
    return new Set(Object.keys(settings).filter(setting => setting !== "enabled"));
}

function getCurrentSettings(pluginList: string[]): KnownPluginSettingsMap {
    return new Map(pluginList.map(name => [
        name,
        getSettingsSetForPlugin(name)
    ]));
}

function getCurrentPluginHashes(pluginList: string[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const name of pluginList) {
        const hash = PluginMeta[name]?.hash;
        if (typeof hash === "string") {
            map.set(name, hash);
        }
    }
    return map;
}

async function persistKnownPluginHashes(map: Map<string, string>): Promise<void> {
    await DataStore.set(KNOWN_PLUGIN_HASHES_DATA_KEY, Object.fromEntries(map));
}

async function getKnownPluginHashes(): Promise<Map<string, string>> {
    const raw = await DataStore.get(KNOWN_PLUGIN_HASHES_DATA_KEY);
    if (raw === undefined) {
        const initial = getCurrentPluginHashes(Object.keys(plugins));
        await persistKnownPluginHashes(initial);
        return initial;
    }

    const map = new Map<string, string>();
    if (raw instanceof Map) {
        raw.forEach((value, key) => map.set(String(key), String(value)));
    } else if (Array.isArray(raw)) {
        for (const entry of raw as [unknown, unknown][]) {
            if (!Array.isArray(entry) || entry.length < 2) continue;
            map.set(String(entry[0]), String(entry[1]));
        }
    } else if (raw && typeof raw === "object") {
        Object.entries(raw).forEach(([key, value]) => {
            map.set(key, String(value));
        });
    }
    return map;
}

export async function updateKnownPluginHashes(): Promise<void> {
    const currentHashes = getCurrentPluginHashes(Object.keys(plugins));
    await persistKnownPluginHashes(currentHashes);
}

export async function getKnownSettings(): Promise<Map<string, Set<string>>> {
    const raw = await DataStore.get(KNOWN_SETTINGS_DATA_KEY);
    let map: Map<string, Set<string>>;

    if (!raw) {
        const knownPlugins = await DataStore.get(KNOWN_PLUGINS_LEGACY_DATA_KEY) ?? [] as string[];
        const Plugins = [...Object.keys(plugins), ...knownPlugins];
        map = getCurrentSettings(Plugins);
        await DataStore.set(KNOWN_SETTINGS_DATA_KEY, [...map.entries()].map(
            ([plugin, settings]) => [plugin, [...settings]]
        ));
    } else {
        map = raw instanceof Map
            ? raw
            : new Map(raw.map(([plugin, settings]: [string, string[]]) => [plugin, new Set(settings)]));
    }

    return map;
}

export async function getNewSettings(): Promise<KnownPluginSettingsMap> {
    const map = getCurrentSettings(Object.keys(plugins));
    const knownSettings = await getKnownSettings();
    map.forEach((settings, plugin) => {
        const filteredSettings = [...settings].filter(setting => !knownSettings.get(plugin)?.has(setting));
        if (!filteredSettings.length) return map.delete(plugin);
        map.set(plugin, new Set(filteredSettings));
    });
    return map;
}

export async function getKnownPlugins(): Promise<Set<string>> {
    const knownSettings = await getKnownSettings();
    return new Set(knownSettings.keys());
}

export async function getNewPlugins(): Promise<Set<string>> {
    const currentPlugins = Object.keys(plugins);
    const knownPlugins = await getKnownPlugins();
    return new Set(currentPlugins.filter(p => !knownPlugins.has(p)));
}

export async function getUpdatedPlugins(): Promise<Set<string>> {
    const currentHashes = getCurrentPluginHashes(Object.keys(plugins));
    const knownHashes = await getKnownPluginHashes();
    const updatedPlugins = new Set<string>();

    currentHashes.forEach((hash, plugin) => {
        if (!knownHashes.has(plugin)) return;
        if (knownHashes.get(plugin) === hash) return;
        if (plugins[plugin]?.hidden || plugins[plugin]?.required) return;
        updatedPlugins.add(plugin);
    });

    return updatedPlugins;
}

export async function writeKnownSettings() {
    const currentSettings = getCurrentSettings(Object.keys(plugins));
    const knownSettings = await getKnownSettings();
    const allSettings = new Map();
    new Set([...currentSettings.keys(), ...knownSettings.keys()]).forEach(plugin => {
        allSettings.set(plugin, new Set([
            ...(currentSettings.get(plugin) || []),
            ...(knownSettings.get(plugin) || [])
        ]));
    });
    await DataStore.set(KNOWN_SETTINGS_DATA_KEY, allSettings);
    await updateKnownPluginHashes();
}

export async function debugWipeSomeData() {
    const settings = await getKnownSettings();
    settings.forEach((value, key) => {
        if (Math.random() > 0.8) {
            if (Math.random() > 0.5) return settings.set(key, new Set([...value].filter(() => Math.random() > 0.5)));
            return settings.delete(key);
        }
    });
    await DataStore.set(KNOWN_SETTINGS_DATA_KEY, settings);
}

export async function editRawData(patcher: (data: KnownPluginSettingsMap) => (Promise<any> | any)) {
    if (!patcher) return;
    const map = await DataStore.get(KNOWN_SETTINGS_DATA_KEY) as KnownPluginSettingsMap;
    const newMap = new Map(map);
    await patcher(newMap);
    await DataStore.set(KNOWN_SETTINGS_DATA_KEY, newMap ?? map);
}
