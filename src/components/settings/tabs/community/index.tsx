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
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { fetchOnlineUsers, OnlineUser } from "@patchcordplugins/patchcordBroadcasts";
import { debounce } from "@shared/debounce";
import { Margins } from "@utils/margins";
import { React, TextInput, UserStore, UserUtils } from "@webpack/common";

const POLL_INTERVAL_MS = 5 * 1000;

function UserAvatar({ id, fallback }: { id: string; fallback: string | null; }) {
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

    if (!avatarUrl) {
        return <div className="vc-community-avatar-fallback" />;
    }

    return <img className="vc-community-avatar" src={avatarUrl} alt="" />;
}

function UserRow({ user }: { user: OnlineUser; }) {
    return (
        <Card className="vc-community-user-card">
            <UserAvatar id={user.user_id} fallback={user.avatar} />
            <div className="vc-community-user-meta">
                <span className="vc-community-username">{user.username}</span>
                <span className="vc-community-userid">{user.user_id}</span>
            </div>
            <span className="vc-community-status-dot" />
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

    return (
        <>
            <Paragraph className={Margins.bottom16}>
                Everyone currently online in PatchCord, updated live.
            </Paragraph>

            <HeadingTertiary className={Margins.bottom8}>
                {total} user{total === 1 ? "" : "s"} online
            </HeadingTertiary>

            <ErrorBoundary noop>
                <div className={Margins.bottom16}>
                    <TextInput
                        placeholder="Search by username or user ID..."
                        onChange={onSearchChange}
                        autoFocus
                    />
                </div>
            </ErrorBoundary>

            <div className="vc-community-list">
                {!loading && users.length === 0 && (
                    <Paragraph className="vc-community-empty">
                        No online users found.
                    </Paragraph>
                )}
                {users.map(user => (
                    <UserRow key={user.user_id} user={user} />
                ))}
            </div>

            {pages > 1 && (
                <div className="vc-community-pagination">
                    <Button
                        size="small"
                        variant="secondary"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Previous
                    </Button>
                    <span className="vc-community-page-label">
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
