/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { CopyIdIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings";
import { TooltipContainer } from "@components/TooltipContainer";
import { copyToClipboard } from "@utils/clipboard";
import { classNameFactory } from "@utils/css";
import { fetchUserProfile } from "@utils/discord";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { Modal, openModal, Select, TextInput, Toasts, useEffect, useMemo, UserProfileStore, UserStore, useState } from "@webpack/common";

import { getGlobalBadges, getLastLoadError, loadBadges } from "./utils";

const cl = classNameFactory("vc-global-badges-tab-");

const REQUEST_BADGE_URL = "https://patchcord.itssolar.dev/request/index.php";

type SortMode = "badges-desc" | "name-asc" | "name-desc";

const sortOptions: { label: string; value: SortMode; }[] = [
    { label: "Most badges", value: "badges-desc" },
    { label: "Name (A-Z)", value: "name-asc" },
    { label: "Name (Z-A)", value: "name-desc" }
];

function requestBadge() {
    console.log("CustomBadges: requestBadge clicked", { url: REQUEST_BADGE_URL });
    VencordNative.native.openExternal(REQUEST_BADGE_URL);
}

function copyUserId(userId: string) {
    console.log("CustomBadges: copyUserId", { userId });
    copyToClipboard(userId);
    Toasts.show({
        id: Toasts.genId(),
        message: "Copied user ID to clipboard!",
        type: Toasts.Type.SUCCESS
    });
}

function BadgeChip({ badge }: { badge: { badge: string; tooltip: string; }; }) {
    const openPreview = () => {
        openModal(props => (
            <Modal {...props} title={badge.tooltip}>
                <div className={cl("preview-wrap")}>
                    <img className={cl("preview-image")} src={badge.badge} alt={badge.tooltip} loading="eager" />
                </div>
            </Modal>
        ));
    };

    return (
        <TooltipContainer text={badge.tooltip}>
            <button type="button" className={cl("chip")} onClick={openPreview}>
                <img className={cl("badge")} src={badge.badge} alt="" loading="lazy" />
            </button>
        </TooltipContainer>
    );
}

function BadgeCard({ userId, badges }: { userId: string; badges: any[]; }) {
    const [user, setUser] = useState(() => UserStore.getUser(userId));

    useEffect(() => {
        if (user) return;
        fetchUserProfile(userId)
            .then(() => setUser(UserStore.getUser(userId)))
            .catch(() => { });
    }, [userId, user]);

    if (!badges || !badges.length) return null;

    const avatarUrl = user?.getAvatarURL?.(void 0, 80, true)
        ?? "https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png";
    const username = user?.username ?? `Unknown User (${userId})`;
    const shortUserId = userId.length > 14 ? `${userId.slice(0, 8)}…${userId.slice(-4)}` : userId;

    return (
        <div className={cl("card")}>
            <div className={cl("card-accent")} />
            <img className={cl("avatar")} src={avatarUrl} alt="" />
            <div className={cl("info")}>
                <div className={cl("username-row")}>
                    <div className={cl("name-stack")}>
                        <Heading tag="h5" className={cl("username")}>{username}</Heading>
                        <div className={cl("user-id")}>{shortUserId}</div>
                    </div>
                    <TooltipContainer text="Copy user ID">
                        <button
                            className={cl("copy-id")}
                            onClick={() => copyUserId(userId)}
                            aria-label="Copy user ID"
                        >
                            <CopyIdIcon width={14} height={14} />
                        </button>
                    </TooltipContainer>
                </div>
                <div className={cl("badges")}>
                    {badges.map((badge, idx) => <BadgeChip key={idx} badge={badge} />)}
                </div>
            </div>
            <div className={cl("count-pill")}>{badges.length}</div>
        </div>
    );
}

function CustomBadgesTab() {
    const [search, setSearch] = useState("");
    const [sortMode, setSortMode] = useState<SortMode>("badges-desc");
    const [refreshing, setRefreshing] = useState(false);
    const [badgesMap, setBadgesMap] = useState<Record<string, Array<{badge: string, tooltip: string}>>>({});
    const [lastError, setLastError] = useState<string | null>(null);

    const fetchCustomBadges = async () => {
        setRefreshing(true);
        setLastError(null);
        try {
            const res = await fetch("https://patchcord.itssolar.dev/badges.json", { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            
            let users = data?.users || data;
            const parsedMap: Record<string, Array<any>> = {};
            
            if (typeof users === "object" && !Array.isArray(users)) {
                for (const key of Object.keys(users)) {
                    const rawBadges = Array.isArray(users[key]) ? users[key] : [];
                    parsedMap[key] = rawBadges.filter((b: any) => b && typeof b === "object" && typeof b.badge === "string" && typeof b.tooltip === "string");
                }
            }
            
            setBadgesMap(parsedMap);
        } catch (e) {
            setLastError(e instanceof Error ? e.message : String(e));
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCustomBadges();
    }, []);

    const userIds = useMemo(
        () => Object.keys(badgesMap).filter(id => (badgesMap[id]?.length ?? 0) > 0),
        [badgesMap]
    );

    const totalBadgeCount = useMemo(
        () => userIds.reduce((sum, id) => sum + (badgesMap[id]?.length ?? 0), 0),
        [userIds, badgesMap]
    );

    const filteredUserIds = useMemo(() => {
        let ids = userIds;

        if (search) {
            const q = search.toLowerCase();
            ids = ids.filter(id => {
                const username = UserStore.getUser(id)?.username?.toLowerCase() ?? "";
                return username.includes(q) || id.includes(q);
            });
        }

        const getName = (id: string) => UserStore.getUser(id)?.username ?? id;
        const getCount = (id: string) => badgesMap[id]?.length ?? 0;

        return [...ids].sort((a, b) => {
            switch (sortMode) {
                case "name-asc": return getName(a).localeCompare(getName(b));
                case "name-desc": return getName(b).localeCompare(getName(a));
                case "badges-desc":
                default: return getCount(b) - getCount(a) || getName(a).localeCompare(getName(b));
            }
        });
    }, [userIds, search, sortMode, badgesMap]);

    return (
        <SettingsTab>
            <div className={classes(Margins.top16, cl("hero"))}>
                <div className={cl("hero-copy")}>
                    <Heading tag="h2" className={cl("title")}>Custom Badges</Heading>
                    <Paragraph className={cl("subtitle")}>
                        {userIds.length
                            ? `${userIds.length} user${userIds.length === 1 ? "" : "s"} with a PatchCord custom badge · ${totalBadgeCount} badge${totalBadgeCount === 1 ? "" : "s"} total.`
                            : "No custom badges have been loaded yet."}
                    </Paragraph>
                </div>
                <div className={cl("hero-stats")}>
                    <div className={cl("hero-stat")}>
                        <span className={cl("hero-stat-value")}>{userIds.length}</span>
                        <span className={cl("hero-stat-label")}>Users</span>
                    </div>
                    <div className={cl("hero-stat")}>
                        <span className={cl("hero-stat-value")}>{totalBadgeCount}</span>
                        <span className={cl("hero-stat-label")}>Badges</span>
                    </div>
                </div>
            </div>

            <div className={classes(Margins.top16, cl("toolbar"))}>
                <TextInput
                    autoFocus
                    value={search}
                    placeholder={`Search ${userIds.length} user${userIds.length === 1 ? "" : "s"}...`}
                    onChange={setSearch}
                    className={cl("search")}
                />
                <Select
                    options={sortOptions}
                    isSelected={v => v === sortMode}
                    select={v => setSortMode(v)}
                    serialize={v => v}
                    popoutPosition="bottom"
                    closeOnSelect
                    className={cl("sort")}
                />
                <div className={cl("actions")}>
                    <Button
                        size="small"
                        variant="secondary"
                        disabled={refreshing}
                        onClick={fetchCustomBadges}
                    >
                        {refreshing ? "Refreshing..." : "Refresh"}
                    </Button>
                    <Button
                        size="small"
                        variant="primary"
                        onClick={requestBadge}
                    >
                        Request a Badge
                    </Button>
                </div>
            </div>

            {!userIds.length && (
                <div className={classes(Margins.top16, cl("empty"))}>
                    <Paragraph>
                        {lastError
                            ? `Failed to load badges: ${lastError}`
                            : "Once badges are fetched from your PatchCord badges API, they'll show up here."}
                    </Paragraph>
                    <Button
                        size="small"
                        variant="secondary"
                        onClick={requestBadge}
                    >
                        Request a Badge
                    </Button>
                </div>
            )}

            {!!userIds.length && !filteredUserIds.length && (
                <div className={classes(Margins.top16, cl("empty"))}>
                    <Paragraph>No users match "{search}".</Paragraph>
                </div>
            )}

            <div className={classes(Margins.top16, cl("grid"))}>
                {filteredUserIds.map(id => (
                    <BadgeCard key={id} userId={id} badges={badgesMap[id]} />
                ))}
            </div>
        </SettingsTab>
    );
}

export default wrapTab(CustomBadgesTab, "CustomBadgesTab");
