/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addSurfacePropsProvider, type SurfaceProvidedProps } from "@api/SurfaceClasses";
import definePlugin from "@utils/types";

import managedStyle from "./style.css?managed";

const DATA_ATTR = "data-vc-discord-title-bar-label";
const LABEL_ID = "vc-discord-title-bar-label-overlay";

let unsubTitleBar: (() => void) | undefined;
let observer: MutationObserver | undefined;
let rafHandle: number | undefined;
let labelEl: HTMLSpanElement | undefined;

function ensureLabelEl(): HTMLSpanElement {
    let el = document.getElementById(LABEL_ID) as HTMLSpanElement | null;
    if (!el) {
        el = document.createElement("span");
        el.id = LABEL_ID;
        el.textContent = "PatchCord";
        document.body.appendChild(el);
    }
    return el;
}

function findAnchor(): HTMLElement | null {
    return document.querySelector(`[${DATA_ATTR}]`);
}

function syncPosition() {
    const anchor = findAnchor();
    const label = labelEl;

    if (!anchor || !label) {
        if (label) label.style.display = "none";
        rafHandle = requestAnimationFrame(syncPosition);
        return;
    }

    const rect = anchor.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
        label.style.display = "none";
    } else {
        label.style.display = "block";
        label.style.left = `${rect.right + 8}px`;
        label.style.top = `${rect.top + rect.height / 2}px`;
    }

    rafHandle = requestAnimationFrame(syncPosition);
}

export default definePlugin({
    name: "DiscordTitleBarLabel",
    description: "Restores a small \"PatchCord\" text label next to the app name in the title bar, like the legacy client used to show.",
    authors: [{ name: "you", id: 0n }],
    dependencies: ["SurfaceClassesAPI"],

    managedStyle,

    start() {
        unsubTitleBar = addSurfacePropsProvider("titleBar", () => ({
            [DATA_ATTR]: "true"
        } as SurfaceProvidedProps));

        labelEl = ensureLabelEl();

        observer = new MutationObserver(() => {
            if (!labelEl) labelEl = ensureLabelEl();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        rafHandle = requestAnimationFrame(syncPosition);
    },

    stop() {
        unsubTitleBar?.();
        unsubTitleBar = undefined;

        observer?.disconnect();
        observer = undefined;

        if (rafHandle !== undefined) {
            cancelAnimationFrame(rafHandle);
            rafHandle = undefined;
        }

        labelEl?.remove();
        labelEl = undefined;
    },
});