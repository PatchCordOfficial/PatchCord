/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import {
    applyShareData,
    buildCloudShareLink,
    buildShareData,
    decodeShareCode,
    downloadShareCode,
    encodeShareCode,
    getShareablePlugins,
    settings,
    uploadShareCode
} from "@api/PluginSharing";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "PluginSharing",
    description: "Share your enabled plugins with friends via a code, a settings tab, or slash commands in DMs.",
    authors: [{ name: "Solar", id: 864612087741546527n }],
    tags: ["Utility", "Commands"],
    required: true,

    settings,

    commands: [
        {
            name: "share plugins",
            description: "Shares your enabled PatchCord plugins with whoever is in this chat.",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [],
            execute: async (_opts, ctx) => {
                const plugins = getShareablePlugins();

                if (!plugins.length) {
                    sendBotMessage(ctx.channel.id, { content: "You don't have any shareable plugins enabled." });
                    return;
                }

                const data = buildShareData("all", plugins);
                const code = encodeShareCode(data);

                if (settings.store.useCloud) {
                    try {
                        const id = await uploadShareCode(code);
                        return {
                            content: `Here are my PatchCord plugins (${plugins.length})! Import with \`/import shared plugins\`:\n${buildCloudShareLink(id)}`
                        };
                    } catch (e) {
                        sendBotMessage(ctx.channel.id, {
                            content: `Cloud sharing failed (${(e as Error).message}). Sending the code directly instead.`
                        });
                    }
                }

                return {
                    content: `Here are my PatchCord plugins (${plugins.length})! Import with \`/import shared plugins\`:\n\`\`\`\n${code}\n\`\`\``
                };
            }
        },
        {
            name: "import shared plugins",
            description: "Imports a PatchCord plugin share code someone sent you.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "code",
                    description: "The share code or PatchCord Cloud link they sent you",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                }
            ],
            execute: async (opts, ctx) => {
                const raw = findOption<string>(opts, "code", "").trim();

                if (!raw) {
                    sendBotMessage(ctx.channel.id, { content: "Please paste a share code or PatchCord Cloud link." });
                    return;
                }

                try {
                    const code = raw.startsWith("http") ? await downloadShareCode(raw) : raw;
                    const data = decodeShareCode(code);

                    if (!data.plugins.length) {
                        sendBotMessage(ctx.channel.id, { content: "That share code doesn't contain any plugins." });
                        return;
                    }

                    const result = applyShareData(data);

                    const lines: string[] = [];
                    if (result.enabled.length) lines.push(`✅ Enabled: ${result.enabled.join(", ")}`);
                    if (result.alreadyEnabled.length) lines.push(`ℹ️ Already enabled: ${result.alreadyEnabled.join(", ")}`);
                    if (result.missing.length) lines.push(`⚠️ Not found (you don't have these plugins): ${result.missing.join(", ")}`);
                    if (result.restartNeeded) lines.push("🔄 Restart PatchCord to fully apply these changes.");

                    sendBotMessage(ctx.channel.id, { content: lines.join("\n") || "Nothing to import." });
                } catch (e) {
                    sendBotMessage(ctx.channel.id, { content: `Failed to import: ${(e as Error).message}` });
                }
            }
        }
    ]
});
