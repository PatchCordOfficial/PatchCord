/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import definePlugin, { PluginNative } from "@utils/types";
import { ChannelStore, DraftType, FluxDispatcher, SelectedChannelStore, showToast, Toasts, UploadHandler } from "@webpack/common";

const Native = VencordNative.pluginHelpers.MkvToMp4 as PluginNative<typeof import("./native")>;
const logger = new Logger("MkvToMp4");

interface UploadAddFilesEvent {
    type: string;
    channelId: string;
    draftType: number;
    files: File[];
    uploads: unknown[];
    items: unknown[];
}

let interceptor: ((event: unknown) => void) | null = null;
let converting = false;

function extractFiles(value: unknown): File[] {
    if (value instanceof File) return [value];
    if (!Array.isArray(value)) return [];
    return value.flatMap(entry => {
        if (entry instanceof File) return [entry];
        if (!entry || typeof entry !== "object") return [];
        const f = "file" in entry ? (entry as any).file : null;
        if (f instanceof File) return [f];
        const item = "item" in entry && (entry as any).item && typeof (entry as any).item === "object" ? (entry as any).item : null;
        if (!item || !("file" in item)) return [];
        return item.file instanceof File ? [item.file] : [];
    });
}

function hasMkvFiles(files: readonly File[]): boolean {
    return files.some(f => f.name.toLowerCase().endsWith(".mkv"));
}

async function convertFile(file: File): Promise<File> {
    const buffer = await file.arrayBuffer();
    const result = await Native.convertMkv(buffer, file.name);
    return new File([result.data], result.filename, { type: "video/mp4" });
}

async function processFiles(files: readonly File[]): Promise<File[]> {
    const processed: File[] = [];
    for (const file of files) {
        if (file.name.toLowerCase().endsWith(".mkv")) {
            try {
                const converted = await convertFile(file);
                processed.push(converted);
                showToast(`Converted ${file.name} to MP4`, Toasts.Type.SUCCESS);
            } catch (e) {
                logger.error("Conversion failed:", e);
                showToast(`Failed to convert ${file.name}`, Toasts.Type.FAILURE);
            }
        } else {
            processed.push(file);
        }
    }
    return processed;
}

function interceptUpload(event: unknown): void {
    if (converting) return;
    if (!event || typeof event !== "object" || !("type" in event)) return;

    const payload = event as UploadAddFilesEvent;
    if (payload.type !== "UPLOAD_ATTACHMENT_ADD_FILES") return;
    if (payload.draftType !== DraftType.ChannelMessage) return;

    const files = [
        ...extractFiles(payload.files),
        ...extractFiles(payload.uploads),
        ...extractFiles(payload.items)
    ];
    const unique = Array.from(new Set(files));
    if (!unique.length || !hasMkvFiles(unique)) return;

    payload.files = [];
    payload.uploads = [];
    payload.items = [];

    const channel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());
    if (!channel) return;

    converting = true;
    void processFiles(unique).then(processed => {
        converting = false;
        if (processed.length) {
            UploadHandler.promptToUpload(processed, channel, DraftType.ChannelMessage);
        }
    });
}

export default definePlugin({
    name: "MkvToMp4",
    description: "Converts MKV files to MP4 when uploading so Discord can play them inline",
    authors: [{ name: "itssolar.dev", id: 864612087741546527n }],
    start() {
        interceptor = interceptUpload;
        FluxDispatcher.addInterceptor(interceptor);
    },
    stop() {
        if (interceptor !== null) {
            const idx = FluxDispatcher._interceptors.indexOf(interceptor);
            if (idx > -1) {
                FluxDispatcher._interceptors.splice(idx, 1);
            }
            interceptor = null;
        }
    }
});
