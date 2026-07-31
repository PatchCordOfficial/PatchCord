/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { BadgePosition, ProfileBadge } from "@api/Badges";
import { Button } from "@components/Button";
import { BadgeIcon } from "@components/Icons";
import { BadgeContextMenu } from "@plugins/_api/badges";
import SettingsPlugin from "@plugins/_core/settings";
import { Devs, EquicordDevs } from "@utils/constants";
import { openInviteModal } from "@utils/discord";
import { removeFromArray } from "@utils/misc";
import definePlugin from "@utils/types";
import { ContextMenuApi, FluxDispatcher, React, Toasts } from "@webpack/common";
import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";

import CustomBadgesTab from "./CustomBadgesTab";
import { settings } from "./settings";
import { cl, getGlobalBadges, grantNewUserBadgeIfNeeded, INVITE_LINK, loadBadges } from "./utils";

let intervalId: any;

// Same reasoning as BadgeAPI: reopening a profile shouldn't have to wait up
// to 30 minutes for a server-side badge change to show up, but we also
// don't want to hit the API on every single profile view. This is kept
// short so that badge changes show up in (near) real time instead of
// requiring a full client restart.
const PROFILE_OPEN_REFETCH_THROTTLE = 5 * 1000;
let lastProfileTriggeredRefetch = 0;

function onUserProfileFetchSuccess() {
    const now = Date.now();
    if (now - lastProfileTriggeredRefetch < PROFILE_OPEN_REFETCH_THROTTLE) return;
    lastProfileTriggeredRefetch = now;

    loadBadges();
}

export default definePlugin({
    name: "GlobalBadges",
    description: "Adds global badges from other client mods",
    tags: ["Appearance"],
    authors: [Devs.HypedDomi, EquicordDevs.Wolfie, Devs.thororen],
    dependencies: ["Settings"],
    settings,
    settingsAboutComponent: () => (
        <>
            <Button
                variant="link"
                className={cl("settings-button")}
                onClick={() => openInviteModal(INVITE_LINK)}
            >
                Join GlobalBadges Server
            </Button>
        </>
    ),
    async start() {
        await loadBadges();
        await grantNewUserBadgeIfNeeded();
        clearInterval(intervalId);
        intervalId = setInterval(loadBadges, 1000 * 60 * 30);

        FluxDispatcher.subscribe("USER_PROFILE_FETCH_SUCCESS", onUserProfileFetchSuccess);

        SettingsPlugin.customEntries.push({
            key: "equicord_custom_badges",
            title: "Custom Badges",
            Component: CustomBadgesTab,
            Icon: BadgeIcon
        });
    },
    async stop() {
        clearInterval(intervalId);
        FluxDispatcher.unsubscribe("USER_PROFILE_FETCH_SUCCESS", onUserProfileFetchSuccess);
        removeFromArray(SettingsPlugin.customEntries, e => e.key === "equicord_custom_badges");
    },
    commands: [
        {
            name: "globalbadges-refresh",
            description: "Refetch Global Badges and reload custom badge data",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_opts, ctx) => {
                const success = await loadBadges();
                if (success) {
                    sendBotMessage(ctx.channel.id, {
                        content: "Global Badges refreshed successfully. If badges still look wrong, restart the client."
                    });
                } else {
                    sendBotMessage(ctx.channel.id, {
                        content: `Failed to refresh Global Badges: ${getLastLoadError() ?? "unknown error"}`
                    });
                }
            }
        },
        {
            name: "refresh-badges",
            description: "Refetch Global Badges and reload custom badge data",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_opts, ctx) => {
                const success = await loadBadges();
                if (success) {
                    sendBotMessage(ctx.channel.id, {
                        content: "Global Badges refreshed successfully. If badges still look wrong, restart the client."
                    });
                } else {
                    sendBotMessage(ctx.channel.id, {
                        content: `Failed to refresh Global Badges: ${getLastLoadError() ?? "unknown error"}`
                    });
                }
            }
        },
        {
            name: "sync-badges",
            description: "Refresh badge data from the configured GlobalBadges API",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_opts, ctx) => {
                const success = await loadBadges();
                if (success) {
                    sendBotMessage(ctx.channel.id, {
                        content: "Global Badges refreshed successfully. If badges still look wrong, restart the client."
                    });
                } else {
                    sendBotMessage(ctx.channel.id, {
                        content: `Failed to refresh Global Badges: ${getLastLoadError() ?? "unknown error"}`
                    });
                }
            }
        }
    ],
    toolboxActions: {
        async "Refetch Global Badges"() {
            await loadBadges();
            Toasts.show({
                id: Toasts.genId(),
                message: "Successfully refetched global badges!",
                type: Toasts.Type.SUCCESS
            });
        }
    },
    get GlobalBadges() {
        return getGlobalBadges();
    },
    getGlobalBadges(userId: string) {
        return getGlobalBadges()[userId]?.map((badge, idx) => ({
            id: `global_badges_badge_${idx}`,
            iconSrc: badge.badge,
            description: badge.tooltip,
            position: BadgePosition.START,
            props: {
                style: {
                    borderRadius: "50%",
                    transform: "scale(0.9)"
                }
            },
            onContextMenu(event, badge) {
                ContextMenuApi.openContextMenu(event, () => <BadgeContextMenu badge={badge} />);
            },
        } satisfies ProfileBadge));
    }
});
