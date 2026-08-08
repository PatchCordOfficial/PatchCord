/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { classNameFactory } from "@utils/css";
import { CLASS_WORKER_RAW } from "@utils/ffmpegWorker";
import { Logger } from "@utils/Logger";
import { waitFor } from "@webpack";
import { React } from "@webpack/common";

import { FFmpegState } from "./types";

export const cl = classNameFactory("vc-more-stickers-");
export const clPicker = (className: string, ...args: any[]) => cl("picker-" + className, ...args);

const logger = new Logger("MoreStickers");
const CORS_PROXY = "https://cors.keiran0.workers.dev?url=";

function corsUrl(url: string | URL) {
    return CORS_PROXY + encodeURIComponent(url.toString());
}

export function corsFetch(url: string | URL, init?: RequestInit | undefined) {
    return fetch(corsUrl(url), init);
}

export class Mutex {
    current = Promise.resolve();
    lock() {
        let _resolve: () => void;
        const p = new Promise(resolve => {
            _resolve = () => resolve();
        }) as Promise<void>;
        // Caller gets a promise that resolves when the current outstanding
        // lock resolves
        const rv = this.current.then(() => _resolve);
        // Don't allow the next request until the new promise is done
        this.current = p;
        // Return the new promise
        return rv;
    }
}

export let FFmpegStateContext: React.Context<FFmpegState | undefined> | undefined;
waitFor("createContext", () => {
    FFmpegStateContext = React.createContext<FFmpegState | undefined>(undefined);
});

export async function loadFFmpeg(ffmpeg: FFmpeg, setLoaded: () => void) {
    logger.info("Loading FFmpeg...");
    const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";

    const classWorkerBlob = new Blob([(new TextEncoder()).encode(CLASS_WORKER_RAW)], { type: "text/javascript" });
    const classWorkerUrl = URL.createObjectURL(classWorkerBlob);

    await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
        workerURL: `${baseURL}/ffmpeg-core.worker.js`,
        classWorkerURL: classWorkerUrl,
    });
    setLoaded();
    logger.info("FFmpeg loaded!");
}
