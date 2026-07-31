/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { GithubIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { React, UserStore, UserUtils } from "@webpack/common";

interface CreditEntry {
    name: string;
    description: string;
    href: string;
}

const credits: CreditEntry[] = [
    {
        name: "Equicord",
        description: "PatchCord is built on top of Equicord, and includes many of its plugins and features.",
        href: "https://github.com/Equicord/Equicord"
    },
    {
        name: "Vencord",
        description: "Equicord itself is a fork of Vencord, the original client mod that made all of this possible.",
        href: "https://github.com/Vendicated/Vencord"
    }
];

interface EarlyHelperEntry {
    handle: string;
    displayName: string;
    id: string;
    color: string;
}

const earlyHelpers: EarlyHelperEntry[] = [
    {
        handle: "4aisal96",
        displayName: "Faisal",
        id: "772491719698284544",
        color: "#00e5ff"
    },
    {
        handle: "illightli",
        displayName: "Light",
        id: "1443624436870676511",
        color: "#a855f7"
    }
];

function EarlyHelperAvatar({ id }: { id: string; }) {
    const [avatarUrl, setAvatarUrl] = React.useState<string | null>(() => {
        try {
            const cached = UserStore.getUser(id);
            return cached?.getAvatarURL ? cached.getAvatarURL(undefined, 80, true) : null;
        } catch {
            return null;
        }
    });

    React.useEffect(() => {
        let cancelled = false;

        // Always fetch fresh from Discord so the avatar reflects the user's
        // current profile picture instead of a stale cached one.
        UserUtils.getUser(id)
            .then((user: any) => {
                if (cancelled || !user?.getAvatarURL) return;
                setAvatarUrl(user.getAvatarURL(undefined, 80, true));
            })
            .catch(() => { /* ignore, fall back to whatever we already have */ });

        return () => { cancelled = true; };
    }, [id]);

    if (!avatarUrl) {
        return <div className="vc-early-helper-avatar-fallback" />;
    }

    return (
        <img
            className="vc-early-helper-avatar"
            src={avatarUrl}
            alt=""
            style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0
            }}
        />
    );
}

function EarlyHelperCard({ handle, displayName, id, color }: EarlyHelperEntry) {
    return (
        <Card className="vc-settings-card" style={{ padding: "0.75em 1em", marginBottom: "0.75em", display: "flex", alignItems: "center", gap: "0.85em" }}>
            <EarlyHelperAvatar id={id} />
            <div style={{ display: "flex", flexDirection: "column" }}>
                <strong style={{ color }}>
                    {handle} ({displayName})
                </strong>
                <span style={{ fontSize: "0.75em", opacity: 0.6 }}>
                    {id}
                </span>
            </div>
        </Card>
    );
}

function CreditCard({ name, description, href }: CreditEntry) {
    return (
        <Card className="vc-settings-card" style={{ padding: "1em", marginBottom: "0.75em" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5em", marginBottom: "0.35em" }}>
                <GithubIcon width={18} height={18} />
                <strong>{name}</strong>
            </div>
            <Paragraph className={Margins.bottom8}>
                {description}
            </Paragraph>
            <Link href={href}>{href}</Link>
        </Card>
    );
}

function CreditsContent() {
    return (
        <>
            <Paragraph className={Margins.bottom16}>
                PatchCord wouldn't exist without the projects it's built on. Full credit goes to the following:
            </Paragraph>

            {credits.map(c => (
                <CreditCard key={c.name} {...c} />
            ))}

            <Divider className={Margins.top20} />

            <Paragraph className={`${Margins.top16} ${Margins.bottom16}`}>
                Early Helpers
            </Paragraph>

            {earlyHelpers.map(h => (
                <EarlyHelperCard key={h.id} {...h} />
            ))}

            <Divider className={Margins.top20} />

            <Paragraph color="text-subtle" className={Margins.top16}>
                Thank you to everyone who has contributed to Vencord and Equicord over the years. PatchCord is only possible because of the work put into those projects.
            </Paragraph>
        </>
    );
}

function CreditsTab() {
    return (
        <SettingsTab>
            <CreditsContent />
        </SettingsTab>
    );
}

export default wrapTab(CreditsTab, "Credits");
