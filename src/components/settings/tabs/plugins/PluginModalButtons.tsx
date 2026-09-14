/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./PluginModalButtons.css";

import { GithubIcon, WebsiteIcon } from "@components/Icons";
import { classNameFactory } from "@utils/css";
import { getTheme, Theme } from "@utils/discord";
import { findComponentByCodeLazy } from "@webpack";
import { Clickable, MaskedLink, Tooltip } from "@webpack/common";

const StarIcon = findComponentByCodeLazy(".73-2.25h6.12l1.9-5.83Z");

const cl = classNameFactory("vc-settings-modal-");

const getThemeClass = () => getTheme() !== Theme.Light ? "dark" : "light";

interface Props {
    text: string;
    href: string;
}

function LinkIcon({ text, href, Icon }: Props & { Icon: React.ComponentType; }) {
    return (
        <Tooltip text={text}>
            {props =>
                <MaskedLink {...props} href={href} className={cl("link-button", getThemeClass())}>
                    <Icon />
                </MaskedLink>
            }
        </Tooltip>
    );
}

const GithubLinkIcon = () => <GithubIcon aria-hidden className={cl("link-icon")} />;
const WebsiteLinkIcon = () => <WebsiteIcon aria-hidden className={cl("link-icon")} />;

export const GithubButton = (props: Props) => <LinkIcon {...props} Icon={GithubLinkIcon} />;
export const WebsiteButton = (props: Props) => <LinkIcon {...props} Icon={WebsiteLinkIcon} />;

export function FavoriteButton({ isFavorite, onClick }: { isFavorite: boolean; onClick: () => void; }) {

    return (
        <Tooltip text={isFavorite ? "Unfavorite plugin" : "Favorite plugin - pins it to the top of the plugin list"}>
            {props =>
                <Clickable {...props} onClick={onClick} className={cl("favorite-button", isFavorite && "favorite-button-active", getThemeClass())}>
                    <StarIcon aria-hidden className={cl("link-icon", "favorite-icon")} />
                </Clickable>
            }
        </Tooltip>
    );
}
