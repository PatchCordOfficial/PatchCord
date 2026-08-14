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

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { PlainSettings, Settings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { checkForUpdates, updateError } from "@utils/updater";

import gitHash from "~git-hash";

const SplashLogger = /* #__PURE__*/ new Logger("SplashScreen", "#9096a0");

const LOGO_URL = "http://patchcord.itssolar.dev/logo.png";
const LOGO_MAX_WIDTH = 176;
const LOGO_MAX_HEIGHT = 120;

const TIPS = [
    "You can drag & drop a QuickCSS snippet onto Discord to load it instantly.",
    "Right click the tray icon to quickly check for PatchCord updates.",
    "You can Shift + Click a plugin's name in Settings to open its source.",
    "Themes and plugins can be toggled per-device from Vencord Settings.",
    "Press Ctrl/Cmd + Shift + I to open DevTools if something looks broken.",
    "You can sync your settings across devices with Cloud Integrations.",
    "PatchCord is a fork of Equicord, which is itself a fork of Vencord.",
    "You can search plugins by feature, not just name, in the Plugins tab.",
    "Ctrl/Cmd + Shift + R force-reloads Discord if the UI ever gets stuck.",
    "Notification badges, message logging and more come from separate plugins, not the client itself.",
    "Every plugin can be configured individually by clicking the gear icon next to it.",
    "You can back up and restore your settings from the Vencord Settings page.",
    "QuickCSS supports full CSS, including animations and custom fonts.",
    "The plugin list shows a search bar; try typing a keyword like \"badge\" or \"volume\".",
    "You can enable Developer Mode from Vencord Settings for extra debugging tools.",
    "Most PatchCord plugins are open source; Shift-click a plugin name to view it on GitHub.",
    "If Discord ever looks broken after an update, try rebuilding from the Updater page.",
    "You can assign custom keybinds to certain plugins that support them.",
    "The splash screen you're looking at right now is themeable too.",
    "Crashes? Check the PatchCord log in DevTools before reporting a bug.",
    "You can drag the volume slider on this screen to adjust or mute the startup chime.",
    "PatchCord checks your current version against the latest one on every launch.",
];

interface BootStage {
    label: string | (() => string);
    icon: string;
}

// Counts plugins the same way the Plugins settings tab does, so the number
// shown here always matches what the user would see there.
function getPluginCountLabel() {
    try {
        const names = Object.keys(plugins);
        const enabledCount = names.filter(isPluginEnabled).length;
        if (!enabledCount) return "Preparing plugins…";
        return `Preparing ${enabledCount} plugin${enabledCount === 1 ? "" : "s"}…`;
    } catch (err) {
        SplashLogger.debug("Couldn't count plugins", err);
        return "Preparing plugins…";
    }
}

const BOOT_STAGES: BootStage[] = [
    { label: "Starting PatchCord…", icon: "power" },
    { label: "Getting system started…", icon: "cpu" },
    { label: "Loading your settings…", icon: "gear" },
    { label: "Initializing patches…", icon: "puzzle" },
    { label: getPluginCountLabel, icon: "plug" },
    { label: "Warming up the cache…", icon: "database" },
    { label: "Connecting to Discord…", icon: "link" },
];

const UPDATE_STAGES = {
    checkingCurrent: { label: "Checking current version…", icon: "tag" },
    checkingLatest: { label: "Checking latest version…", icon: "cloud" },
    comparing: { label: "Comparing versions…", icon: "compare" },
} as const;

const UPDATE_RESULT_MESSAGES = {
    disabled: "Update checks are disabled",
    upToDate: "You're up to date!",
    outdated: "A PatchCord update is available",
    newer: "You're running a newer build",
    failed: "Couldn't check for updates",
};

const ICONS: Record<string, string> = {
    power: "<path d=\"M12 3v8\"/><path d=\"M6.3 6.3a8 8 0 1 0 11.4 0\"/>",
    cpu: "<rect x=\"7\" y=\"7\" width=\"10\" height=\"10\" rx=\"1.5\"/><path d=\"M12 3v3M12 18v3M3 12h3M18 12h3M7.5 3.5 9 6M16.5 3.5 15 6M7.5 20.5 9 18M16.5 20.5 15 18\"/>",
    gear: "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 13a7.7 7.7 0 0 0 0-2l2-1.5-2-3.5-2.4.7a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.3 2.7a7.6 7.6 0 0 0-1.7 1l-2.4-.7-2 3.5L6.6 11a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.5 2.4-.7c.5.4 1.1.8 1.7 1L11 21h4l.3-2.7c.6-.2 1.2-.6 1.7-1l2.4.7 2-3.5-2-1.5Z\"/>",
    puzzle: "<path d=\"M9 3h4a1 1 0 0 1 1 1v2.2a1.8 1.8 0 1 0 0 3.6V12a1 1 0 0 1-1 1h-2.2a1.8 1.8 0 1 1-3.6 0H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h2.2a1.8 1.8 0 1 0 0-3.6V3a1 1 0 0 1 1-1Z\"/>",
    plug: "<path d=\"M9 3v4M15 3v4M6 7h12l-1 5a5 5 0 0 1-10 0Z\"/><path d=\"M12 16v5\"/>",
    database: "<ellipse cx=\"12\" cy=\"6\" rx=\"7\" ry=\"3\"/><path d=\"M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6\"/><path d=\"M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6\"/>",
    link: "<path d=\"M9 12a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1.5 1.5\"/><path d=\"M15 12a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1.5-1.5\"/>",
    tag: "<path d=\"M3 11.5V5a2 2 0 0 1 2-2h6.5L21 11.5 12.5 20 3 11.5Z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\"1.2\"/>",
    cloud: "<path d=\"M7 18a4.5 4.5 0 0 1-.5-8.97A5 5 0 0 1 16 8.05 4 4 0 0 1 17.5 16H7Z\"/>",
    compare: "<path d=\"M8 3v14M8 17l-3-3M8 17l3-3\"/><path d=\"M16 21V7M16 7l3 3M16 7l-3 3\"/>",
    check: "<path d=\"M4 12.5 9.5 18 20 6\"/>",
    warn: "<path d=\"M12 3 21 19H3Z\"/><path d=\"M12 9.5v4M12 16.5h.01\"/>",
    speakerHigh: "<path d=\"M4 9v6h4l5 4V5L8 9H4Z\"/><path d=\"M16.5 8.5a5 5 0 0 1 0 7M19 6a9 9 0 0 1 0 12\"/>",
    speakerLow: "<path d=\"M4 9v6h4l5 4V5L8 9H4Z\"/><path d=\"M16.5 9.5a3.5 3.5 0 0 1 0 5\"/>",
    speakerMute: "<path d=\"M4 9v6h4l5 4V5L8 9H4Z\"/><path d=\"m16 9 5 6M21 9l-5 6\"/>",
};

function icon(name: string, size = 16) {
    return `<svg class="vc-splash-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] ?? ""}</svg>`;
}

const MIN_VISIBLE_MS = 900;
const MAX_VISIBLE_MS = 15_000;
const FADE_MS = 400;
const STAGE_MS = 1000;
const STATUS_FADE_MS = 160;
const PARTICLE_COUNT = 22;

let root: HTMLElement | null = null;
let hideDiscordStyle: HTMLStyleElement | null = null;
let statusEl: HTMLElement | null = null;
let statusIconEl: HTMLElement | null = null;
let barFillEl: HTMLElement | null = null;
let percentEl: HTMLElement | null = null;
let soundBtnEl: HTMLElement | null = null;
let volumeSliderEl: HTMLInputElement | null = null;
let errorToggleEl: HTMLElement | null = null;
let errorDetailsEl: HTMLElement | null = null;
let errorDetailsExpanded = false;
let shownAt = 0;
let removed = false;
let resolveRemoved: (() => void) | null = null;
let stageTimeout: ReturnType<typeof setTimeout> | null = null;
let statusFadeTimeout: ReturnType<typeof setTimeout> | null = null;
let audioCtx: AudioContext | null = null;
let volume = 0.5;
let volumeBeforeMute = 0.5;

export function shouldShowSplashScreen() {
    return (
        IS_DISCORD_DESKTOP &&
        !IS_WEB &&
        !IS_REPORTER &&
        location.protocol !== "data:" &&
        PlainSettings.customSplashScreen !== false
    );
}

// Web Audio synthesized chimes, no external asset or network request needed.
function ensureAudioCtx() {
    try {
        audioCtx ??= new (window.AudioContext ?? (window as any).webkitAudioContext)();
    } catch (err) {
        SplashLogger.debug("Couldn't create AudioContext", err);
    }
    return audioCtx;
}

function playTone(freqs: number[], duration = 0.16, gapMs = 90) {
    if (volume <= 0) return;

    try {
        const ctx = ensureAudioCtx();
        if (!ctx) return;

        const peak = 0.09 * volume;

        freqs.forEach((freq, i) => {
            const start = ctx.currentTime + (i * gapMs) / 1000;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(peak, start + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + duration + 0.02);
        });
    } catch (err) {
        SplashLogger.debug("Couldn't play splash sound", err);
    }
}

const playBootChime = () => playTone([392, 523.25]);
const playReadyChime = () => playTone([523.25, 659.25, 783.99], 0.2, 100);
const playErrorChime = () => playTone([293.66, 233.08], 0.22, 110);

const HUM_FADE_S = 0.6;
const HUM_PEAK_GAIN = 0.022;

interface HumNodes {
    oscRoot: OscillatorNode;
    oscRootDetune: OscillatorNode;
    oscFifth: OscillatorNode;
    oscOctave: OscillatorNode;
    filter: BiquadFilterNode;
    filterLfo: OscillatorNode;
    tremoloLfo: OscillatorNode;
    gain: GainNode;
}

let hum: HumNodes | null = null;

// A soft, warm pad-like drone that plays for the duration of the boot
// sequence. A root + fifth + octave (triangle waves, so it has some gentle
// harmonic body instead of clinical pure tones) through a dark lowpass
// filter, with a slow amplitude tremolo for movement. No pitch vibrato,
// so it never drifts into that "audiometry beep" sweep territory.
function startAmbientHum() {
    if (hum || volume <= 0) return;

    const ctx = ensureAudioCtx();
    if (!ctx) return;

    try {
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(HUM_PEAK_GAIN * volume, ctx.currentTime + 2.4);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 420;
        filter.Q.value = 0.4;

        // Root note, doubled with a slightly detuned partner for a soft
        // chorus-y warmth (like two voices, not a hearing-test beat).
        const oscRoot = ctx.createOscillator();
        oscRoot.type = "triangle";
        oscRoot.frequency.value = 82.41; // E2

        const oscRootDetune = ctx.createOscillator();
        oscRootDetune.type = "triangle";
        oscRootDetune.frequency.value = 82.71;

        // Perfect fifth above, quiet, adds a bit of consonant colour.
        const oscFifth = ctx.createOscillator();
        oscFifth.type = "sine";
        oscFifth.frequency.value = 123.47; // B2

        // Octave above the root, very quiet, adds air on top.
        const oscOctave = ctx.createOscillator();
        oscOctave.type = "sine";
        oscOctave.frequency.value = 164.81; // E3

        const fifthGain = ctx.createGain();
        fifthGain.gain.value = 0.35;
        const octaveGain = ctx.createGain();
        octaveGain.gain.value = 0.2;

        const filterLfo = ctx.createOscillator();
        filterLfo.type = "sine";
        filterLfo.frequency.value = 0.05;
        const filterLfoGain = ctx.createGain();
        filterLfoGain.gain.value = 60;
        filterLfo.connect(filterLfoGain);
        filterLfoGain.connect(filter.frequency);

        // Slow, shallow amplitude breathing instead of pitch vibrato.
        const tremoloLfo = ctx.createOscillator();
        tremoloLfo.type = "sine";
        tremoloLfo.frequency.value = 0.09;
        const tremoloGain = ctx.createGain();
        tremoloGain.gain.value = HUM_PEAK_GAIN * volume * 0.18;
        tremoloLfo.connect(tremoloGain);
        tremoloGain.connect(gain.gain);

        oscRoot.connect(filter);
        oscRootDetune.connect(filter);
        oscFifth.connect(fifthGain);
        fifthGain.connect(filter);
        oscOctave.connect(octaveGain);
        octaveGain.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        oscRoot.start();
        oscRootDetune.start();
        oscFifth.start();
        oscOctave.start();
        filterLfo.start();
        tremoloLfo.start();

        hum = { oscRoot, oscRootDetune, oscFifth, oscOctave, filter, filterLfo, tremoloLfo, gain };
    } catch (err) {
        SplashLogger.debug("Couldn't start ambient hum", err);
    }
}

function updateHumVolume() {
    if (!hum || !audioCtx) return;
    hum.gain.gain.setTargetAtTime(HUM_PEAK_GAIN * volume, audioCtx.currentTime, 0.12);
}

function stopAmbientHum(fadeSeconds = HUM_FADE_S) {
    if (!hum || !audioCtx) return;

    const { gain, oscRoot, oscRootDetune, oscFifth, oscOctave, tremoloLfo, filterLfo } = hum;
    const ctx = audioCtx;
    const nodes = [oscRoot, oscRootDetune, oscFifth, oscOctave, tremoloLfo, filterLfo];
    hum = null;

    try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeSeconds);
    } catch (err) {
        SplashLogger.debug("Couldn't fade out ambient hum", err);
    }

    setTimeout(() => {
        nodes.forEach(node => {
            try {
                node.stop();
            } catch (err) {
                SplashLogger.debug("Couldn't stop hum node", err);
            }
        });
    }, fadeSeconds * 1000 + 60);
}

function volumeIconName() {
    if (volume <= 0) return "speakerMute";
    return volume < 0.5 ? "speakerLow" : "speakerHigh";
}

function setVolume(next: number, persist = true) {
    const wasAudible = volume > 0;
    volume = Math.max(0, Math.min(1, next));
    if (volume > 0) volumeBeforeMute = volume;

    if (persist) Settings.splashScreenVolume = volume;

    if (soundBtnEl) {
        soundBtnEl.innerHTML = icon(volumeIconName(), 18);
        soundBtnEl.setAttribute("aria-label", volume <= 0 ? "Unmute startup sound" : "Mute startup sound");
        soundBtnEl.classList.toggle("vc-splash-sound-muted", volume <= 0);
    }
    if (volumeSliderEl && document.activeElement !== volumeSliderEl) {
        const pct = Math.round(volume * 100);
        volumeSliderEl.value = String(pct);
        volumeSliderEl.style.setProperty("--vc-vol", `${pct}%`);
    }

    if (!removed) {
        if (volume > 0 && !wasAudible) startAmbientHum();
        else if (volume <= 0 && wasAudible) stopAmbientHum(0.15);
        else updateHumVolume();
    }
}

function toggleMute() {
    setVolume(volume > 0 ? 0 : (volumeBeforeMute || 0.5));
}

function setStatus(text: string, iconName?: string) {
    if (!statusEl) return;

    if (statusFadeTimeout) clearTimeout(statusFadeTimeout);

    const el = statusEl;
    const iconEl = statusIconEl;
    el.classList.add("vc-splash-status-fade");
    iconEl?.classList.add("vc-splash-status-fade");

    statusFadeTimeout = setTimeout(() => {
        el.textContent = text;
        if (iconEl && iconName) iconEl.innerHTML = icon(iconName, 14);
        el.classList.remove("vc-splash-status-fade");
        iconEl?.classList.remove("vc-splash-status-fade");
        statusFadeTimeout = null;
    }, STATUS_FADE_MS);
}

function setProgress(fraction: number) {
    const pct = Math.max(0, Math.min(1, fraction));
    if (barFillEl) barFillEl.style.width = `${pct * 100}%`;
    if (percentEl) percentEl.textContent = `${Math.round(pct * 100)}%`;
}

const TOTAL_STEPS = BOOT_STAGES.length + 3;

function playBootSequence(onDone: () => void) {
    let step = 0;

    const next = () => {
        if (step >= BOOT_STAGES.length) {
            onDone();
            return;
        }

        const stage = BOOT_STAGES[step];
        const label = typeof stage.label === "function" ? stage.label() : stage.label;
        setStatus(label, stage.icon);
        setProgress((step + 1) / TOTAL_STEPS);
        step++;
        stageTimeout = setTimeout(next, STAGE_MS);
    };

    next();
}

function stopBootSequence() {
    if (stageTimeout) {
        clearTimeout(stageTimeout);
        stageTimeout = null;
    }
}

function applyLogoScale(img: HTMLImageElement) {
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return;

    const scale = Math.min(LOGO_MAX_WIDTH / w, LOGO_MAX_HEIGHT / h, 1);
    const displayWidth = w * scale;
    const displayHeight = h * scale;
    img.style.width = `${displayWidth}px`;
    img.style.height = `${displayHeight}px`;

    // Size the glow/rings to the logo's actual rendered box (which may be
    // wide, tall, or square) instead of assuming a fixed square/circle, so
    // they always wrap the artwork instead of clipping through it.
    const wrap = img.closest<HTMLElement>(".vc-splash-logo-wrap");
    if (wrap) {
        wrap.style.setProperty("--vc-logo-w", `${displayWidth}px`);
        wrap.style.setProperty("--vc-logo-h", `${displayHeight}px`);
    }
}

function buildParticles() {
    let html = "";
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 8;
        const duration = 6 + Math.random() * 6;
        const size = 2 + Math.random() * 3;
        const drift = -40 + Math.random() * 80;
        html += `<span class="vc-splash-particle" style="left:${left}%;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${duration}s;--vc-drift:${drift}px"></span>`;
    }
    return html;
}

// Completely hides anything Discord itself has painted or will paint while our
// splash is up, regardless of what class names Discord's own loading screen uses.
// Returns the style node; it gets appended alongside the splash itself once the
// document is ready, since document.head/documentElement may not exist yet.
function makeHideNativeDiscordUIStyle() {
    const style = document.createElement("style");
    style.id = "vc-splash-hide-native";
    style.textContent = `
        html, body {
            background: #08090b !important;
            overflow: hidden !important;
        }
        body > *:not(#vc-splash-root) {
            visibility: hidden !important;
        }
    `;
    hideDiscordStyle = style;
    return style;
}

function restoreNativeDiscordUI() {
    hideDiscordStyle?.remove();
    hideDiscordStyle = null;
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
            background:
                radial-gradient(circle at 20% 15%, rgba(255, 255, 255, 0.07) 0%, transparent 45%),
                radial-gradient(circle at 82% 85%, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 50% 35%, #1c1e24 0%, #101216 55%, #08090b 100%);
            background-size: 200% 200%, 200% 200%, 100% 100%;
            animation: vc-splash-bg-drift 14s ease-in-out infinite;
            color: #f5f6f8;
            font-family: "gg sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
            opacity: 1;
            transition: opacity ${FADE_MS}ms ease;
            user-select: none;
            -webkit-app-region: drag;
            overflow: hidden;
        }
        #vc-splash-root.vc-splash-hidden {
            opacity: 0;
            pointer-events: none;
        }
        @keyframes vc-splash-bg-drift {
            0%, 100% { background-position: 0% 0%, 100% 100%, 0 0; }
            50% { background-position: 20% 10%, 80% 90%, 0 0; }
        }
        .vc-splash-particles {
            position: absolute;
            inset: 0;
            overflow: hidden;
            pointer-events: none;
        }
        .vc-splash-particle {
            position: absolute;
            bottom: -10px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.35);
            animation-name: vc-splash-particle-rise;
            animation-timing-function: ease-in;
            animation-iteration-count: infinite;
        }
        @keyframes vc-splash-particle-rise {
            0% { transform: translate(0, 0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: .6; }
            100% { transform: translate(var(--vc-drift), -110vh); opacity: 0; }
        }
        .vc-splash-sound-cluster {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 10px 4px 4px;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.05);
            -webkit-app-region: no-drag;
        }
        .vc-splash-sound-toggle {
            width: 28px;
            height: 28px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.06);
            color: #c3c7cd;
            cursor: pointer;
            transition: background 150ms ease, color 150ms ease, transform 150ms ease;
        }
        .vc-splash-sound-toggle:hover {
            background: rgba(255, 255, 255, 0.14);
            color: #f5f6f8;
            transform: scale(1.08);
        }
        .vc-splash-sound-muted {
            color: #6c717a;
        }
        .vc-splash-volume-slider {
            -webkit-appearance: none;
            appearance: none;
            width: 70px;
            height: 3px;
            border-radius: 2px;
            background: linear-gradient(90deg, #d6d9de var(--vc-vol, 50%), #363940 var(--vc-vol, 50%));
            cursor: pointer;
        }
        .vc-splash-volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 11px;
            height: 11px;
            border-radius: 50%;
            background: #f5f6f8;
            border: none;
            box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
        }
        .vc-splash-volume-slider::-moz-range-thumb {
            width: 11px;
            height: 11px;
            border-radius: 50%;
            background: #f5f6f8;
            border: none;
        }
        .vc-splash-logo-wrap {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
            min-height: ${LOGO_MAX_HEIGHT}px;
            --vc-logo-w: ${LOGO_MAX_WIDTH}px;
            --vc-logo-h: ${LOGO_MAX_HEIGHT}px;
        }
        .vc-splash-logo-glow {
            position: absolute;
            width: calc(var(--vc-logo-w) + 70px);
            height: calc(var(--vc-logo-h) + 70px);
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 45%, transparent 72%);
            filter: blur(2px);
            animation: vc-splash-glow-breathe 3.2s ease-in-out infinite;
        }
        @keyframes vc-splash-glow-breathe {
            0%, 100% { transform: scale(0.94); opacity: 0.7; }
            50% { transform: scale(1.06); opacity: 1; }
        }
        .vc-splash-logo-ring {
            position: absolute;
            width: calc(var(--vc-logo-w) + 44px);
            height: calc(var(--vc-logo-h) + 44px);
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.22);
            animation: vc-splash-ring-pulse 2.8s cubic-bezier(0.2, 0.6, 0.35, 1) infinite;
        }
        .vc-splash-logo-ring.vc-splash-ring-delay {
            animation-delay: 1.4s;
        }
        @keyframes vc-splash-ring-pulse {
            0% { transform: scale(0.82); opacity: 0.6; }
            70% { opacity: 0.18; }
            100% { transform: scale(1.32); opacity: 0; }
        }
        .vc-splash-logo {
            position: relative;
            max-width: ${LOGO_MAX_WIDTH}px;
            max-height: ${LOGO_MAX_HEIGHT}px;
            width: auto;
            height: auto;
            opacity: 0;
            filter: drop-shadow(0 0 18px rgba(255, 255, 255, 0.3));
            animation: vc-splash-logo-float 3.4s ease-in-out infinite, vc-splash-logo-in 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes vc-splash-logo-in {
            0% { opacity: 0; transform: scale(0.85) translateY(10px); filter: drop-shadow(0 0 0 rgba(255, 255, 255, 0)); }
            60% { opacity: 1; transform: scale(1.03) translateY(-2px); }
            100% { opacity: 1; transform: scale(1) translateY(0); filter: drop-shadow(0 0 18px rgba(255, 255, 255, 0.3)); }
        }
        @keyframes vc-splash-logo-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        .vc-splash-title {
            font-size: 22px;
            font-weight: 600;
            letter-spacing: .3px;
            margin-bottom: 6px;
            background: linear-gradient(90deg, #f5f6f8, #9096a0, #f5f6f8);
            background-size: 200% auto;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: vc-splash-title-shine 5s linear infinite;
        }
        @keyframes vc-splash-title-shine {
            0% { background-position: 0% center; }
            100% { background-position: 200% center; }
        }
        .vc-splash-version {
            font-size: 12px;
            color: #7d838f;
            margin-bottom: 26px;
            font-variant-numeric: tabular-nums;
        }
        .vc-splash-bar-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 14px;
        }
        .vc-splash-bar-track {
            width: 220px;
            height: 4px;
            border-radius: 2px;
            background: #202329;
            overflow: hidden;
            position: relative;
        }
        .vc-splash-bar-fill {
            width: 0%;
            height: 100%;
            border-radius: 2px;
            background: linear-gradient(90deg, #d6d9de, #f5f6f8, #d6d9de);
            background-size: 200% auto;
            transition: width 350ms ease;
            animation: vc-splash-bar-shine 2s linear infinite;
        }
        @keyframes vc-splash-bar-shine {
            0% { background-position: 0% center; }
            100% { background-position: 200% center; }
        }
        .vc-splash-percent {
            font-size: 11px;
            color: #7d838f;
            font-variant-numeric: tabular-nums;
            width: 32px;
        }
        .vc-splash-status-row {
            display: flex;
            align-items: center;
            gap: 6px;
            min-height: 16px;
            margin-bottom: 40px;
        }
        .vc-splash-status-icon {
            display: flex;
            color: #d6d9de;
            transition: opacity ${STATUS_FADE_MS}ms ease, color 150ms ease;
        }
        .vc-splash-status {
            font-size: 13px;
            color: #c3c7cd;
            transition: opacity ${STATUS_FADE_MS}ms ease;
        }
        .vc-splash-status-fade {
            opacity: 0;
        }
        .vc-splash-status-icon.vc-splash-status-success {
            color: #3ba55c;
        }
        .vc-splash-status-icon.vc-splash-status-warn {
            color: #f0b232;
        }
        .vc-splash-error-toggle {
            display: none;
            font-size: 11px;
            color: #9096a0;
            text-decoration: underline;
            text-underline-offset: 2px;
            cursor: pointer;
            margin-bottom: 8px;
            -webkit-app-region: no-drag;
        }
        .vc-splash-error-toggle:hover {
            color: #f5f6f8;
        }
        .vc-splash-error-toggle.vc-splash-error-toggle-visible {
            display: inline-block;
        }
        .vc-splash-error-details {
            width: min(460px, 80vw);
            max-height: 0;
            margin: 0 0 14px 0;
            padding: 0 12px;
            border-radius: 6px;
            background: #0c0d10;
            border: 1px solid transparent;
            color: #f0b232;
            font-family: "gg mono", "SFMono-Regular", Consolas, monospace;
            font-size: 11px;
            line-height: 1.5;
            text-align: left;
            white-space: pre-wrap;
            word-break: break-word;
            overflow: hidden auto;
            opacity: 0;
            transition: max-height 220ms ease, opacity 220ms ease, padding 220ms ease;
            -webkit-app-region: no-drag;
        }
        .vc-splash-error-details.vc-splash-error-details-open {
            max-height: 120px;
            padding: 10px 12px;
            border-color: rgba(240, 178, 50, 0.25);
            opacity: 1;
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
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
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
        .vc-splash-icon {
            display: block;
            flex-shrink: 0;
        }
    `;

    const el = document.createElement("div");
    el.id = "vc-splash-root";
    el.innerHTML = `
        <div class="vc-splash-particles">${buildParticles()}</div>
        <div class="vc-splash-sound-cluster">
            <div class="vc-splash-sound-toggle" id="vc-splash-sound" role="button" aria-label="Mute startup sound">${icon("speakerHigh", 18)}</div>
            <input class="vc-splash-volume-slider" id="vc-splash-volume" type="range" min="0" max="100" value="50" aria-label="Startup sound volume" />
        </div>
        <div class="vc-splash-logo-wrap">
            <div class="vc-splash-logo-glow"></div>
            <div class="vc-splash-logo-ring"></div>
            <div class="vc-splash-logo-ring vc-splash-ring-delay"></div>
            <img class="vc-splash-logo" alt="PatchCord" />
        </div>
        <div class="vc-splash-title">PatchCord</div>
        <div class="vc-splash-version">${gitHash ?? ""}</div>
        <div class="vc-splash-bar-row">
            <div class="vc-splash-bar-track"><div class="vc-splash-bar-fill" id="vc-splash-bar"></div></div>
            <div class="vc-splash-percent" id="vc-splash-percent">0%</div>
        </div>
        <div class="vc-splash-status-row">
            <span class="vc-splash-status-icon" id="vc-splash-status-icon">${icon("power", 14)}</span>
            <span class="vc-splash-status" id="vc-splash-status"></span>
        </div>
        <span class="vc-splash-error-toggle" id="vc-splash-error-toggle" role="button">Show details</span>
        <pre class="vc-splash-error-details" id="vc-splash-error-details"></pre>
        <div class="vc-splash-tip-box">
            <div class="vc-splash-tip-label">${icon("gear", 12)}DID YOU KNOW</div>
            <div class="vc-splash-tip-text">${TIPS[Math.floor(Math.random() * TIPS.length)]}</div>
        </div>
    `;

    root = el;
    statusEl = el.querySelector("#vc-splash-status");
    statusIconEl = el.querySelector("#vc-splash-status-icon");
    barFillEl = el.querySelector("#vc-splash-bar");
    percentEl = el.querySelector("#vc-splash-percent");
    soundBtnEl = el.querySelector("#vc-splash-sound");
    volumeSliderEl = el.querySelector("#vc-splash-volume");
    errorToggleEl = el.querySelector("#vc-splash-error-toggle");
    errorDetailsEl = el.querySelector("#vc-splash-error-details");
    errorDetailsExpanded = false;

    errorToggleEl?.addEventListener("click", toggleErrorDetails);

    const initialVolume = PlainSettings.splashScreenSound === false
        ? 0
        : (typeof PlainSettings.splashScreenVolume === "number" ? PlainSettings.splashScreenVolume : 0.5);
    volumeBeforeMute = initialVolume > 0 ? initialVolume : 0.5;
    setVolume(initialVolume, false);

    soundBtnEl?.addEventListener("click", toggleMute);

    if (volumeSliderEl) {
        const slider = volumeSliderEl;
        slider.value = String(Math.round(initialVolume * 100));
        slider.style.setProperty("--vc-vol", `${Math.round(initialVolume * 100)}%`);

        slider.addEventListener("input", () => {
            const next = Number(slider.value) / 100;
            slider.style.setProperty("--vc-vol", `${slider.value}%`);
            setVolume(next);
        });
    }

    const logoEl = el.querySelector<HTMLImageElement>(".vc-splash-logo");
    if (logoEl) {
        logoEl.addEventListener("load", () => applyLogoScale(logoEl), { once: true });
        logoEl.addEventListener("error", () => {
            logoEl.style.display = "none";
        }, { once: true });
        logoEl.src = LOGO_URL;
    }

    appendWhenReady(makeHideNativeDiscordUIStyle(), style, el);
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

function setStatusTone(tone: "success" | "warn" | null) {
    if (!statusIconEl) return;
    statusIconEl.classList.toggle("vc-splash-status-success", tone === "success");
    statusIconEl.classList.toggle("vc-splash-status-warn", tone === "warn");
}

function formatErrorDetail(err: unknown) {
    if (err == null) return "No further details were captured.";
    if (err instanceof Error) return err.stack || `${err.name}: ${err.message}`;
    if (typeof err === "string") return err;
    try {
        return JSON.stringify(err, null, 2);
    } catch {
        return String(err);
    }
}

// Surfaces a "Show details" toggle next to the status line when a boot stage
// fails, so people can grab the real error for a bug report without the
// splash screen being cluttered by default.
function showErrorDetails(err: unknown) {
    if (!errorToggleEl || !errorDetailsEl) return;
    errorDetailsEl.textContent = formatErrorDetail(err);
    errorToggleEl.classList.add("vc-splash-error-toggle-visible");
    errorDetailsExpanded = false;
    errorDetailsEl.classList.remove("vc-splash-error-details-open");
    errorToggleEl.textContent = "Show details";
}

function hideErrorDetails() {
    if (!errorToggleEl || !errorDetailsEl) return;
    errorToggleEl.classList.remove("vc-splash-error-toggle-visible");
    errorDetailsEl.classList.remove("vc-splash-error-details-open");
    errorDetailsExpanded = false;
}

function toggleErrorDetails() {
    if (!errorDetailsEl || !errorToggleEl) return;
    errorDetailsExpanded = !errorDetailsExpanded;
    errorDetailsEl.classList.toggle("vc-splash-error-details-open", errorDetailsExpanded);
    errorToggleEl.textContent = errorDetailsExpanded ? "Hide details" : "Show details";
}

async function runUpdateCheck() {
    if (IS_UPDATER_DISABLED) {
        setStatus(UPDATE_RESULT_MESSAGES.disabled, "warn");
        setStatusTone("warn");
        setProgress(1);
        return;
    }

    hideErrorDetails();
    setStatus(UPDATE_STAGES.checkingCurrent.label, UPDATE_STAGES.checkingCurrent.icon);
    setProgress((BOOT_STAGES.length + 1) / TOTAL_STEPS);

    try {
        await new Promise(r => setTimeout(r, STAGE_MS));
        setStatus(UPDATE_STAGES.checkingLatest.label, UPDATE_STAGES.checkingLatest.icon);
        setProgress((BOOT_STAGES.length + 2) / TOTAL_STEPS);

        await new Promise(r => setTimeout(r, STAGE_MS));
        setStatus(UPDATE_STAGES.comparing.label, UPDATE_STAGES.comparing.icon);

        const outdated = await checkForUpdates();
        setProgress(1);

        if (outdated) {
            setStatus(UPDATE_RESULT_MESSAGES.outdated, "warn");
            setStatusTone("warn");
            playErrorChime();
        } else {
            setStatus(UPDATE_RESULT_MESSAGES.upToDate, "check");
            setStatusTone("success");
            playReadyChime();
        }
    } catch (err) {
        setProgress(1);
        SplashLogger.error("Failed to check for updates", err, updateError);
        setStatus(UPDATE_RESULT_MESSAGES.failed, "warn");
        setStatusTone("warn");
        showErrorDetails(err ?? updateError);
        playErrorChime();
    }
}

export function showSplashScreen() {
    if (!shouldShowSplashScreen() || root) return;

    try {
        build();
        shownAt = Date.now();
        playBootChime();
        startAmbientHum();
        playBootSequence(runUpdateCheck);
        setTimeout(() => hideSplashScreen(), MAX_VISIBLE_MS);
    } catch (err) {
        SplashLogger.error("Failed to show splash screen", err);
    }
}

export function hideSplashScreen() {
    if (!root || removed) return Promise.resolve();

    return new Promise<void>(resolve => {
        resolveRemoved = resolve;
        stopBootSequence();

        const elapsed = Date.now() - shownAt;
        const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);

        setTimeout(() => {
            if (!root || removed) {
                resolveRemoved?.();
                return;
            }

            setStatus("Ready!", "check");
            setStatusTone("success");
            setProgress(1);
            stopAmbientHum();
            root.classList.add("vc-splash-hidden");

            setTimeout(() => {
                removed = true;
                root?.remove();
                document.getElementById("vc-splash-style")?.remove();
                restoreNativeDiscordUI();
                root = null;
                statusEl = null;
                statusIconEl = null;
                barFillEl = null;
                percentEl = null;
                soundBtnEl = null;
                volumeSliderEl = null;
                errorToggleEl = null;
                errorDetailsEl = null;
                audioCtx?.close().catch(() => {});
                audioCtx = null;
                resolveRemoved?.();
                resolveRemoved = null;
            }, FADE_MS);
        }, wait);
    });
}