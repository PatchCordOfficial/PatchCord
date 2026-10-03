/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { GuildRoleStore, useStateFromStores } from "@webpack/common";

interface RoleHeaderProps {
    id: string;
    guildId: string;
    title?: string;
    label?: string;
    count: number;
}

const RoleHeader = ErrorBoundary.wrap(function RoleHeader({ id, guildId, title, label, count }: RoleHeaderProps) {
    const role = useStateFromStores([GuildRoleStore], () => GuildRoleStore.getRole(guildId, id), [guildId, id]);
    const { primaryColor, secondaryColor, tertiaryColor } = role?.colorStrings ?? {};
    const style = secondaryColor ? {
        backgroundImage: `linear-gradient(90deg, ${primaryColor ?? role?.colorString ?? secondaryColor}, ${secondaryColor}${tertiaryColor ? `, ${tertiaryColor}` : ""})`,
        backgroundClip: "text",
        WebkitTextFillColor: "transparent"
    } : { color: role?.colorString };

    return <span style={style}>{title ?? label} &mdash; {count}</span>;
}, { noop: true });

export default definePlugin({
    name: "ColoredRoleText",
    description: "Colors member list role headers with their role color or gradient.",
    authors: [EquicordDevs.Solar],

    patches: [{
        find: 'tutorialId:"whos-online"',
        replacement: {
            match: /(?<="aria-hidden":!0,.{0,130}?children:)\[\i," (?:—|\\u2014) ",\i\]/,
            replace: "[$self.renderRoleHeader(arguments[0])]"
        }
    }],

    renderRoleHeader(props: RoleHeaderProps) {
        return <RoleHeader {...props} />;
    }
});
