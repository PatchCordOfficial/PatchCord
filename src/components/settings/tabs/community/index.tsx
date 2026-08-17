/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import ErrorBoundary from "@components/ErrorBoundary";
import { HeadingTertiary } from "@components/Heading";
import { CommunityIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { fetchOnlineUsers, OnlineUser } from "@patchcordplugins/patchcordBroadcasts";
import { debounce } from "@shared/debounce";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { React, TextInput, UserStore, UserUtils } from "@webpack/common";

const cl = classNameFactory("vc-community-");

const POLL_INTERVAL_MS = 5 * 1000;

const STATUS_META: Record<string, { color: string; label: string; }> = {
    online: { color: "var(--status-online, #23a55a)", label: "Online" },
    idle: { color: "var(--status-idle, #f0b232)", label: "Idle" },
    dnd: { color: "var(--status-danger, #f23f42)", label: "Do Not Disturb" },
    offline: { color: "var(--status-offline, #80848e)", label: "Offline" }
};

function UserAvatar({ id, fallback, status }: { id: string; fallback: string | null; status: string; }) {
    const [avatarUrl, setAvatarUrl] = React.useState<string | null>(() => {
        try {
            const cached = UserStore.getUser(id);
            return cached?.getAvatarURL ? cached.getAvatarURL(undefined, 80, true) : fallback;
        } catch {
            return fallback;
        }
    });

    React.useEffect(() => {
        let cancelled = false;

        // Always fetch fresh from Discord so the avatar reflects the user's
        // current profile picture rather than a cached/stale one.
        UserUtils.getUser(id)
            .then((user: any) => {
                if (cancelled || !user?.getAvatarURL) return;
                setAvatarUrl(user.getAvatarURL(undefined, 80, true));
            })
            .catch(() => { /* fall back to whatever we already have */ });

        return () => { cancelled = true; };
    }, [id]);

    const meta = STATUS_META[status] ?? STATUS_META.online;

    return (
        <div className={cl("avatar-ring")}>
            {avatarUrl
                ? <img className={classes(cl("avatar"), status === "offline" && cl("avatar-offline"))} src={avatarUrl} alt="" />
                : <div className={cl("avatar-fallback")} />}
            <span className={cl("status-dot")} style={{ background: meta.color }} />
        </div>
    );
}

function UserRow({ user, index }: { user: OnlineUser; index: number; }) {
    const meta = STATUS_META[user.status] ?? STATUS_META.online;

    return (
        <Card className={classes(cl("user-card"), user.status === "offline" && cl("user-card-offline"))} style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}>
            <UserAvatar id={user.user_id} fallback={user.avatar} status={user.status} />
            <div className={cl("user-meta")}>
                <span className={cl("username")}>{user.username}</span>
                <span className={cl("userid")}>{user.user_id}</span>
                {user.version && <span className={cl("version")}>v{user.version}</span>}
            </div>
            <span className={cl("status-pill")} style={{ color: meta.color, borderColor: meta.color }}>{meta.label}</span>
        </Card>
    );
}

function CommunityContent() {
    const [search, setSearch] = React.useState("");
    const [page, setPage] = React.useState(1);
    const [users, setUsers] = React.useState<OnlineUser[]>([]);
    const [total, setTotal] = React.useState(0);
    const [pages, setPages] = React.useState(1);
    const [loading, setLoading] = React.useState(true);

    const load = React.useCallback(async (targetPage: number, targetSearch: string) => {
        const data = await fetchOnlineUsers(targetPage, targetSearch);
        if (!data) return;

        setUsers(data.users);
        setTotal(data.total);
        setPages(data.pages);
        if (data.page !== targetPage) setPage(data.page);
        setLoading(false);
    }, []);

    React.useEffect(() => {
        setLoading(true);
        load(page, search);

        const interval = setInterval(() => load(page, search), POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [page, search, load]);

    const onSearchChange = React.useMemo(
        () => debounce((value: string) => {
            setPage(1);
            setSearch(value);
        }, 300),
        []
    );

    const activeUsers = users.filter(u => u.status !== "offline");
    const offlineUsers = users.filter(u => u.status === "offline");

    return (
        <>
            <div className={classes(Margins.bottom16, cl("hero"))}>
                <div className={cl("hero-icon")}>
                    <CommunityIcon width={26} height={26} />
                </div>
                <div className={cl("hero-copy")}>
                    <HeadingTertiary className={cl("hero-title")}>Community</HeadingTertiary>
                    <Paragraph className={cl("hero-subtitle")}>
                        Everyone who's used PatchCord, and who's around right now.
                    </Paragraph>
                </div>
                <div className={cl("hero-stat")}>
                    <span className={cl("hero-stat-value")}>{activeUsers.length}</span>
                    <span className={cl("hero-stat-label")}>{activeUsers.length === 1 ? "User" : "Users"} online</span>
                </div>
            </div>

            <ErrorBoundary noop>
                <div className={classes(Margins.bottom16, cl("search-wrap"))}>
                    <TextInput
                        placeholder="Search by username or user ID..."
                        onChange={onSearchChange}
                        autoFocus
                    />
                </div>
            </ErrorBoundary>

            {!loading && users.length === 0 && (
                <Paragraph className={cl("empty")}>
                    No users found.
                </Paragraph>
            )}

            {!!activeUsers.length && (
                <div className={cl("section")}>
                    <div className={cl("section-list")}>
                        {activeUsers.map((user, i) => (
                            <UserRow key={user.user_id} user={user} index={i} />
                        ))}
                    </div>
                </div>
            )}

            {!!offlineUsers.length && (
                <div className={cl("section")}>
                    <HeadingTertiary className={classes(Margins.top16, Margins.bottom8, cl("section-title"))}>
                        Offline — {offlineUsers.length}
                    </HeadingTertiary>
                    <div className={cl("section-list")}>
                        {offlineUsers.map((user, i) => (
                            <UserRow key={user.user_id} user={user} index={i} />
                        ))}
                    </div>
                </div>
            )}

            {pages > 1 && (
                <div className={cl("pagination")}>
                    <Button
                        size="small"
                        variant="secondary"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Previous
                    </Button>
                    <span className={cl("page-label")}>
                        Page {page} of {pages}
                    </span>
                    <Button
                        size="small"
                        variant="secondary"
                        disabled={page >= pages}
                        onClick={() => setPage(p => Math.min(pages, p + 1))}
                    >
                        Next
                    </Button>
                </div>
            )}
        </>
    );
}

function CommunityTab() {
    return (
        <SettingsTab>
            <CommunityContent />
        </SettingsTab>
    );
}

export default wrapTab(CommunityTab, "Community");
