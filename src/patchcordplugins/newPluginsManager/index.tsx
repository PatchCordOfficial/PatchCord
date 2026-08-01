/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

import * as KnownSettings from "./knownSettings";
import { KNOWN_PLUGINS_LEGACY_DATA_KEY, KNOWN_SETTINGS_DATA_KEY } from "./knownSettings";
import { openNewPluginsModal } from "./NewPluginsModal";

export default definePlugin({
    name: "NewPluginsManager",
    description: "Utility that notifies you when new or updated plugins are added to PatchCord",
    tags: ["Utility"],
    authors: [{ name: "itssolar.dev", id: 864612087741546527n }],
    enabledByDefault: true,
    flux: {
        async POST_CONNECTION_OPEN() {
            openNewPluginsModal();
        }
    },
    openNewPluginsModal,
    KNOWN_PLUGINS_LEGACY_DATA_KEY,
    KNOWN_SETTINGS_DATA_KEY,
    KnownSettings
});
