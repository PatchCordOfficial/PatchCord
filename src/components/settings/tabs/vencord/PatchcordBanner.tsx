/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./PatchcordBanner.css";

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Flex } from "@components/Flex";
import { Logger } from "@utils/Logger";
import { PluginNative } from "@utils/types";
import { React } from "@webpack/common";

const logger = new Logger("PatchcordBanner");

// The listing fetch runs through this native (main-process) bridge, since a
// plain renderer-side fetch() gets blocked by CORS unless the remote server
// sends back an Access-Control-Allow-Origin header - Node's fetch in the
// main process has no such restriction. See ../../../../patchcordplugins/patchcordBanner.
const Native = VencordNative.pluginHelpers.PatchcordBanner as PluginNative<typeof import("../../../../patchcordplugins/patchcordBanner/native")>;

const BANNER_DIR = "https://patchcord.itssolar.dev/assets/banner";
const DEFAULT_BANNER = `${BANNER_DIR}/banner1.png`;

const WEBSITE_URL = "https://patchcord.itssolar.dev";
const RANDY_URL = "https://bigdih.lol";

function appendCacheBuster(url: string): string {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}cb=${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Recommended banner image size: 1600x400px PNG (4:1 aspect ratio).
 * The banner container is a fixed 400px tall, full width card, and the
 * image is displayed with `background-size: cover`, so anything close to
 * that 4:1 ratio will fill the card edge-to-edge with no letterboxing or
 * awkward cropping. Export at 1600x400 (or any multiple of it, e.g.
 * 3200x800 for a sharper look on high-DPI displays) for an exact fit.
 *
 * Note: only the *listing* of available banners goes through the native
 * bridge to dodge CORS. The actual <img>/background-image load of the
 * chosen banner is a plain resource fetch by the browser, which is never
 * subject to CORS - so the image itself will always load fine as long as
 * the URL is reachable.
 */

function resolveUrl(file: string): string {
    if (/^https?:\/\//i.test(file)) return file;
    return `${BANNER_DIR.replace(/\/$/, "")}/${file.replace(/^\//, "")}`;
}

export function PatchcordBanner() {
    const [bannerUrl, setBannerUrl] = React.useState<string | null>(DEFAULT_BANNER);

    React.useEffect(() => {
        let cancelled = false;

        Native.fetchBannerFiles()
            .then((files: string[]) => {
                if (cancelled) return;
                logger.info("Found banner files", files);
                if (!files.length) return;

                const pick = files[Math.floor(Math.random() * files.length)];
                const url = appendCacheBuster(resolveUrl(pick));
                logger.info("Using banner", url);
                setBannerUrl(url);
            })
            .catch((err: unknown) => {
                logger.error("Failed to load banner", err);
                if (!cancelled) setBannerUrl(DEFAULT_BANNER);
            });

        return () => { cancelled = true; };
    }, []);

    return (
        <Card className="vc-patchcord-banner-card">
            <img className="vc-patchcord-banner-image" src={bannerUrl ?? appendCacheBuster(DEFAULT_BANNER)} alt="PatchCord banner" onError={() => setBannerUrl(appendCacheBuster(DEFAULT_BANNER))} />
            <div className="vc-patchcord-banner-overlay" />
            <Flex className="vc-patchcord-banner-buttons" justifyContent="center" gap="0.75em">
                <Button
                    variant="none"
                    size="medium"
                    type="button"
                    onClick={() => VencordNative.native.openExternal(WEBSITE_URL)}
                    className="vc-patchcord-banner-button"
                >
                    Website
                </Button>
                <Button
                    variant="none"
                    size="medium"
                    type="button"
                    onClick={() => VencordNative.native.openExternal(RANDY_URL)}
                    className="vc-patchcord-banner-button"
                >
                    Randy
                </Button>
            </Flex>
        </Card>
    );
}
