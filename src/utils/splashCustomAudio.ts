/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { del, get, set } from "@api/DataStore";
import { Logger } from "@utils/Logger";

import { parseAudioMetadata } from "./audioMetadata";

const STORAGE_KEY = "PatchCordSplashCustomAudio";
const logger = new Logger("SplashCustomAudio");

export const SPLASH_AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "flac"];

export interface SplashCustomAudio {
    fileName: string;
    mimeType: string;
    buffer: ArrayBuffer;
    dataUri: string;
    /** Only present if it could be read from the file's tags. */
    title?: string;
    /** Only present if it could be read from the file's tags. */
    artist?: string;
    /** Only present if embedded artwork could be read from the file's tags. */
    pictureDataUri?: string;
}

function resolveMimeType(type: string, name: string) {
    if (type && type !== "application/octet-stream") return type;

    switch (name.split(".").pop()?.toLowerCase()) {
        case "mp3": return "audio/mpeg";
        case "wav": return "audio/wav";
        case "ogg": return "audio/ogg";
        case "m4a": return "audio/mp4";
        case "aac": return "audio/aac";
        case "flac": return "audio/flac";
        default: return "audio/mpeg";
    }
}

function bytesToDataUri(bytes: Uint8Array, mimeType: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(new Blob([bytes], { type: mimeType }));
    });
}

function bufferToDataUri(buffer: ArrayBuffer, mimeType: string): Promise<string> {
    return bytesToDataUri(new Uint8Array(buffer), mimeType);
}

/**
 * Reads, stores, and returns the custom splash boot sound. Any metadata that
 * can't be confidently read from the file (title, artist, artwork) is simply
 * left out rather than stored as an empty placeholder.
 */
export async function saveSplashAudio(file: File): Promise<SplashCustomAudio> {
    const buffer = await file.arrayBuffer();
    const mimeType = resolveMimeType(file.type, file.name);

    let title: string | undefined;
    let artist: string | undefined;
    let pictureDataUri: string | undefined;

    try {
        const meta = parseAudioMetadata(buffer, file.name);
        title = meta.title;
        artist = meta.artist;

        if (meta.picture) {
            try {
                pictureDataUri = await bytesToDataUri(meta.picture.data, meta.picture.mimeType);
            } catch (err) {
                logger.warn("Couldn't encode embedded artwork, skipping icon", err);
            }
        }
    } catch (err) {
        logger.warn("Couldn't read audio tags, continuing without metadata", err);
    }

    const dataUri = await bufferToDataUri(buffer, mimeType);

    const entry: SplashCustomAudio = {
        fileName: file.name,
        mimeType,
        buffer,
        dataUri,
        title,
        artist,
        pictureDataUri,
    };

    await set(STORAGE_KEY, entry);
    return entry;
}

export async function getSplashAudio(): Promise<SplashCustomAudio | undefined> {
    try {
        return (await get<SplashCustomAudio>(STORAGE_KEY)) ?? undefined;
    } catch (err) {
        logger.warn("Couldn't read stored splash audio", err);
        return undefined;
    }
}

export async function deleteSplashAudio(): Promise<void> {
    await del(STORAGE_KEY);
}
