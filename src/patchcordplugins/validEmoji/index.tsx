/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { EmojiUtils, React, useState } from "@webpack/common";
import type { ReactElement } from "react";

const EmojiParser = findByPropsLazy("convertSurrogateToName");

const FALLBACK_SURROGATE = "\u2753";

const EMOJI_CHAR = "(?:\\p{Extended_Pictographic}|\\p{Emoji}|[\\u{1F000}-\\u{1FFFF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{2190}-\\u{21FF}\\u{2300}-\\u{23FF}\\u{E000}-\\u{F8FF}\\u{F0000}-\\u{FFFFD}\\u{100000}-\\u{10FFFD}])";

const EMOJI_REGEX = new RegExp(
    "^(?:" +
    "\\p{Regional_Indicator}\\p{Regional_Indicator}" +
    "|[0-9#*]\\uFE0F?\\u20E3" +
    `|${EMOJI_CHAR}\\uFE0F?\\p{Emoji_Modifier}?(?:\\u200D${EMOJI_CHAR}\\uFE0F?\\p{Emoji_Modifier}?)*` +
    ")",
    "u"
);

function resolveURL(surrogate: string): string | undefined {
    const src = EmojiUtils.getURL(surrogate);
    return typeof src === "string" && src.length > 0 ? src : undefined;
}

function EmojiImage({ surrogate }: { surrogate: string }) {
    const [broken, setBroken] = useState(false);

    const wantsFallback = broken || !resolveURL(surrogate);
    const effective = wantsFallback ? FALLBACK_SURROGATE : surrogate;
    const src = resolveURL(effective);
    const name = EmojiParser.convertSurrogateToName(effective);

    return (
        <img
            className="vc-validemoji-img"
            src={src}
            alt={surrogate}
            aria-label={name}
            draggable={false}
            onError={() => {
                if (!broken) setBroken(true);
            }}
        />
    );
}

export default definePlugin({
    name: "ValidEmoji",
    description: "Replaces emojis that fail to render with a fallback instead of showing an empty box",
    authors: [{ name: "itssolar.dev", id: 864612087741546527n }],
    patches: [
        {
            find: "emoji:{order:",
            group: true,
            replacement: {
                match: /emoji:\{order:(\i\.\i\.order)/,
                replace: "validEmoji:$self.getEmojiRule($1),$&"
            }
        },
        {
            find: "Unknown markdown rule:",
            group: true,
            replacement: {
                match: /roleMention:{type:/,
                replace: "validEmoji:{type:\"inlineObject\"},$&"
            }
        }
    ],
    getEmojiRule(order: number) {
        return {
            order: order - 0.5,
            match(content: string) {
                return EMOJI_REGEX.exec(content);
            },
            parse(match: RegExpExecArray, _: unknown, parseProps: Record<string, any>) {
                if (!parseProps?.messageId) {
                    return { type: "text", content: match[0] };
                }
                return { type: "validEmoji", surrogate: match[0] };
            },
            react: ErrorBoundary.wrap(({ surrogate }: { surrogate: string }) => {
                return <EmojiImage surrogate={surrogate} />;
            }, {
                fallback: data => {
                    const child = data.children as ReactElement<any>;
                    return <>{child.props?.surrogate}</>;
                }
            })
        };
    }
});
