/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import "./styles.css";

import { HeaderBarButton } from "@api/HeaderBar";
import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Popout, useRef, useState } from "@webpack/common";

import { renderPopout } from "./menu";

export const settings = definePluginSettings({
    showPluginMenu: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show the plugins menu in the toolbox",
    }
});

function Icon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" width={20} height={20} {...props} className={`vc-toolbox-icon ${props.className ?? ""}`}>
            <text
                x="12"
                y="16.5"
                textAnchor="middle"
                fill="currentColor"
                fontSize="14"
                fontWeight="700"
                fontFamily="gg sans, Noto Sans, Helvetica Neue, Helvetica, Arial, sans-serif"
            >
                PC
            </text>
        </svg>
    );
}

function VencordPopoutButton() {
    const buttonRef = useRef(null);
    const [show, setShow] = useState(false);

    return (
        <Popout
            position="bottom"
            align="center"
            spacing={0}
            animation={Popout.Animation.NONE}
            shouldShow={show}
            onRequestClose={() => setShow(false)}
            targetElementRef={buttonRef}
            renderPopout={() => renderPopout(() => setShow(false))}
        >
            {(_, { isShown }) => (
                <HeaderBarButton
                    ref={buttonRef}
                    className="vc-toolbox-btn"
                    onClick={() => setShow(v => !v)}
                    tooltip={isShown ? null : "PatchCord Toolbox"}
                    icon={Icon}
                    selected={isShown}
                />
            )}
        </Popout>
    );
}

migratePluginSettings("PatchCordToolbox", "VencordToolbox");
export default definePlugin({
    name: "PatchCordToolbox",
    description: "Adds a button next to the inbox button in the channel header that houses PatchCord quick actions",
    tags: ["Voice", "Accessibility"],
    authors: [{ name: "itssolar.dev", id: 864612087741546527n }],
    dependencies: ["HeaderBarAPI"],
    required: true,
    enabledByDefault: true,
    settings,
    headerBarButton: {
        icon: Icon,
        render: VencordPopoutButton,
        priority: 1337
    }
});