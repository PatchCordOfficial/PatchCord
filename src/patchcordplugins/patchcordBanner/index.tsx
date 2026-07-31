/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

// This plugin has no patches - it exists purely so its native.ts is wired
// up as an IPC bridge (VencordNative.pluginHelpers.PatchcordBanner), which
// lets the settings tab banner fetch the list of banner images from the
// main process instead of the renderer, avoiding CORS restrictions.
export default definePlugin({
    name: "PatchcordBanner",
    description: "Backing plugin for the Patchcord settings banner. Provides a CORS-free way to list banner images.",
    authors: [{ name: "Solar", id: 864612087741546527n }],
    required: true,
    hidden: true,
});
