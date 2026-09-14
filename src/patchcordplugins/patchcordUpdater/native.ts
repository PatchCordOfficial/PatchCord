/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DATA_DIR } from "@main/utils/constants";
import { fetchBuffer, fetchJson } from "@main/utils/http";
import { IpcMainInvokeEvent, shell } from "electron";
import { unzip } from "fflate";
import { mkdir, rm, writeFile } from "fs/promises";
import { dirname, join, resolve as resolvePath, sep } from "path";

// Runs in Electron's main process, so these requests are plain Node fetches
// and are NOT subject to the renderer's CORS restrictions - unlike a fetch()
// call made from a React component, which Discord's CSP/CORS would block.

const LATEST_JSON_URL = "https://patchcord.itssolar.dev/installer/latest.json";
const UPDATE_ZIP_URL = "https://patchcord.itssolar.dev/injector/publish.zip";
const UPDATES_DIR = join(DATA_DIR, "Updates");

export interface PatchcordUpdateManifest {
    latest: string;
    buildDate: string;
    downloadUrl: string;
    changelog: string[];
}

/**
 * Fetches the update manifest. Always bypasses caches so a genuinely new
 * version is never masked by a stale cached response.
 */
export async function fetchUpdateManifest(): Promise<PatchcordUpdateManifest> {
    return fetchJson<PatchcordUpdateManifest>(LATEST_JSON_URL, { cache: "no-store" });
}

async function extractZip(data: Buffer, outDir: string) {
    await mkdir(outDir, { recursive: true });

    return new Promise<void>((resolve, reject) => {
        unzip(data, (err, files) => {
            if (err) return void reject(err);

            Promise.all(Object.keys(files).map(async f => {
                const target = resolvePath(outDir, f);
                if (!target.startsWith(resolvePath(outDir) + sep)) throw new Error("The update archive contains an invalid path.");
                if (f.endsWith("/")) {
                    await mkdir(target, { recursive: true });
                    return;
                }
                await mkdir(dirname(target), { recursive: true });
                await writeFile(target, files[f]);
            }))
                .then(() => resolve())
                .catch(err => {
                    reject(err);
                });
        });
    });
}

/**
 * Downloads the latest injector build fresh, extracts it into a
 * version-stamped folder (wiping out any previous extraction for that same
 * version first) and opens the resulting folder so the user can run the
 * installer themselves. We open the folder rather than guessing an
 * executable name inside the zip, since that name varies per-platform.
 */
export async function downloadAndOpenUpdate(_event: IpcMainInvokeEvent, version: unknown) {
    if (typeof version !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(version)) {
        return { success: false, error: "The update version is invalid." };
    }
    const safeVersion = version.replace(/[^\w-]/g, "_");
    const extractDir = join(UPDATES_DIR, safeVersion);

    try {
        await rm(extractDir, { recursive: true, force: true });

        const zipData = await fetchBuffer(UPDATE_ZIP_URL);
        await extractZip(zipData, extractDir);

        const error = await shell.openPath(extractDir);
        if (error) return { success: false, error: "The update folder could not be opened." };
        return { success: true };
    } catch {
        return { success: false, error: "The update could not be downloaded or extracted." };
    }
}
