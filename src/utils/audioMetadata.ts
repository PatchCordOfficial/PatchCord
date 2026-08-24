/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Small, dependency-free reader for the metadata we actually need out of a
// user-provided audio file: track title, artist, and embedded artwork.
// Supports ID3v2 (2.2/2.3/2.4) and ID3v1 tags for mp3-family files, and the
// RIFF "INFO" chunk for wav files. Anything that can't be confidently parsed
// is simply omitted from the result instead of guessed at.

export interface AudioPicture {
    mimeType: string;
    data: Uint8Array;
}

export interface AudioMetadata {
    title?: string;
    artist?: string;
    picture?: AudioPicture;
}

export function parseAudioMetadata(buffer: ArrayBuffer, fileName: string): AudioMetadata {
    const result: AudioMetadata = {};

    try {
        const id3v2 = parseId3v2(buffer);
        if (id3v2?.title) result.title = id3v2.title;
        if (id3v2?.artist) result.artist = id3v2.artist;
        if (id3v2?.picture) result.picture = id3v2.picture;
    } catch {
        // ignored, fall through to other strategies
    }

    if (!result.title || !result.artist) {
        try {
            const id3v1 = parseId3v1(buffer);
            if (!result.title && id3v1?.title) result.title = id3v1.title;
            if (!result.artist && id3v1?.artist) result.artist = id3v1.artist;
        } catch {
            // ignored
        }
    }

    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "wav" && (!result.title || !result.artist)) {
        try {
            const riff = parseRiffInfo(buffer);
            if (!result.title && riff?.title) result.title = riff.title;
            if (!result.artist && riff?.artist) result.artist = riff.artist;
        } catch {
            // ignored
        }
    }

    return result;
}

function readSynchsafeInt(view: DataView, offset: number) {
    return (
        ((view.getUint8(offset) & 0x7f) << 21) |
        ((view.getUint8(offset + 1) & 0x7f) << 14) |
        ((view.getUint8(offset + 2) & 0x7f) << 7) |
        (view.getUint8(offset + 3) & 0x7f)
    );
}

function readUint32BE(view: DataView, offset: number) {
    return view.getUint32(offset, false);
}

function findNullTerminator(bytes: Uint8Array, start: number, wide: boolean) {
    const step = wide ? 2 : 1;
    for (let i = start; i < bytes.length - (wide ? 1 : 0); i += step) {
        if (bytes[i] === 0 && (!wide || bytes[i + 1] === 0)) return i;
    }
    return bytes.length;
}

function decodeText(bytes: Uint8Array, encodingByte: number) {
    try {
        switch (encodingByte) {
            case 1: { // UTF-16 with BOM
                const hasBom = bytes.length >= 2;
                const little = !hasBom || !(bytes[0] === 0xfe && bytes[1] === 0xff);
                const start = hasBom && ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)) ? 2 : 0;
                return new TextDecoder(little ? "utf-16le" : "utf-16be").decode(bytes.slice(start));
            }
            case 2: // UTF-16BE, no BOM
                return new TextDecoder("utf-16be").decode(bytes);
            case 3: // UTF-8
                return new TextDecoder("utf-8").decode(bytes);
            case 0: // ISO-8859-1
            default:
                return new TextDecoder("latin1").decode(bytes);
        }
    } catch {
        return "";
    }
}

function cleanString(str: string | undefined) {
    if (!str) return undefined;
    const trimmed = str.replace(/\u0000+$/g, "").trim();
    return trimmed.length ? trimmed : undefined;
}

interface Id3Result {
    title?: string;
    artist?: string;
    picture?: AudioPicture;
}

function parseId3v2(buffer: ArrayBuffer): Id3Result | undefined {
    const view = new DataView(buffer);
    if (buffer.byteLength < 10) return undefined;

    const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2));
    if (magic !== "ID3") return undefined;

    const majorVersion = view.getUint8(3);
    const flags = view.getUint8(5);
    const tagSize = readSynchsafeInt(view, 6);
    let offset = 10;

    const hasExtendedHeader = (flags & 0x40) !== 0;
    if (hasExtendedHeader && majorVersion >= 3) {
        const extSize = majorVersion === 4 ? readSynchsafeInt(view, offset) : readUint32BE(view, offset);
        offset += extSize + (majorVersion === 4 ? 0 : 4);
    }

    const tagEnd = Math.min(buffer.byteLength, 10 + tagSize);
    const result: Id3Result = {};
    const idSize = majorVersion === 2 ? 3 : 4;
    const headerSize = majorVersion === 2 ? 6 : 10;

    while (offset + headerSize <= tagEnd) {
        const idBytes = new Uint8Array(buffer, offset, idSize);
        if (idBytes[0] === 0) break; // padding reached

        const frameId = String.fromCharCode(...idBytes);
        let frameSize: number;

        if (majorVersion === 2) {
            frameSize = (view.getUint8(offset + 3) << 16) | (view.getUint8(offset + 4) << 8) | view.getUint8(offset + 5);
        } else if (majorVersion === 4) {
            frameSize = readSynchsafeInt(view, offset + 4);
        } else {
            frameSize = readUint32BE(view, offset + 4);
        }

        const dataStart = offset + headerSize;
        if (frameSize <= 0 || dataStart + frameSize > buffer.byteLength) break;

        const frameBytes = new Uint8Array(buffer, dataStart, frameSize);

        if ((frameId === "TIT2" || frameId === "TT2") && !result.title) {
            result.title = cleanString(decodeText(frameBytes.slice(1), frameBytes[0]));
        } else if ((frameId === "TPE1" || frameId === "TP1") && !result.artist) {
            result.artist = cleanString(decodeText(frameBytes.slice(1), frameBytes[0]));
        } else if ((frameId === "APIC" || frameId === "PIC") && !result.picture) {
            result.picture = parsePictureFrame(frameBytes, frameId === "PIC");
        }

        offset = dataStart + frameSize;
    }

    return result;
}

function parsePictureFrame(frame: Uint8Array, isCompact: boolean): AudioPicture | undefined {
    try {
        const encoding = frame[0];
        let pos = 1;

        let mimeType: string;
        if (isCompact) {
            // 3-char format code, e.g. "JPG"/"PNG"
            const code = String.fromCharCode(frame[pos], frame[pos + 1], frame[pos + 2]).toUpperCase();
            mimeType = code === "PNG" ? "image/png" : "image/jpeg";
            pos += 3;
        } else {
            const mimeEnd = findNullTerminator(frame, pos, false);
            mimeType = new TextDecoder("latin1").decode(frame.slice(pos, mimeEnd)) || "image/jpeg";
            pos = mimeEnd + 1;
        }

        pos += 1; // picture type byte

        const wide = encoding === 1 || encoding === 2;
        const descEnd = findNullTerminator(frame, pos, wide);
        pos = descEnd + (wide ? 2 : 1);

        const data = frame.slice(pos);
        if (!data.length) return undefined;

        return { mimeType, data };
    } catch {
        return undefined;
    }
}

function parseId3v1(buffer: ArrayBuffer): Id3Result | undefined {
    if (buffer.byteLength < 128) return undefined;

    const tagStart = buffer.byteLength - 128;
    const bytes = new Uint8Array(buffer, tagStart, 128);
    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2]);
    if (magic !== "TAG") return undefined;

    const decode = (start: number, len: number) =>
        cleanString(new TextDecoder("latin1").decode(bytes.slice(start, start + len)).replace(/\u0000/g, ""));

    return {
        title: decode(3, 30),
        artist: decode(33, 30),
    };
}

function parseRiffInfo(buffer: ArrayBuffer): Id3Result | undefined {
    const view = new DataView(buffer);
    if (buffer.byteLength < 12) return undefined;

    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    if (riff !== "RIFF" || wave !== "WAVE") return undefined;

    let offset = 12;
    const result: Id3Result = {};

    while (offset + 8 <= buffer.byteLength) {
        const chunkId = String.fromCharCode(
            view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3)
        );
        const chunkSize = view.getUint32(offset + 4, true);
        const chunkDataStart = offset + 8;

        if (chunkId === "LIST" && chunkDataStart + 4 <= buffer.byteLength) {
            const listType = String.fromCharCode(
                view.getUint8(chunkDataStart), view.getUint8(chunkDataStart + 1),
                view.getUint8(chunkDataStart + 2), view.getUint8(chunkDataStart + 3)
            );

            if (listType === "INFO") {
                let subOffset = chunkDataStart + 4;
                const listEnd = Math.min(buffer.byteLength, chunkDataStart + chunkSize);

                while (subOffset + 8 <= listEnd) {
                    const subId = String.fromCharCode(
                        view.getUint8(subOffset), view.getUint8(subOffset + 1),
                        view.getUint8(subOffset + 2), view.getUint8(subOffset + 3)
                    );
                    const subSize = view.getUint32(subOffset + 4, true);
                    const subDataStart = subOffset + 8;
                    if (subDataStart + subSize > buffer.byteLength) break;

                    const text = cleanString(new TextDecoder("latin1").decode(
                        new Uint8Array(buffer, subDataStart, subSize)
                    ));

                    if (subId === "INAM" && text) result.title = text;
                    if (subId === "IART" && text) result.artist = text;

                    subOffset = subDataStart + subSize + (subSize % 2);
                }
            }
        }

        offset = chunkDataStart + chunkSize + (chunkSize % 2);
    }

    return result;
}
