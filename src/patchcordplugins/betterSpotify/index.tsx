/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import { copyWithToast } from "@utils/discord";
import { SpotifyStore, useStateFromStores } from "@webpack/common";

function SpotifyButton() {
    const track = useStateFromStores([SpotifyStore], () => SpotifyStore.getTrack());
    const activity = useStateFromStores([SpotifyStore], () => SpotifyStore.getActivity());

    if (!track || !activity) return null;

    const artist = track.artists.map(a => a.name).join(", ");
    const albumArt = track.album.image?.url ?? activity.assets?.large_image;

    return (
        <button
            className="vc-betterspotify-btn"
            onClick={() => {
                copyWithToast(`${artist} - ${track.name}`);
            }}
            aria-label={`${artist} - ${track.name} — Click to copy`}
        >
            {albumArt && (
                <img
                    className="vc-betterspotify-art"
                    src={albumArt}
                    alt=""
                />
            )}
            <div className="vc-betterspotify-info">
                <span className="vc-betterspotify-title">{track.name}</span>
                <span className="vc-betterspotify-artist">{artist}</span>
            </div>
        </button>
    );
}

export default definePlugin({
    name: "BetterSpotify",
    description: "Shows current Spotify track in your user area with one-click copy",
    authors: [{ name: "itssolar.dev", id: 864612087741546527n }],
    userAreaButton: {
        render: ErrorBoundary.wrap(SpotifyButton, { noop: true })
    }
});
