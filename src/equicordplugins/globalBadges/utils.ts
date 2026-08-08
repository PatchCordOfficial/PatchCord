/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { DataStore } from "@api/index";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import { UserProfileStore, UserStore } from "@webpack/common";

import { settings } from "./settings";

export let GlobalBadges = {};
export let lastLoadError: string | null = null;

const NEW_USER_BADGE_GRANTED_KEY = "GlobalBadges_newUserBadgeGranted";
// Server-side endpoint that should add { userId: [NEW_USER_BADGE] } to
// badges.json. This file only shows badges, it never writes to
// badges.json itself, so this call is what actually needs to exist on
// the patchcord.itssolar.dev side for the badge to persist and show up
// for everyone else, not just locally.
const NEW_USER_BADGE_ENDPOINT = "https://patchcord.itssolar.dev/badges/register.php";
export const NEW_USER_BADGE = {
    tooltip: "PatchCord User",
    badge: "https://patchcord.itssolar.dev/user.png"
};

/**
 * Gives every first-time PatchCord user the default "PatchCord User" badge.
 * Runs once per install: the badge is shown locally straight away, and we
 * also ping the server so it gets written into badges.json for everyone
 * else to see too.
 */
export async function grantNewUserBadgeIfNeeded() {
    const alreadyGranted = await DataStore.get(NEW_USER_BADGE_GRANTED_KEY);
    if (alreadyGranted) return;

    const userId = UserStore.getCurrentUser()?.id;
    if (!userId) return;

    await DataStore.set(NEW_USER_BADGE_GRANTED_KEY, true);

    const existing = GlobalBadges[userId] ?? [];
    if (!existing.some(b => b.badge === NEW_USER_BADGE.badge)) {
        GlobalBadges = { ...GlobalBadges, [userId]: [...existing, NEW_USER_BADGE] };
        UserStore.emitChange();
        UserProfileStore.emitChange();
    }

    try {
        await fetch(NEW_USER_BADGE_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, badge: NEW_USER_BADGE.badge, tooltip: NEW_USER_BADGE.tooltip })
        });
    } catch (e) {
        new Logger("GlobalBadges").warn("Couldn't register the new user badge with the server, showing it locally for now.", e);
    }
}
// Directly importing the mutable `GlobalBadges` binding elsewhere in the
// codebase can end up capturing a stale snapshot depending on how that
// module gets bundled, since it's plain reassignment (`GlobalBadges = ...`)
// rather than mutation of a stable object. Consumers outside of this file
// should call this function instead of importing `GlobalBadges` directly,
// so they always read the current value.
export function getGlobalBadges() {
    return GlobalBadges;
}
export function getLastLoadError() {
    return lastLoadError;
}
export const INVITE_LINK = "kwHCJPxp8t";
export const cl = classNameFactory("vc-global-badges-");
export const serviceMap: Record<string, string> = {
    badgevault: "BadgeVault",
    nekocord: "Nekocord",
    reviewdb: "ReviewDB",
    aero: "Aero",
    aliucord: "Aliucord",
    raincord: "Raincord",
    velocity: "Velocity",
    enmity: "Enmity",
    paicord: "Paicord",
    bunny: "Bunny",
    goosemod: "GooseMod",
    replugged: "Replugged",
    betterdiscord: "BetterDiscord",
    vendroidenhanced: "VendroidEnhanced",
    revenge: "Revenge",
    record: "ReCord",
    vencord: "Vencord",
    equicord: "Equicord"
};

// Some self-hosted badge sources are a single static JSON file (e.g. ending
// in ".json") rather than a GlobalBadges-compatible REST API that exposes a
// "/users" route. In that case we should fetch the URL as-is instead of
// blindly appending "/users" to it, otherwise we always 404.
function resolveBadgesUrl(apiUrl: string) {
    if (/\.json(?:$|[?#])/i.test(apiUrl)) return apiUrl;
    return apiUrl.endsWith("/") ? apiUrl + "users" : apiUrl + "/users";
}

function normalizeModDisplay(mod?: string) {
    if (!mod) return undefined;
    return serviceMap[mod] ?? `${mod.charAt(0).toUpperCase()}${mod.slice(1)}`;
}

export async function loadBadges() {
    const url = resolveBadgesUrl(settings.store.apiUrl);

    const logger = new Logger("GlobalBadges");

    let globalBadges: { users?: Record<string, unknown>; };
    try {
        // "no-store" (rather than "no-cache") guarantees we never get a
        // stale, conditionally-revalidated response back, which is part of
        // what caused badge changes to not show up without a full restart.
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`${url} responded with ${res.status}`);

        const data = await res.json();

        if (!data || typeof data !== "object") {
            throw new Error("Badge API returned invalid JSON shape");
        }

        globalBadges = (data as { users?: Record<string, unknown>; }).users ? data as { users: Record<string, unknown>; } : { users: data as Record<string, unknown> };
        lastLoadError = null;
    } catch (e) {
        lastLoadError = e instanceof Error ? e.message : String(e);
        new Logger("GlobalBadges").error(
            `Failed to load global badges from ${url}.`,
            e
        );
        return false;
    }

    const filteredUsers: Record<string, Array<Record<string, any>>> = {};
    const rawUsers = globalBadges.users ?? {};

    if (typeof rawUsers !== "object" || Array.isArray(rawUsers)) {
        lastLoadError = "Badge API returned an invalid users object.";
        return false;
    }

    for (const key of Object.keys(rawUsers)) {
        const rawBadges = Array.isArray(rawUsers[key]) ? rawUsers[key] : [];
        filteredUsers[key] = rawBadges
            .filter((badge): badge is Record<string, unknown> => badge && typeof badge === "object")
            .map((badge, idx) => {
                const tooltip = typeof badge.tooltip === "string" ? badge.tooltip : "";
                const badgeUrl = typeof badge.badge === "string" ? badge.badge : "";
                const mod = typeof badge.mod === "string" ? badge.mod.toLowerCase() : undefined;

                if (!badgeUrl || !tooltip) {
                    logger.debug("Skipping invalid badge entry", { userId: key, badge });
                    return null;
                }

                // Removed the "patchcord" only filter so badges from all clients are shown.
                const modDisplay = normalizeModDisplay(mod);
                let renderedTooltip = tooltip;
                
                if (modDisplay && settings.store.showModStyle !== "none") {
                    if (settings.store.showModStyle === "prefix") {
                        renderedTooltip = `[${modDisplay}] ${tooltip}`;
                    } else if (settings.store.showModStyle === "suffix") {
                        renderedTooltip = `${tooltip} [${modDisplay}]`;
                    }
                }

                return {
                    ...badge,
                    key: `${tooltip}-${idx}`,
                    tooltip: renderedTooltip,
                    badge: badgeUrl
                };
            })
            .filter((badge): badge is Record<string, any> => badge !== null);

        if (rawBadges.length && !filteredUsers[key].length) {
            logger.debug("All badges filtered out for user", { userId: key, rawBadges });
        }
    }

    logger.info("Badges loaded", { filteredUserCount: Object.keys(filteredUsers).length });

    GlobalBadges = filteredUsers;

    // Without this, freshly fetched badges only appear after a full reload,
    // since nothing tells any open profile popout/modal to re-render.
    UserStore.emitChange();
    UserProfileStore.emitChange();

    return true;
}
