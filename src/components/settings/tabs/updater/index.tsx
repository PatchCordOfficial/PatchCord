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

import { Card } from "@components/Card";
import { Flex } from "@components/Flex";
import { Heading, HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { React } from "@webpack/common";
import { UpdaterDashboard } from "./Components";

function Updater() {
    return (
        <SettingsTab>
            <Flex flexDirection="column" gap="16px">
                <div style={{
                    padding: "24px",
                    borderRadius: "8px",
                    background: "linear-gradient(90deg, var(--background-modifier-accent), var(--background-secondary))",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                }}>
                    <Heading>PatchCord Updater</Heading>
                    <Paragraph className={Margins.top8} color="text-muted">
                        Keep your client up to date with the latest features, bug fixes, and plugins.
                        Updates are delivered directly from the official PatchCord servers.
                    </Paragraph>
                </div>
                
                <UpdaterDashboard />
            </Flex>
        </SettingsTab>
    );
}

export default wrapTab(Updater, "Updater");
