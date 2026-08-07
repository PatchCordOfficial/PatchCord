/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execFile } from "child_process";
import { randomUUID } from "crypto";
import type { IpcMainInvokeEvent } from "electron";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

import { DATA_DIR } from "@main/utils/constants";

const exec = promisify(execFile);

const TEMP_DIR = join(DATA_DIR, "mkvToMp4");

export async function convertMkv(_: IpcMainInvokeEvent, data: ArrayBuffer, filename: string) {
    const id = randomUUID();
    const inputPath = join(TEMP_DIR, `${id}_${filename}`);
    const outputFilename = filename.replace(/\.mkv$/i, ".mp4");
    const outputPath = join(TEMP_DIR, `${id}_${outputFilename}`);

    await mkdir(TEMP_DIR, { recursive: true });
    await writeFile(inputPath, Buffer.from(data));

    try {
        await exec("ffmpeg", [
            "-i", inputPath,
            "-c", "copy",
            "-movflags", "+faststart",
            "-y",
            outputPath
        ]);
    } catch (e) {
        await rm(inputPath).catch(() => {});
        throw new Error("ffmpeg remux failed. Is ffmpeg installed and in your PATH?");
    }

    const outputData = await readFile(outputPath);

    await rm(inputPath).catch(() => {});
    await rm(outputPath).catch(() => {});

    return {
        data: outputData.buffer,
        filename: outputFilename
    };
}
