/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { addMessagePopoverButton, removeMessagePopoverButton } from "@api/MessagePopover";
import { definePluginSettings } from "@api/Settings";
import { ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Logger } from "@utils/Logger";
import definePlugin, { IconProps, OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Message } from "@vencord/discord-types";
import { ChannelStore, Constants, FluxDispatcher, Menu, RestAPI, showToast, Toasts, UserStore } from "@webpack/common";
import { React } from "@webpack/common";

const EmojiParser = findByPropsLazy("convertSurrogateToName");
const logger = new Logger("CustomReacts");

interface EmojiConfig {
    name: string;
    id: string | null;
    animated: boolean;
}

const settings = definePluginSettings({
    emojis: {
        description: "Emojis for the message popover, one per line. Paste a custom emoji (<:name:id> or <a:name:id>), type name:id, or paste a unicode emoji.",
        type: OptionType.STRING,
        multiline: true,
        default: "",
        onChange: () => syncButtons()
    },
    onlyShowCustomReacts: {
        description: "Hide Discord's built-in message popover buttons (react, reply, more, etc.) so only your Quick Reacts show",
        type: OptionType.BOOLEAN,
        default: false
    }
});

const customEmojiTag = /^<(a)?:(\w+):(\d+)>$/;

function parseEmojiLine(line: string): EmojiConfig | null {
    const s = line.trim();
    if (!s) return null;

    const tag = customEmojiTag.exec(s);
    if (tag) {
        const [, animated, name, id] = tag;
        return { name, id, animated: !!animated };
    }

    const idx = s.indexOf(":");
    if (idx > 0) {
        const name = s.slice(0, idx).trim();
        const id = s.slice(idx + 1).trim();
        if (name && /^\d+$/.test(id)) return { name, id, animated: false };
    }

    return { name: s, id: null, animated: false };
}

function parseEmojis(input: string): EmojiConfig[] {
    if (!input?.trim()) return [];

    const seen = new Set<string>();
    const result: EmojiConfig[] = [];

    for (const line of input.split("\n")) {
        const emoji = parseEmojiLine(line);
        if (!emoji) continue;

        const dedupeKey = emoji.id ?? emoji.name;
        if (seen.has(dedupeKey)) continue;

        seen.add(dedupeKey);
        result.push(emoji);
    }

    return result;
}

function formatEmoji(emoji: EmojiConfig): string {
    return emoji.id ? `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>` : emoji.name;
}

function displayName(emoji: EmojiConfig): React.ReactNode {
    // convertSurrogateToName already returns names wrapped in colons
    // (e.g. "joy" -> ":joy:") for every unicode emoji, not just this one -
    // strip those off before we add our own, or it doubles up to "::joy::".
    const raw = emoji.id ? emoji.name : (EmojiParser?.convertSurrogateToName?.(emoji.name) ?? emoji.name);
    const label = raw.replace(/^:+|:+$/g, "");

    // Two-line tooltip: emoji name on top, "Click to react" below - a real
    // <br/> so it works regardless of whitespace handling, and regardless
    // of how long/short the emoji name is.
    return <>:{label}:<br />Click to react</>;
}

function reactionKey(emoji: EmojiConfig): string {
    // Don't encodeURIComponent here - Constants.Endpoints.REACTIONS/REACTION
    // already encodes this param internally. Pre-encoding it caused a double
    // encode (e.g. "%F0%9F%98%82" -> "%25F0%259F%2598%2582"), which the API
    // rejects as "Unknown Emoji" for anything that actually needs encoding.
    return emoji.id
        ? `${emoji.name}:${emoji.id}`
        : emoji.name;
}

function reactionUrl(channelId: string, messageId: string, emoji: EmojiConfig): string {
    return `${Constants.Endpoints.REACTIONS(channelId, messageId, reactionKey(emoji))}/@me`;
}

// Discord's native quick-react buttons feel instant because they dispatch an
// optimistic MESSAGE_REACTION_ADD locally right away and let the REST call /
// gateway confirm afterward - the UI never waits on a round trip. We were
// only firing the REST call, so the reaction only appeared once the gateway
// echoed it back (the 2-3s delay). Mirror the same optimistic flow here, and
// roll it back if the request actually fails.
function reactToMessage(msg: Message, emoji: EmojiConfig) {
    const userId = UserStore.getCurrentUser()?.id;
    const reactionEmoji = { id: emoji.id, name: emoji.name, animated: emoji.animated };

    const dispatchReaction = (type: "MESSAGE_REACTION_ADD" | "MESSAGE_REACTION_REMOVE") => {
        if (!userId) return;
        FluxDispatcher.dispatch({
            type,
            optimistic: true,
            channelId: msg.channel_id,
            messageId: msg.id,
            messageAuthorId: msg.author?.id,
            userId,
            emoji: reactionEmoji
        });
    };

    dispatchReaction("MESSAGE_REACTION_ADD");

    RestAPI.put({ url: reactionUrl(msg.channel_id, msg.id, emoji) })
        .catch(err => {
            logger.error(`Failed to add reaction ${reactionKey(emoji)}`, err);
            showToast(`Failed to react with :${emoji.name}:`, Toasts.Type.FAILURE);
            // roll back the optimistic add since it never actually happened
            dispatchReaction("MESSAGE_REACTION_REMOVE");
        });
}

function addEmojiToSettings(emoji: EmojiConfig): boolean {
    const current = parseEmojis(settings.store.emojis);
    const dedupeKey = emoji.id ?? emoji.name;

    if (current.some(e => (e.id ?? e.name) === dedupeKey)) {
        showToast(`:${emoji.name}: is already in your Quick Reacts`, Toasts.Type.MESSAGE);
        return false;
    }

    const formatted = formatEmoji(emoji);
    settings.store.emojis = settings.store.emojis?.trim()
        ? `${settings.store.emojis}\n${formatted}`
        : formatted;

    showToast(`Added :${emoji.name}: to Quick Reacts`, Toasts.Type.SUCCESS);
    return true;
}

function removeEmojiFromSettings(name: string): boolean {
    const current = parseEmojis(settings.store.emojis);
    const next = current.filter(e => e.name !== name && e.id !== name);

    if (next.length === current.length) {
        showToast(`:${name}: is not in your Quick Reacts`, Toasts.Type.FAILURE);
        return false;
    }

    settings.store.emojis = next.map(formatEmoji).join("\n");
    showToast(`Removed :${name}: from Quick Reacts`, Toasts.Type.SUCCESS);
    return true;
}

const BUTTON_SELECTOR = '[role="button"], button';

// Discord's native "quick react" shortcut buttons all carry this aria-label
// pattern (e.g. "Click to react with joy"). Reply / Add Reaction / More /
// Translate etc. use their own distinct labels, so this lets us target only
// the native emoji shortcuts without touching the rest of the toolbar.
const NATIVE_QUICK_REACT_LABEL = /^click to react with /i;

// Discord sometimes wraps each popover button in its own extra <span>/<div>,
// so the shared row isn't always the button's direct parentElement (that's
// often just a single-button wrapper). Walk up until we find the ancestor
// that actually contains more than one button - that's the real row that
// holds all the popover buttons together.
function findSharedRow(button: HTMLElement): HTMLElement | null {
    let node: HTMLElement | null = button.parentElement;
    let hops = 0;

    while (node && hops < 6) {
        if (node.querySelectorAll(BUTTON_SELECTOR).length > 1) return node;
        node = node.parentElement;
        hops++;
    }

    return null;
}

function updateRowVisibility(row: HTMLElement, onlyShowCustomReacts: boolean) {
    row.querySelectorAll<HTMLElement>(BUTTON_SELECTOR).forEach(btn => {
        if (btn.classList.contains("vc-customreacts-button")) return;

        const label = btn.getAttribute("aria-label") ?? "";
        if (!NATIVE_QUICK_REACT_LABEL.test(label)) return; // leave Reply/Add Reaction/More/etc alone

        btn.classList.toggle("vc-customreacts-hide-native", onlyShowCustomReacts);
    });
}

function markButtonRow(node: HTMLElement | null, onlyShowCustomReacts: boolean) {
    if (!node) return;

    const button = node.closest<HTMLElement>(BUTTON_SELECTOR);
    if (!button) return;

    button.classList.add("vc-customreacts-button");

    const row = findSharedRow(button);
    if (!row) return;

    // Discord sizes this row's container for its own small, fixed set of
    // buttons. Once we add more custom buttons than it was built for, the
    // row overflows that fixed width and clips - which looks like buttons
    // (native or custom) just disappearing. Let the row wrap instead of
    // clipping, and relax its parent's width/overflow so wrapping actually
    // has room to happen, regardless of how many buttons there are.
    row.classList.add("vc-customreacts-row-flex");
    row.parentElement?.classList.add("vc-customreacts-row-parent");

    updateRowVisibility(row, onlyShowCustomReacts);
}

function EmojiIcon({ emoji, className, ...props }: { emoji: EmojiConfig; className?: string; } & IconProps) {
    // Subscribe so this component re-renders whenever the setting changes,
    // not just on initial mount (ref callbacks only fire on mount/unmount).
    const { onlyShowCustomReacts } = settings.use(["onlyShowCustomReacts"]);
    const ref = React.useRef<HTMLElement | null>(null);

    React.useEffect(() => {
        markButtonRow(ref.current, onlyShowCustomReacts);
    }, [onlyShowCustomReacts]);

    const setRef = (node: HTMLElement | null) => {
        ref.current = node;
        markButtonRow(node, onlyShowCustomReacts);
    };

    if (emoji.id) {
        return (
            <img
                {...props}
                ref={setRef}
                className={["vc-customreacts-icon", className].filter(Boolean).join(" ")}
                src={`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}?size=40`}
                alt={emoji.name}
            />
        );
    }

    return (
        <span {...props} ref={setRef} className={["vc-customreacts-unicode", className].filter(Boolean).join(" ")}>
            {emoji.name}
        </span>
    );
}

const registered: string[] = [];

function syncButtons() {
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
                    // MessagePopoverButtonItem types label as `string`, but the
                    // native tooltip renderer just renders whatever ReactNode
                    // it's given - cast so we can use a real <br/> for two lines.
                    label: displayName(emoji) as unknown as string,
                    icon: () => <EmojiIcon emoji={emoji} />,
                    message: msg,
                    channel,
                    onClick: () => reactToMessage(msg, emoji)
                };
            },
            () => <EmojiIcon emoji={emoji} />
        );
    });
}

const patchMessageContextMenu: NavContextMenuPatchCallback = (children, { message }) => {
    const reactions = message?.reactions;
    if (!reactions?.length) return;

    const group = findGroupChildrenByChildId("reply", children) ?? children;

    group.push(
        <Menu.MenuItem
            id="vc-customreacts-quickadd"
            key="vc-customreacts-quickadd"
            label="Add to Quick Reacts"
        >
            {reactions.map(r => {
                const emoji: EmojiConfig = {
                    name: r.emoji.name,
                    id: r.emoji.id ?? null,
                    animated: !!r.emoji.animated
                };
                const id = emoji.id ?? emoji.name;

                return (
                    <Menu.MenuItem
                        id={`vc-customreacts-quickadd-${id}`}
                        key={id}
                        label={`:${emoji.name}:`}
                        action={() => addEmojiToSettings(emoji)}
                    />
                );
            })}
        </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "CustomReacts",
    description: "Adds custom emoji reaction buttons to the message popover",
    authors: [{ name: "itssolar.dev", id: 864612087741546527n }],
    settings,
    dependencies: ["MessagePopoverAPI", "CommandsAPI"],
    contextMenus: {
        "message": patchMessageContextMenu
    },
    commands: [
        {
            name: "CustomReact",
            description: "Get the formatted string for the CustomReacts plugin settings",
            options: [
                {
                    name: "emoji_name",
                    description: "The emoji name (for unicode, paste the emoji itself)",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "emoji_id",
                    description: "The emoji ID (for custom emojis only)",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                }
            ],
            execute(args, ctx) {
                const name = findOption(args, "emoji_name", "");
                const id = findOption(args, "emoji_id", "");
                const result = id ? `${name}:${id}` : name;
                sendBotMessage(ctx.channel.id, { content: `\`${result}\`` });
            }
        },
        {
            name: "CustomReactAdd",
            description: "Add an emoji to your Quick Reacts",
            options: [
                {
                    name: "emoji_name",
                    description: "The emoji name (only needed as a fallback if 'emoji' can't be used)",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                },
                {
                    name: "emoji",
                    description: "Paste the emoji itself (custom or unicode) - easiest option",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                },
                {
                    name: "emoji_id",
                    description: "Fallback: the emoji ID, only needed if pasting the emoji directly doesn't work",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                }
            ],
            execute(args, ctx) {
                const name = findOption(args, "emoji_name", "");
                const pasted = findOption(args, "emoji", "");
                const id = findOption(args, "emoji_id", "");

                // Preferred path: parse whatever was pasted into the "emoji" option.
                // This handles both custom emoji tags (<:name:id>) and plain unicode.
                let emoji = pasted.trim() ? parseEmojiLine(pasted) : null;

                // Fallback path: pasting didn't work (e.g. the emoji got stripped down
                // to plain text without an id because the user can't use it directly),
                // so fall back to the manually-provided name/id instead.
                if (!emoji || (!emoji.id && id)) {
                    if (!name && !emoji) {
                        sendBotMessage(ctx.channel.id, {
                            content: "Please paste an `emoji`, or provide at least an `emoji_name` (with `emoji_id` if it's a custom emoji you can't paste directly)."
                        });
                        return;
                    }

                    emoji = {
                        name: name || emoji!.name,
                        id: id || emoji?.id || null,
                        animated: emoji?.animated ?? false
                    };
                }

                const added = addEmojiToSettings(emoji);
                if (added) sendBotMessage(ctx.channel.id, { content: `Added \`${formatEmoji(emoji)}\` to your Quick Reacts.` });
            }
        },
        {
            name: "CustomReactRemove",
            description: "Remove an emoji from your Quick Reacts",
            options: [
                {
                    name: "emoji_name_or_id",
                    description: "The emoji name or ID to remove",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                }
            ],
            execute(args, ctx) {
                const nameOrId = findOption(args, "emoji_name_or_id", "");
                const removed = removeEmojiFromSettings(nameOrId);
                if (removed) sendBotMessage(ctx.channel.id, { content: `Removed \`${nameOrId}\` from your Quick Reacts.` });
            }
        },
        {
            name: "CustomReactList",
            description: "List your currently configured Quick Reacts",
            options: [],
            execute(_, ctx) {
                const emojis = parseEmojis(settings.store.emojis);
                const content = emojis.length
                    ? emojis.map(e => `:${e.name}:`).join(" ")
                    : "You don't have any Quick Reacts configured yet.";
                sendBotMessage(ctx.channel.id, { content });
            }
        }
    ],
    start() {
        syncButtons();
    },
    stop() {
        for (const key of registered) removeMessagePopoverButton(key);
        registered.length = 0;
    }
});
