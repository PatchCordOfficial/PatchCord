/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import ErrorBoundary from "@components/ErrorBoundary";
import globalBadges from "@patchcordplugins/globalBadges";
import BadgeAPIPlugin from "@plugins/_api/badges";
import { ComponentType, HTMLProps } from "react";

import { isPluginEnabled } from "./PluginManager";

export const enum BadgePosition {
    START,
    END
}

export interface ProfileBadge {
    /**
     * Badge id, unused by vencord, required by discord
     */
    id: string,
    /** The tooltip to show on hover. Required for image badges */
    description?: string;
    /** Custom component for the badge (tooltip not included) */
    component?: ComponentType<ProfileBadge & BadgeUserArgs>;
    /** The custom image to use */
    iconSrc?: string;
    link?: string;
    /** Action to perform when you click the badge */
    onClick?(event: React.MouseEvent, props: ProfileBadge & BadgeUserArgs): void;
    /** Action to perform when you right click the badge */
    onContextMenu?(event: React.MouseEvent, props: BadgeUserArgs & BadgeUserArgs): void;
    /** Should the user display this badge? */
    shouldShow?(userInfo: BadgeUserArgs): boolean;
    /** Optional props (e.g. style) for the badge, ignored for component badges */
    props?: HTMLProps<HTMLImageElement>;
    /** Insert at start or end? */
    position?: BadgePosition;
    /** The badge name to display, Discord uses this. Required for component badges */
    key?: string;

    /**
     * Allows dynamically returning multiple badges.
     * Must not call hooks
     */
    getBadges?(userInfo: BadgeUserArgs): ProfileBadge[];
}

const Badges = new Set<ProfileBadge>();

/**
 * Register a new badge with the Badges API
 * @param badge The badge to register
 */
export function addProfileBadge(badge: ProfileBadge) {
    badge.component &&= ErrorBoundary.wrap(badge.component, { noop: true });
    Badges.add(badge);
}

/**
 * Unregister a badge from the Badges API
 * @param badge The badge to remove
 */
export function removeProfileBadge(badge: ProfileBadge) {
    return Badges.delete(badge);
}

/**
 * Inject badges into the profile badges array.
 * You probably don't need to use this.
 */
export function _getBadges(args: BadgeUserArgs) {
    const badges = [] as ProfileBadge[];
    for (const badge of Badges) {
        if (badge.shouldShow && !badge.shouldShow(args)) {
            continue;
        }

        const b = badge.getBadges
            ? badge.getBadges(args).map(badge => ({
                ...args,
                ...badge,
                component: badge.component && ErrorBoundary.wrap(badge.component, { noop: true })
            }))
            : [{ ...args, ...badge }];

        if (badge.position === BadgePosition.START) {
            badges.unshift(...b);
        } else {
            badges.push(...b);
        }
    }

    const donorBadges = BadgeAPIPlugin.getDonorBadges(args.userId);
    const equicordDonorBadges = BadgeAPIPlugin.getEquicordDonorBadges(args.userId);
    const GlobalBadges = isPluginEnabled(globalBadges.name) ? globalBadges.getGlobalBadges(args.userId) : false;

    // These three lists are all sourced from JSON badge feeds, and it's
    // possible (e.g. if GlobalBadges' configurable API URL happens to point
    // at the same badges.json PatchCord's donor feed already hardcodes) for
    // the exact same badge to show up in more than one of them. Without
    // deduping here, that badge would render twice on the user's real
    // profile even though it only appears once in the Custom Badges tab
    // (which only ever reads from GlobalBadges' own list). We keep the
    // first occurrence in equicordDonorBadges -> donorBadges -> GlobalBadges
    // order, which matches the visual order these were already unshifted in.
    const seenIcons = new Set<string>();
    const extraBadges: ProfileBadge[] = [];
    for (const list of [equicordDonorBadges, donorBadges, GlobalBadges]) {
        if (!list) continue;
        for (const badge of list) {
            const dedupeKey = badge.iconSrc ?? badge.description;
            if (dedupeKey) {
                if (seenIcons.has(dedupeKey)) continue;
                seenIcons.add(dedupeKey);
            }
            extraBadges.push({ ...args, ...badge });
        }
    }

    // do globalbadges/donor/equicord-donor first so they show before the
    // contrib badges, in equicordDonorBadges -> donorBadges -> GlobalBadges
    // order (unshifting the whole deduped list keeps that same order).
    if (extraBadges.length) {
        badges.unshift(...extraBadges);
    }

    return badges;
}

export interface BadgeUserArgs {
    userId: string;
    guildId: string;
}
