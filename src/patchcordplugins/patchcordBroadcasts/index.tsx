import { Link } from "@components/Link";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { React, Toasts, UserStore } from "@webpack/common";

const BROADCAST_URL = "https://patchcord.itssolar.dev/broadcast/broadcast.json";
const PING_URL = "https://patchcord.itssolar.dev/broadcast/api/ping.php";
const LAST_SEEN_KEY = "PatchCord_LastSeenBroadcastId";

const settings = definePluginSettings({
    broadcastSoundVolume: {
        type: OptionType.SLIDER,
        description: "Broadcast sound effect volume",
        default: 50,
        markers: [0, 25, 50, 75, 100]
    },
    broadcastTTSVolume: {
        type: OptionType.SLIDER,
        description: "Broadcast TTS volume",
        default: 100,
        markers: [0, 25, 50, 75, 100]
    }
});

// Poll broadcasts every 10 seconds
const POLL_INTERVAL_MS = 10 * 1000;
// Ping presence every 1 minute
const PING_INTERVAL_MS = 1 * 60 * 1000;

let pollInterval: any;
let pingInterval: any;

// Global state to store the online count so UI can read it
export let currentOnlineCount = 0;
const onlineCountListeners = new Set<(count: number) => void>();

export function subscribeToOnlineCount(listener: (count: number) => void) {
    onlineCountListeners.add(listener);
    listener(currentOnlineCount);
    return () => onlineCountListeners.delete(listener);
}

interface BroadcastData {
    id: string;
    message: string;
    type?: number;
    author?: string;
    link?: string;
}

async function sendPresencePing() {
    try {
        const user = UserStore.getCurrentUser();
        if (!user) return; // Wait until logged in

        const res = await fetch(PING_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: user.id,
                username: user.globalName || user.username,
                avatar: user.getAvatarURL ? user.getAvatarURL(undefined, 128, true) : null
            })
        });

        if (res.ok) {
            const data = await res.json();
            if (typeof data.online === "number") {
                currentOnlineCount = data.online;
                onlineCountListeners.forEach(fn => fn(currentOnlineCount));
            }
        }
    } catch (e) {
        // silently ignore ping failures
    }
}

export interface OnlineUser {
    user_id: string;
    username: string;
    avatar: string | null;
}

export interface OnlineUsersPage {
    users: OnlineUser[];
    total: number;
    page: number;
    pages: number;
}

export async function fetchOnlineUsers(page: number, search: string): Promise<OnlineUsersPage | null> {
    try {
        const params = new URLSearchParams({ list: "1", page: String(page) });
        if (search) params.set("search", search);

        const res = await fetch(`${PING_URL}?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) return null;

        const data = await res.json();
        if (!Array.isArray(data.users)) return null;

        return {
            users: data.users,
            total: data.total ?? data.users.length,
            page: data.page ?? page,
            pages: data.pages ?? 1
        };
    } catch (e) {
        return null;
    }
}

async function pollOnlineCount() {
    try {
        // GET without user_id just returns the current count from ping.php
        const res = await fetch(PING_URL, { cache: "no-store" });
        if (res.ok) {
            const data = await res.json();
            if (typeof data.online === "number" && currentOnlineCount !== data.online) {
                currentOnlineCount = data.online;
                onlineCountListeners.forEach(fn => fn(currentOnlineCount));
            }
        }
    } catch (e) {
        // silently ignore fetch errors
    }
}


const BROADCAST_SOUND_URL = "https://patchcord.itssolar.dev/assets/broadcast.mp3";

function getFemaleVoice(): SpeechSynthesisVoice | null {
    if (typeof speechSynthesis === "undefined") return null;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;

    const femaleVoice = voices.find(v => /female|woman|girl|zira|samantha|amelia|aimee|serena|linda|victoria|karen/i.test(v.name));
    if (femaleVoice) return femaleVoice;

    return voices.find(v => /en-?us|en-?gb|en-?au|en-?ca|en-?nz/.test(v.lang) && !/male|man|boy/i.test(v.name)) ?? voices[0];
}

function clampVolume(value: number) {
    return Math.max(0, Math.min(1, value));
}

function getBroadcastSoundVolume() {
    return clampVolume((settings.store.broadcastSoundVolume ?? 50) / 100);
}

function getBroadcastTTSVolume() {
    return clampVolume((settings.store.broadcastTTSVolume ?? 100) / 100);
}

function playBroadcastTTS(text: string) {
    if (typeof speechSynthesis === "undefined") return;
    try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.volume = getBroadcastTTSVolume();
        utterance.rate = 1;
        utterance.pitch = 1.2;
        const voice = getFemaleVoice();
        if (voice) utterance.voice = voice;
        speechSynthesis.speak(utterance);
    } catch (e) {
        // silently ignore TTS errors
    }
}

function playBroadcastSound(onEnded?: () => void) {
    try {
        const audio = new Audio(BROADCAST_SOUND_URL);
        audio.volume = getBroadcastSoundVolume();
        if (onEnded) audio.onended = onEnded;
        audio.play().catch(() => {
            // Autoplay may be blocked until the user interacts with the page; play TTS instead.
            onEnded?.();
        });
    } catch (e) {
        // silently ignore audio errors
        onEnded?.();
    }
}

function getBroadcastToastType(type?: number) {
    switch (type) {
        case 1:
            return Toasts.Type.SUCCESS;
        case 2:
            return Toasts.Type.FAILURE;
        case 3:
            return Toasts.Type.FAILURE;
        default:
            return Toasts.Type.MESSAGE;
    }
}

async function checkBroadcasts() {
    try {
        const res = await fetch(BROADCAST_URL, { cache: "no-store" });
        if (!res.ok) return;
        const data: BroadcastData = await res.json();
        if (!data || !data.id || !data.message) return;

        const lastSeen = await DataStore.get(LAST_SEEN_KEY);
        if (data.id !== lastSeen) {
            await DataStore.set(LAST_SEEN_KEY, data.id);

            const author = data.author ?? "PatchCord";
            const toastType = getBroadcastToastType(data.type);
            const toastId = `broadcast-${data.id}`;
            const toastMessage = `[${author}] ${data.message}`;
            const toastLink = data.link?.trim();

            playBroadcastSound(() => playBroadcastTTS(data.message));

            Toasts.show({
                message: toastMessage,
                type: toastType,
                id: toastId,
                options: {
                    component: toastLink ? (
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            width: "100%",
                            backgroundColor: "var(--background-floating)",
                            borderRadius: 8,
                            padding: "8px 10px",
                            boxSizing: "border-box"
                        }}>
                            <span>{toastMessage}</span>
                            <Link href={toastLink} style={{ wordBreak: "break-word" }}>{toastLink}</Link>
                        </div>
                    ) : undefined,
                    duration: 10000,
                    position: Toasts.Position.TOP
                }
            });
        }
    } catch (e) {
        // silently ignore fetch errors
    }
}

function onVisibilityChange() {
    if (document.visibilityState === "visible") {
        checkBroadcasts();
        pollOnlineCount();
    }
}

export default definePlugin({
    name: "PatchCordBroadcasts",
    description: "Receives global announcements from the PatchCord developers and tracks live user presence.",
    authors: [{ name: "itssolar.dev", id: 864612087741546527n }],
    required: true,
    settings,
    start() {
        // Check broadcasts and online count 2s after startup
        setTimeout(() => {
            checkBroadcasts();
            pollOnlineCount();
        }, 2000);

        // Initial presence ping 5s after startup
        setTimeout(sendPresencePing, 5000);

        // Fast interval (10s)
        pollInterval = setInterval(() => {
            checkBroadcasts();
            pollOnlineCount();
        }, POLL_INTERVAL_MS);

        // Presence ping interval (1m)
        pingInterval = setInterval(sendPresencePing, PING_INTERVAL_MS);

        // Also fire when user refocuses Discord
        document.addEventListener("visibilitychange", onVisibilityChange);
    },
    stop() {
        clearInterval(pollInterval);
        clearInterval(pingInterval);
        document.removeEventListener("visibilitychange", onVisibilityChange);
    }
});
