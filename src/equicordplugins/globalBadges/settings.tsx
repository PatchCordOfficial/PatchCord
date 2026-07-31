/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

// NOTE: this plugin only shows badges sourced from your own configured
// PatchCord badges API (unmodded entries, or ones explicitly tagged
// "patchcord"). Badges from other client mods (Nekocord, Aero, Aliucord,
// etc.) are always excluded, regardless of any setting here, so the old
// per-client-mod toggles were removed since they no longer do anything.
export const settings = definePluginSettings({
    showModStyle: {
        type: OptionType.SELECT,
        description: "Mod Style",
        default: "none",
        options: [
            { label: "Don't Show Mod", value: "none" },
            { label: "Show Mod as Prefix", value: "prefix" },
            { label: "Show Mod as Suffix", value: "suffix" },
        ]
    },
    apiUrl: {
        type: OptionType.STRING,
        description: "Global Badges API URL",
        default: "https://badges.equicord.org/",
        restartNeeded: false,
        isValid: (value => {
            if (!value) return false;
            return true;
        })
    }
});
