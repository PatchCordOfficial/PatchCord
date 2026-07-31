/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DATA_DIR } from "@main/utils/constants";
import { fetchBuffer, fetchJson } from "@main/utils/http";
import { shell } from "electron";
import { unzip } from "fflate";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";

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
                if (f.endsWith("/")) {
                    await mkdir(join(outDir, f), { recursive: true });
                    return;
                }

                const pathElements = f.split("/");
                const name = pathElements.pop()!;
                const dir = join(outDir, pathElements.join("/"));

                if (dir) await mkdir(dir, { recursive: true });
                await writeFile(join(dir, name), files[f]);
            }))
                .then(() => resolve())
                .catch(err => {
                    rm(outDir, { recursive: true, force: true });
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
export async function downloadAndOpenUpdate(version: string): Promise<string> {
    const safeVersion = version.replace(/[^\w-]/g, "_");
    const extractDir = join(UPDATES_DIR, safeVersion);

    await rm(extractDir, { recursive: true, force: true });

    const zipData = await fetchBuffer(UPDATE_ZIP_URL);
    await extractZip(zipData, extractDir);

    await shell.openPath(extractDir);

    return extractDir;
}
