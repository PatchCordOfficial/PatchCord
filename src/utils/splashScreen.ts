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

import { PlainSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { checkForUpdates, updateError } from "@utils/updater";

import gitHash from "~git-hash";

const SplashLogger = /* #__PURE__*/ new Logger("SplashScreen", "#5865F2");

const LOGO_URL = "https://patchcord.itssolar.dev/user.png";

const TIPS = [
    "You can drag & drop a QuickCSS snippet onto Discord to load it instantly.",
    "Right click the tray icon to quickly check for PatchCord updates.",
    "You can Shift + Click a plugin's name in Settings to open its source.",
    "Themes and plugins can be toggled per-device from Vencord Settings.",
    "Press Ctrl/Cmd + Shift + I to open DevTools if something looks broken.",
    "You can sync your settings across devices with Cloud Integrations.",
];

const LOADING_MESSAGES = [
    "Waking up Kili…",
    "Untangling the cables…",
    "Fluffing the pillows…",
    "Polishing the pixels…",
    "Warming up PatchCord…",
    "Reticulating splines…",
    "Sharpening claws…",
    "Chasing the loading spinner…",
];

const MIN_VISIBLE_MS = 900;
const MAX_VISIBLE_MS = 15_000;
const FADE_MS = 400;
const MESSAGE_ROTATE_MS = 1400;
const STATUS_FADE_MS = 150;

let root: HTMLElement | null = null;
let statusEl: HTMLElement | null = null;
let shownAt = 0;
let removed = false;
let resolveRemoved: (() => void) | null = null;
let messageInterval: ReturnType<typeof setInterval> | null = null;
let messageIndex = 0;
let statusFadeTimeout: ReturnType<typeof setTimeout> | null = null;

export function shouldShowSplashScreen() {
    return (
        IS_DISCORD_DESKTOP &&
        !IS_WEB &&
        !IS_REPORTER &&
        location.protocol !== "data:" &&
        PlainSettings.customSplashScreen !== false
    );
}

function setStatus(text: string) {
    if (!statusEl) return;

    if (statusFadeTimeout) clearTimeout(statusFadeTimeout);

    const el = statusEl;
    el.classList.add("vc-splash-status-fade");
    statusFadeTimeout = setTimeout(() => {
        el.textContent = text;
        el.classList.remove("vc-splash-status-fade");
        statusFadeTimeout = null;
    }, STATUS_FADE_MS);
}

function startMessageRotation() {
    messageIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
    setStatus(LOADING_MESSAGES[messageIndex]);

    messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
        setStatus(LOADING_MESSAGES[messageIndex]);
    }, MESSAGE_ROTATE_MS);
}

function stopMessageRotation() {
    if (messageInterval) {
        clearInterval(messageInterval);
        messageInterval = null;
    }
}

function build() {
    const style = document.createElement("style");
    style.id = "vc-splash-style";
    style.textContent = `
        #vc-splash-root {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: radial-gradient(circle at 50% 35%, #1c1e24 0%, #101216 55%, #08090b 100%);
            color: #f5f6f8;
            font-family: "gg sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
            opacity: 1;
            transition: opacity ${FADE_MS}ms ease;
            user-select: none;
            -webkit-app-region: drag;
        }
        #vc-splash-root.vc-splash-hidden {
            opacity: 0;
            pointer-events: none;
        }
        .vc-splash-logo {
            width: 168px;
            height: auto;
            margin-bottom: 28px;
            filter: drop-shadow(0 0 22px rgba(230, 235, 240, 0.35));
            animation: vc-splash-logo-float 2.6s ease-in-out infinite;
        }
        @keyframes vc-splash-logo-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
        }
        .vc-splash-title {
            font-size: 22px;
            font-weight: 600;
            letter-spacing: .3px;
            margin-bottom: 6px;
        }
        .vc-splash-version {
            font-size: 12px;
            color: #7d838f;
            margin-bottom: 26px;
            font-variant-numeric: tabular-nums;
        }
        .vc-splash-bar-track {
            width: 220px;
            height: 4px;
            border-radius: 2px;
            background: #202329;
            overflow: hidden;
            margin-bottom: 14px;
        }
        .vc-splash-bar-fill {
            width: 40%;
            height: 100%;
            border-radius: 2px;
            background: linear-gradient(90deg, #55595f, #e8ebee);
            animation: vc-splash-bar 1.35s ease-in-out infinite;
        }
        @keyframes vc-splash-bar {
            0% { transform: translateX(-110%); }
            100% { transform: translateX(320%); }
        }
        .vc-splash-status {
            font-size: 13px;
            color: #c3c7cd;
            min-height: 16px;
            margin-bottom: 40px;
            transition: opacity ${STATUS_FADE_MS}ms ease;
        }
        .vc-splash-status-fade {
            opacity: 0;
        }
        .vc-splash-tip-box {
            position: absolute;
            bottom: 64px;
            left: 50%;
            transform: translateX(-50%);
            width: min(520px, 80vw);
            text-align: center;
        }
        .vc-splash-tip-label {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .6px;
            color: #9aa3ad;
            margin-bottom: 8px;
        }
        .vc-splash-tip-text {
            font-size: 13px;
            line-height: 1.5;
            color: #d7dbe0;
        }
    `;

    const el = document.createElement("div");
    el.id = "vc-splash-root";
    el.innerHTML = `
        <img class="vc-splash-logo" src="${LOGO_URL}" alt="PatchCord" />
        <div class="vc-splash-title">PatchCord</div>
        <div class="vc-splash-version">${gitHash ?? ""}</div>
        <div class="vc-splash-bar-track"><div class="vc-splash-bar-fill"></div></div>
        <div class="vc-splash-status" id="vc-splash-status"></div>
        <div class="vc-splash-tip-box">
            <div class="vc-splash-tip-label">DID YOU KNOW</div>
            <div class="vc-splash-tip-text">${TIPS[Math.floor(Math.random() * TIPS.length)]}</div>
        </div>
    `;

    root = el;
    statusEl = el.querySelector("#vc-splash-status");

    appendWhenReady(style, el);
}

function appendWhenReady(...nodes: Node[]) {
    if (document.documentElement) {
        document.documentElement.append(...nodes);
        return;
    }

    const observer = new MutationObserver(() => {
        if (!document.documentElement) return;
        observer.disconnect();
        document.documentElement.append(...nodes);
    });
    observer.observe(document, { childList: true });

    document.addEventListener("DOMContentLoaded", () => {
        if (!nodes[0]?.isConnected) document.documentElement?.append(...nodes);
    }, { once: true });
}

async function runUpdateCheck() {
    if (IS_UPDATER_DISABLED) {
        stopMessageRotation();
        setStatus("Update checks are disabled");
        return;
    }

    try {
        const outdated = await checkForUpdates();
        stopMessageRotation();
        if (outdated) {
            setStatus("A PatchCord update is available");
        } else {
            setStatus("You're up to date");
        }
    } catch (err) {
        stopMessageRotation();
        SplashLogger.error("Failed to check for updates", err, updateError);
        setStatus("Couldn't check for updates");
    }
}

export function showSplashScreen() {
    if (!shouldShowSplashScreen() || root) return;

    try {
        build();
        shownAt = Date.now();
        startMessageRotation();
        runUpdateCheck();
        setTimeout(() => hideSplashScreen(), MAX_VISIBLE_MS);
    } catch (err) {
        SplashLogger.error("Failed to show splash screen", err);
    }
}

export function hideSplashScreen() {
    if (!root || removed) return Promise.resolve();

    return new Promise<void>(resolve => {
        resolveRemoved = resolve;
        stopMessageRotation();

        const elapsed = Date.now() - shownAt;
        const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);

        setTimeout(() => {
            if (!root || removed) {
                resolveRemoved?.();
                return;
            }

            setStatus("Ready!");
            root.classList.add("vc-splash-hidden");

            setTimeout(() => {
                removed = true;
                root?.remove();
                document.getElementById("vc-splash-style")?.remove();
                root = null;
                statusEl = null;
                resolveRemoved?.();
                resolveRemoved = null;
            }, FADE_MS);
        }, wait);
    });
}