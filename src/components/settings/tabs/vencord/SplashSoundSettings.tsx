/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./SplashSoundSettings.css";

import { useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { PauseIcon, PlayIcon, ReplayIcon, SkipBackIcon, SkipForwardIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { makeRange } from "@utils/types";
import { deleteSplashAudio, getSplashAudio, saveSplashAudio, SPLASH_AUDIO_EXTENSIONS, SplashCustomAudio } from "@utils/splashCustomAudio";
import { React, showToast, Slider } from "@webpack/common";

const cl = classNameFactory("vc-splash-sound-settings-");
const logger = new Logger("SplashSoundSettings");

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SplashSoundSettings() {
    const settings = useSettings(["splashScreenSound", "splashScreenVolume", "splashScreenUseCustomAudio"]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const audioElRef = React.useRef<HTMLAudioElement | null>(null);

    const [audio, setAudio] = React.useState<SplashCustomAudio | undefined>(undefined);
    const [loading, setLoading] = React.useState(true);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentTime, setCurrentTime] = React.useState(0);
    const [duration, setDuration] = React.useState(0);

    React.useEffect(() => {
        let cancelled = false;

        getSplashAudio().then(stored => {
            if (!cancelled) {
                setAudio(stored);
                setLoading(false);
            }
        });

        return () => {
            cancelled = true;
            audioElRef.current?.pause();
            audioElRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const resetPlaybackState = () => {
        audioElRef.current?.pause();
        audioElRef.current = null;
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
    };

    const getPlayer = (source: SplashCustomAudio) => {
        if (audioElRef.current) return audioElRef.current;

        const el = new Audio(source.dataUri);
        el.volume = settings.splashScreenVolume ?? 0.5;
        el.addEventListener("loadedmetadata", () => setDuration(el.duration || 0));
        el.addEventListener("timeupdate", () => setCurrentTime(el.currentTime));
        el.addEventListener("ended", () => setIsPlaying(false));
        audioElRef.current = el;
        return el;
    };

    const play = () => {
        if (!audio) return;
        const el = getPlayer(audio);
        el.play()
            .then(() => setIsPlaying(true))
            .catch(err => {
                logger.error("Couldn't play preview", err);
                showToast("Couldn't play this audio file");
            });
    };

    const pause = () => {
        audioElRef.current?.pause();
        setIsPlaying(false);
    };

    const replay = () => {
        if (!audio) return;
        const el = getPlayer(audio);
        el.currentTime = 0;
        play();
    };

    const skip = (deltaSeconds: number) => {
        if (!audio) return;
        const el = getPlayer(audio);
        const target = el.currentTime + deltaSeconds;
        el.currentTime = Math.max(0, el.duration ? Math.min(target, el.duration) : target);
    };

    const seekTo = (time: number) => {
        if (!audio) return;
        const el = getPlayer(audio);
        el.currentTime = time;
        setCurrentTime(time);
    };

    const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const extension = file.name.split(".").pop()?.toLowerCase();
        if (!extension || !SPLASH_AUDIO_EXTENSIONS.includes(extension)) {
            showToast("Unsupported file type. Try mp3 or wav.");
            event.target.value = "";
            return;
        }

        resetPlaybackState();

        try {
            showToast("Adding audio pack…");
            const saved = await saveSplashAudio(file);
            setAudio(saved);
            settings.splashScreenUseCustomAudio = true;
            showToast(`Custom audio pack added: ${file.name}`);
        } catch (err) {
            logger.error("Couldn't save audio pack", err);
            showToast("Couldn't add that audio file");
        }

        event.target.value = "";
    };

    const removeAudio = async () => {
        resetPlaybackState();

        try {
            await deleteSplashAudio();
        } catch (err) {
            logger.error("Couldn't remove audio pack", err);
        }

        setAudio(undefined);
        settings.splashScreenUseCustomAudio = false;
        showToast("Custom audio pack removed");
    };

    return (
        <div className={Margins.bottom16}>
            <Heading>Startup Sound</Heading>
            <Paragraph className={Margins.bottom12}>
                PatchCord plays a soft chime while it boots. Turn it off entirely, or swap it out for your own track below.
            </Paragraph>

            <FormSwitch
                title="Play a sound on startup"
                value={settings.splashScreenSound}
                onChange={v => { settings.splashScreenSound = v; }}
                hideBorder
            />

            {settings.splashScreenSound && (
                <>
                    <div className={Margins.bottom16}>
                        <Heading>Volume</Heading>
                        <Slider
                            markers={makeRange(0, 100, 10)}
                            initialValue={Math.round((settings.splashScreenVolume ?? 0.5) * 100)}
                            onValueChange={v => {
                                settings.splashScreenVolume = v / 100;
                                if (audioElRef.current) audioElRef.current.volume = v / 100;
                            }}
                        />
                    </div>

                    <FormSwitch
                        title="Use my custom audio pack"
                        description={audio ? "Plays instead of the built-in startup chime." : "Add an mp3 or wav file below to enable this."}
                        value={!!audio && settings.splashScreenUseCustomAudio}
                        disabled={!audio}
                        onChange={v => { settings.splashScreenUseCustomAudio = v; }}
                        className={Margins.bottom12}
                        hideBorder
                    />

                    {loading ? (
                        <Paragraph>Loading your audio pack…</Paragraph>
                    ) : (
                        <Card className={cl("card")}>
                            {audio ? (
                                <>
                                    <div className={cl("track")}>
                                        {audio.pictureDataUri && (
                                            <img className={cl("art")} src={audio.pictureDataUri} alt="" />
                                        )}
                                        <div className={cl("track-info")}>
                                            <div className={cl("track-title")}>{audio.title ?? audio.fileName}</div>
                                            {audio.artist && (
                                                <div className={cl("track-artist")}>{audio.artist}</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={cl("scrubber-row")}>
                                        <span className={cl("time")}>{formatTime(currentTime)}</span>
                                        <input
                                            className={cl("scrubber")}
                                            type="range"
                                            min={0}
                                            max={Math.max(duration, 0.1)}
                                            step={0.1}
                                            value={currentTime}
                                            onChange={e => seekTo(Number(e.target.value))}
                                            aria-label="Seek"
                                        />
                                        <span className={cl("time")}>{formatTime(duration)}</span>
                                    </div>

                                    <div className={cl("controls")}>
                                        <Button
                                            variant="none"
                                            onClick={() => skip(-10)}
                                            className={cl("control-btn")}
                                            aria-label="Back 10 seconds"
                                        >
                                            <SkipBackIcon width={18} height={18} />
                                        </Button>
                                        <Button
                                            variant="none"
                                            onClick={() => (isPlaying ? pause() : play())}
                                            className={cl("control-btn", "control-btn-main")}
                                            aria-label={isPlaying ? "Pause" : "Play"}
                                        >
                                            {isPlaying ? <PauseIcon width={20} height={20} /> : <PlayIcon width={20} height={20} />}
                                        </Button>
                                        <Button
                                            variant="none"
                                            onClick={() => skip(10)}
                                            className={cl("control-btn")}
                                            aria-label="Forward 10 seconds"
                                        >
                                            <SkipForwardIcon width={18} height={18} />
                                        </Button>
                                        <Button
                                            variant="none"
                                            onClick={replay}
                                            className={cl("control-btn")}
                                            aria-label="Replay from start"
                                        >
                                            <ReplayIcon width={18} height={18} />
                                        </Button>
                                    </div>

                                    <div className={cl("footer-row")}>
                                        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                                            Replace File
                                        </Button>
                                        <Button variant="dangerPrimary" onClick={removeAudio}>
                                            Remove
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className={cl("empty-state")}>
                                    <Paragraph className={Margins.bottom12}>
                                        No custom audio pack yet. Add an mp3 or wav file to replace the default startup chime.
                                        If it has a title, artist, or cover art embedded, PatchCord will show it here automatically.
                                    </Paragraph>
                                    <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
                                        Add Audio Pack
                                    </Button>
                                </div>
                            )}
                        </Card>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        className={cl("file-input")}
                        accept=".mp3,.wav,.ogg,.m4a,.aac,.flac"
                        onChange={upload}
                    />
                </>
            )}
        </div>
    );
}
