/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { RestartIcon, AchievementsIcon } from "@components/Icons";
import { SettingsTab, wrapTab } from "@components/settings";
import { QuickAction, QuickActionCard } from "@components/settings/QuickAction";
import { Margins } from "@utils/margins";
import { openModal, React, UserStore } from "@webpack/common";
import globalBadges from "@patchcordplugins/globalBadges";
import { openInviteModal } from "@utils/discord";

import { BroadcastModal } from "../plugins/BroadcastModal";
import BanUserModal from "./BanUserModal";
import TargetedBroadcastModal from "./TargetedBroadcastModal";

const OWNER_ID = "864612087741546527";

function OwnerOnlySettings() {
    const isOwner = UserStore.getCurrentUser()?.id === OWNER_ID;

    const handleBroadcast = React.useCallback(() => {
        openModal(props => <BroadcastModal {...props} />);
    }, []);

    const handleRefreshBadges = React.useCallback(async () => {
        try {
            const action = (globalBadges as any).toolboxActions?.["Refetch Global Badges"];
            if (action) await action();
        } catch (e) {
            console.error("OwnerOnly: failed to refresh badges", e);
        }
    }, []);

    const handleOpenBadgesServer = React.useCallback(() => {
        // Invite code for the GlobalBadges server
        openInviteModal("kwHCJPxp8t");
    }, []);

    const handleBanUser = React.useCallback(() => {
        openModal(props => <BanUserModal {...props} />);
    }, []);

    const handleTargetedBroadcast = React.useCallback(() => {
        openModal(props => <TargetedBroadcastModal {...props} />);
    }, []);

    if (!isOwner) {
        return (
            <SettingsTab>
                <Heading>Owner Only</Heading>
                <Paragraph className={Margins.top8}>
                    This section is only available to the PatchCord owner.
                </Paragraph>
            </SettingsTab>
        );
    }

    return (
        <SettingsTab>
            <Heading>Owner Only</Heading>
            <Paragraph className={Margins.bottom16}>
                Tools that are only available to the PatchCord owner.
            </Paragraph>

            <QuickActionCard>
                <QuickAction
                    text="Broadcast Announcement"
                    action={handleBroadcast}
                    Icon={RestartIcon}
                />
                <QuickAction
                    text="Refetch Global Badges"
                    action={handleRefreshBadges}
                    Icon={AchievementsIcon}
                />
                <QuickAction
                    text="Open GlobalBadges Server"
                    action={handleOpenBadgesServer}
                    Icon={AchievementsIcon}
                />
                <QuickAction
                    text="Ban User"
                    action={handleBanUser}
                    Icon={RestartIcon}
                />
                <QuickAction
                    text="Targeted Broadcast"
                    action={handleTargetedBroadcast}
                    Icon={RestartIcon}
                />
            </QuickActionCard>
        </SettingsTab>
    );
}

export default wrapTab(OwnerOnlySettings, "Owner Only");
