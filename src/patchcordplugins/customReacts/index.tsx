/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { addMessagePopoverButton, removeMessagePopoverButton } from "@api/MessagePopover";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, RestAPI } from "@webpack/common";

const EmojiParser = findByPropsLazy("convertSurrogateToName");

interface EmojiConfig {
    name: string;
    id: string | null;
}

const settings = definePluginSettings({
    emojis: {
        description: "Emojis for the message popover, one per line. Custom emojis: name:id. Unicode: paste the emoji.",
        type: OptionType.STRING,
        multiline: true,
        default: ""
    }
});

function parseEmojis(input: string): EmojiConfig[] {
    if (!input || !input.trim()) return [];
    return input
        .split("\n")
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => {
            const idx = s.indexOf(":");
            if (idx > 0) {
                const name = s.substring(0, idx);
                const id = s.substring(idx + 1);
                if (!name || !id || !/^\d+$/.test(id)) return null;
                return { name, id };
            }
            return { name: s, id: null };
        })
        .filter((e): e is EmojiConfig => e !== null);
}

function displayName(emoji: EmojiConfig): string {
    if (!emoji.id) {
        const resolved = EmojiParser.convertSurrogateToName(emoji.name);
        if (resolved) return `:${resolved}:    Click to react`;
        return `:${emoji.name}:    Click to react`;
    }
    return `:${emoji.name}:    Click to react`;
}

function reactionUrl(channelId: string, messageId: string, emoji: EmojiConfig): string {
    const param = emoji.id
        ? `${encodeURIComponent(emoji.name)}:${emoji.id}`
        : encodeURIComponent(emoji.name);
    return `/channels/${channelId}/messages/${messageId}/reactions/${param}/@me`;
}

function EmojiIcon({ emoji }: { emoji: EmojiConfig }) {
    if (emoji.id) {
        return (
            <img
                className="vc-customreacts-icon"
                src={`https://cdn.discordapp.com/emojis/${emoji.id}.png?size=40`}
                alt={emoji.name}
            />
        );
    }
    return <span className="vc-customreacts-unicode">{emoji.name}</span>;
}

const registered: string[] = [];

export default definePlugin({
    name: "CustomReacts",
    description: "Adds custom emoji reaction buttons to the message popover",
    authors: [{ name: "itssolar.dev", id: 864612087741546527n }],
    settings,
    dependencies: ["MessagePopoverAPI"],
    start() {
        for (const key of registered) removeMessagePopoverButton(key);
        registered.length = 0;

        const emojis = parseEmojis(settings.store.emojis);
        emojis.forEach((emoji, i) => {
            const key = `CustomReacts-${i}`;
            registered.push(key);

            addMessagePopoverButton(
                key,
                msg => {
                    const channel = ChannelStore.getChannel(msg.channel_id);
                    if (!channel) return null;
                    return {
                        label: displayName(emoji),
                        icon: () => <EmojiIcon emoji={emoji} />,
                        message: msg,
                        channel,
                        onClick: () => {
                            RestAPI.put({ url: reactionUrl(msg.channel_id, msg.id, emoji) }).catch(() => {});
                        }
                    };
                },
                () => <EmojiIcon emoji={emojis[0] ?? { name: "😀", id: null }} />
            );
        });
    },
    stop() {
        for (const key of registered) removeMessagePopoverButton(key);
        registered.length = 0;
    }
});
