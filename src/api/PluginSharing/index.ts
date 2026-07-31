/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, pluginRequiresRestart, startDependenciesRecursive, startPlugin } from "@api/PluginManager";
import { definePluginSettings, Settings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { OptionType } from "@utils/types";
import { deflateSync, inflateSync } from "fflate";

import Plugins from "~plugins";

const logger = new Logger("PluginSharing", "#39b7e0");

/**
 * Shared settings store for plugin sharing. This is assigned as the `settings`
 * of the PluginSharing plugin (src/patchcordplugins/pluginSharing), but is
 * defined here so both the plugin (for commands) and the Share Plugins
 * settings tab can read/write it without depending on each other.
 */
export const settings = definePluginSettings({
    useCloud: {
        type: OptionType.BOOLEAN,
        description: "Upload share codes to PatchCord Cloud and share a short link instead of a full code block. Requires a PatchCord Cloud server to be running.",
        default: false
    }
});

/**
 * Base URL of the PatchCord Cloud share backend.
 *
 * This is only used when "Use Cloud" is enabled in the Share Plugins settings tab.
 * It expects a server exposing:
 *   POST {CLOUD_SHARE_URL}        body: { code: string }  -> { id: string }
 *   GET  {CLOUD_SHARE_URL}/:id                             -> { code: string }
 *
 * Until that server exists, cloud sharing will fail and callers should fall back
 * to sending the plain code instead.
 */
export const CLOUD_SHARE_URL = "https://patchcord.itssolar.dev/cloud/";
export const CLOUD_SHARE_ENDPOINT = "https://patchcord.itssolar.dev/cloud/index.php";

const CODE_PREFIX = "patchcord-share-v1:";

export type ShareMode = "all" | "specific";

export interface PluginShareData {
    v: 1;
    mode: ShareMode;
    plugins: string[];
}

export interface ApplyShareResult {
    enabled: string[];
    alreadyEnabled: string[];
    missing: string[];
    restartNeeded: boolean;
}

function toBase64Url(data: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
    const padded = str + "=".repeat((4 - str.length % 4) % 4);
    const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

/** Names of all plugins that are currently enabled and safe/sensible to share (excludes required core plugins). */
export function getShareablePlugins(): string[] {
    return Object.keys(Plugins)
        .filter(name => !Plugins[name].required && isPluginEnabled(name))
        .sort();
}

/** All plugin names that could theoretically be shared/imported (excludes required core plugins). */
export function getAllShareableCandidates(): string[] {
    return Object.keys(Plugins)
        .filter(name => !Plugins[name].required)
        .sort();
}

export function buildShareData(mode: ShareMode, plugins: string[]): PluginShareData {
    return {
        v: 1,
        mode,
        plugins: (mode === "all" ? getShareablePlugins() : plugins).slice().sort()
    };
}

export function encodeShareCode(data: PluginShareData): string {
    const json = JSON.stringify(data);
    const compressed = deflateSync(new TextEncoder().encode(json));
    return CODE_PREFIX + toBase64Url(compressed);
}

export function decodeShareCode(code: string): PluginShareData {
    const trimmed = code.trim();
    const raw = trimmed.startsWith(CODE_PREFIX) ? trimmed.slice(CODE_PREFIX.length) : trimmed;

    let data: PluginShareData;
    try {
        const bytes = fromBase64Url(raw);
        const json = new TextDecoder().decode(inflateSync(bytes));
        data = JSON.parse(json);
    } catch (e) {
        logger.error("Failed to decode share code", e);
        throw new Error("That doesn't look like a valid PatchCord share code.");
    }

    if (!data || data.v !== 1 || !Array.isArray(data.plugins))
        throw new Error("That doesn't look like a valid PatchCord share code.");

    return data;
}

/**
 * Enables the given plugins (or every plugin in the share data if no explicit
 * selection is passed), mirroring the same enable flow the Plugins tab uses.
 */
export function applyShareData(data: PluginShareData, selected?: string[]): ApplyShareResult {
    const names = selected ?? data.plugins;
    const settings = Settings.plugins;

    const result: ApplyShareResult = { enabled: [], alreadyEnabled: [], missing: [], restartNeeded: false };

    for (const name of names) {
        const plugin = Plugins[name];
        if (!plugin) {
            result.missing.push(name);
            continue;
        }

        if (isPluginEnabled(name)) {
            result.alreadyEnabled.push(name);
            continue;
        }

        const { restartNeeded, failures } = startDependenciesRecursive(plugin);
        if (failures.length) {
            logger.error(`Failed to start dependencies for ${name}: ${failures.join(", ")}`);
            result.missing.push(name);
            continue;
        }

        if (restartNeeded || pluginRequiresRestart(plugin)) {
            settings[name].enabled = true;
            result.enabled.push(name);
            result.restartNeeded = true;
            continue;
        }

        if (startPlugin(plugin)) {
            settings[name].enabled = true;
            result.enabled.push(name);
        } else {
            result.missing.push(name);
        }
    }

    return result;
}

// ---- Optional cloud sharing ----
// See the CLOUD_SHARE_URL doc comment above for the backend contract this expects.

export async function uploadShareCode(code: string): Promise<string> {
    const res = await fetch(CLOUD_SHARE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
    });

    if (!res.ok) throw new Error(`Cloud upload failed (API returned ${res.status})`);

    const { id } = await res.json();
    if (!id) throw new Error("Cloud upload did not return an id");
    return id;
}

export async function downloadShareCode(idOrUrl: string): Promise<string> {
    const id = idOrUrl.includes("/") ? idOrUrl.split("/").filter(Boolean).pop()! : idOrUrl;

    const res = await fetch(`${CLOUD_SHARE_URL}${id}`);
    if (!res.ok) throw new Error(`Cloud lookup failed (API returned ${res.status})`);

    const { code } = await res.json();
    if (!code) throw new Error("Cloud response did not contain a code");
    return code;
}

export function buildCloudShareLink(id: string): string {
    return `${CLOUD_SHARE_URL}${id}`;
}
