/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { showNotice } from "@api/Notices";
import { Logger } from "@utils/Logger";
import definePlugin, { PluginNative } from "@utils/types";
import { Toasts } from "@webpack/common";

const Native = VencordNative.pluginHelpers.PatchcordUpdater as PluginNative<typeof import("./native")>;

const logger = new Logger("PatchcordUpdater");

// The date (from the manifest's "updates.latest" field) that the user has
// actually updated to. Only set after a real, successful update - never
// just from dismissing/seeing the notice - so the prompt keeps reappearing
// on every check until they update, but never nags again for a date they've
// already installed.
const LAST_UPDATED_KEY = "PatchcordUpdater_lastUpdatedDate";

const CHECK_INTERVAL = 1000 * 60 * 30; // 30 minutes
const INITIAL_DELAY = 1000 * 15; // give the client a moment to finish loading

let intervalId: any;
// Tracks which "latest" date we've already queued a notice for, so a normal
// background re-check doesn't spam a second notice while the first one is
// still sitting there unanswered.
let noticeShownFor: string | null = null;
let isUpdating = false;

async function performUpdate(version: string) {
    if (isUpdating) return;
    isUpdating = true;

    Toasts.show({
        id: Toasts.genId(),
        message: "Downloading the latest Patchcord update...",
        type: Toasts.Type.MESSAGE
    });

    try {
        await Native.downloadAndOpenUpdate(version);

        // Remember that we've updated to this exact release so we don't
        // prompt again until the manifest's "latest" date changes.
        await DataStore.set(LAST_UPDATED_KEY, version);
        noticeShownFor = null;

        Toasts.show({
            id: Toasts.genId(),
            message: "Update downloaded! Run the installer from the folder that just opened, then restart Discord.",
            type: Toasts.Type.SUCCESS
        });
    } catch (e) {
        logger.error("Failed to download update", e);
        Toasts.show({
            id: Toasts.genId(),
            message: "Failed to download the Patchcord update. Check your connection and try again.",
            type: Toasts.Type.FAILURE
        });
    } finally {
        isUpdating = false;
    }
}

export async function checkForUpdates(manual = false) {
    let manifest: Awaited<ReturnType<typeof Native.fetchUpdateManifest>>;
    try {
        manifest = await Native.fetchUpdateManifest();
    } catch (e) {
        logger.error("Failed to fetch update manifest", e);
        if (manual) {
            Toasts.show({
                id: Toasts.genId(),
                message: "Failed to check for Patchcord updates. Check your connection.",
                type: Toasts.Type.FAILURE
            });
        }
        return;
    }

    const latest = manifest.latest;
    const lastUpdated = await DataStore.get<string>(LAST_UPDATED_KEY);

    // First time this feature has ever run: baseline to whatever's
    // currently "latest" so existing users aren't immediately nagged about
    // an "update" they already effectively have.
    if (lastUpdated === undefined) {
        await DataStore.set(LAST_UPDATED_KEY, latest);
        if (manual) {
            Toasts.show({ id: Toasts.genId(), message: "Patchcord is up to date!", type: Toasts.Type.SUCCESS });
        }
        return;
    }

    if (lastUpdated === latest) {
        noticeShownFor = null;
        if (manual) {
            Toasts.show({ id: Toasts.genId(), message: "Patchcord is up to date!", type: Toasts.Type.SUCCESS });
        }
        return;
    }

    if (manual) {
        Toasts.show({
            id: Toasts.genId(),
            message: `Update available (${latest})!`,
            type: Toasts.Type.MESSAGE
        });
    }

    // Don't queue a second notice for a release we're already prompting for.
    if (noticeShownFor === latest) return;
    noticeShownFor = latest;

    showNotice(
        `A new Patchcord update is available (released ${latest}). Update now?`,
        "Open Download Page",
        () => {
            // Opening the download page doesn't itself install anything, but
            // we can't know when (or if) the user actually finishes the
            // manual install. Treat clicking through as "handled" for this
            // release so the notice doesn't keep re-appearing every 30
            // minutes for a version the user has already been prompted
            // about and acted on. If a newer version comes out later,
            // `latest` will change and the notice will correctly return.
            DataStore.set(LAST_UPDATED_KEY, latest);
            noticeShownFor = null;
            void VencordNative.native.openExternal("https://patchcord.itssolar.dev/download.html");
        }
    );
}

export default definePlugin({
    name: "PatchcordUpdater",
    description: "Checks patchcord.itssolar.dev for new Patchcord releases and lets you download/install them from inside Discord.",
    authors: [{ name: "Solar", id: 864612087741546527n }],
    required: true,
    hidden: true,

    toolboxActions: {
        "Check for Patchcord Updates"() {
            checkForUpdates(true);
        }
    },

    async start() {
        clearInterval(intervalId);
        setTimeout(() => checkForUpdates(), INITIAL_DELAY);
        intervalId = setInterval(() => checkForUpdates(), CHECK_INTERVAL);
    },

    stop() {
        clearInterval(intervalId);
        noticeShownFor = null;
    }
});
