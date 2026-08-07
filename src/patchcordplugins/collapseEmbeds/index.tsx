/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

const logger = new Logger("CollapseEmbeds");

const settings = definePluginSettings({
    collapsed: {
        description: "Collapse embeds to a single line showing who sent them",
        type: OptionType.BOOLEAN,
        default: false
    }
});

function AuthorName(message: any): string {
    return message?.author?.globalName ?? message?.author?.username ?? "unknown";
}

export default definePlugin({
    name: "CollapseEmbeds",
    description: "Collapses embeds into a placeholder showing who sent them",
    authors: [{ name: "itssolar.dev", id: 864612087741546527n }],
    settings,
    requiresRestart: false,
    dependencies: ["ChatInputButtonAPI"],
    patches: [
        {
            find: "renderEmbeds(",
            replacement: {
                match: /(?<=renderEmbeds\(\i\){.+?embeds\.map\(\((\i),\i\)?=>{)/,
                replace: "$&if($self.isCollapsed())return $self.renderPlaceholder($1,arguments[0]);"
            }
        }
    ],
    isCollapsed() {
        return settings.store.collapsed;
    },
    renderPlaceholder(embed: any, message: any) {
        return (
            <div className="vc-collapse-placeholder">
                <span className="vc-collapse-placeholder-text">
                    Collapsed embed sent by {AuthorName(message)}
                </span>
            </div>
        );
    },
    start() {
        logger.info("CollapseEmbeds started");

        addChatBarButton("CollapseEmbeds", () => {
            const collapsed = settings.use(["collapsed"]).collapsed;

            return (
                <button
                    className="vc-collapse-embeds-btn"
                    onClick={() => {
                        settings.store.collapsed = !settings.store.collapsed;
                    }}
                    aria-label={collapsed ? "Expand embeds" : "Collapse embeds"}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        {collapsed ? (
                            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                        ) : (
                            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                        )}
                    </svg>
                    <span className="vc-collapse-embeds-label">
                        {collapsed ? "Expand" : "Collapse"}
                    </span>
                </button>
            );
        }, () => (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
            </svg>
        ));
    },
    stop() {
        logger.info("CollapseEmbeds stopped");
        removeChatBarButton("CollapseEmbeds");
    }
});
