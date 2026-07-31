/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import definePlugin, { OptionType } from "@utils/types";
import { Toasts } from "@webpack/common";

const settings = definePluginSettings({
    greeting: {
        type: OptionType.STRING,
        description: "The message shown when the test command runs",
        default: "PatchCord is alive!"
    },
    showToast: {
        type: OptionType.BOOLEAN,
        description: "Also show a toast notification when the command runs",
        default: true
    }
});

export default definePlugin({
    name: "PatchcordTest",
    description: "A tiny sanity-check plugin to confirm patchcordplugins is being loaded correctly.",
    authors: [{ name: "Solar", id: 864612087741546527n }],
    settings,

    commands: [
        {
            name: "patchtest",
            description: "Runs a quick PatchCord test",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [],
            execute: (_opts, ctx) => {
                if (settings.store.showToast) {
                    Toasts.show({
                        id: Toasts.genId(),
                        message: settings.store.greeting,
                        type: Toasts.Type.SUCCESS
                    });
                }

                sendBotMessage(ctx.channel.id, {
                    content: settings.store.greeting
                });
            }
        }
    ],

    start() {
        console.log("[PatchcordTest] loaded from src/patchcordplugins ✅");
    },

    stop() {
        console.log("[PatchcordTest] stopped");
    }
});
