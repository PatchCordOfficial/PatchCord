/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CspPolicies, ImageSrc } from "@main/csp";

// Runs in Electron's main process, so this fetch is plain Node fetch and is
// NOT subject to the renderer's CORS restrictions - unlike a fetch() call
// made from a React component, which Discord's CSP/CORS will block unless
// the remote server explicitly sends back Access-Control-Allow-Origin.

const BANNER_DIR = "https://patchcord.itssolar.dev/assets/banner";
const BANNER_LIST_URL = `${BANNER_DIR}/`;

// Discord's own Content-Security-Policy blocks the <img>/background-image
// load of the chosen banner unless its domain is explicitly allow-listed
// here - this is what makes the banner render instead of staying blank.
CspPolicies["patchcord.itssolar.dev"] = ImageSrc;

function isBannerFile(file: string): boolean {
    return /^banner(?:\s*\d*)?\.(png|jpe?g|webp|gif)$/i.test(file.trim());
}

function normalizeBannerFile(file: string): string {
    return file.replace(/^\.?\/?/, "");
}

export async function fetchBannerFiles(): Promise<string[]> {
    const res = await fetch(BANNER_LIST_URL, { method: "GET" });
    if (!res.ok) throw new Error(`Failed to fetch banner list: ${res.status}`);

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (contentType.startsWith("image/")) {
        return [BANNER_LIST_URL];
    }

    const text = await res.text();

    try {
        const data = JSON.parse(text);
        const candidateArrays = [
            Array.isArray(data) ? data : undefined,
            Array.isArray(data?.files) ? data.files : undefined,
            Array.isArray(data?.banners) ? data.banners : undefined,
        ];

        for (const candidate of candidateArrays) {
            if (!candidate) continue;
            const filtered = candidate
                .filter((f: unknown) => typeof f === "string")
                .map(f => normalizeBannerFile(f))
                .filter(isBannerFile);
            if (filtered.length) return Array.from(new Set(filtered));
        }
    } catch {
        // Not JSON, fall through to HTML parsing.
    }

    const matches = [...text.matchAll(/banner(?:\s*\d*)?\.(?:png|jpe?g|webp|gif)/gi)]
        .map(m => normalizeBannerFile(m[0]));

    if (matches.length) {
        return Array.from(new Set(matches));
    }

    return ["banner.png"];
}
