import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Flex } from "@components/Flex";
import { HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Margins } from "@utils/margins";
import * as DataStore from "@api/DataStore";
import { React, useState, useEffect } from "@webpack/common";

const INSTALLED_VERSION = "v16.0.0"; // Hardcoded installed client version for update comparison
const LATEST_URL = "https://patchcord.itssolar.dev/installer/latest.json";
const LAST_UPDATED_KEY = "PatchcordUpdater_lastUpdatedDate";

export interface UpdateManifest {
    latest: string;
    buildDate: string;
    downloadUrl: string;
    changelog: string[];
}

export function UpdaterDashboard() {
    const [manifest, setManifest] = useState<UpdateManifest | null>(null);
    const [isChecking, setIsChecking] = useState(true);
    const [lastKnown, setLastKnown] = useState<string | null>(null);
    const [isOutdated, setIsOutdated] = useState(false);

    useEffect(() => {
        const init = async () => {
            const known = await DataStore.get<string>(LAST_UPDATED_KEY);
            const baseline = known ?? INSTALLED_VERSION;
            setLastKnown(baseline);
            await checkUpdates(baseline);
        };
        init();
    }, []);

    const checkUpdates = async (currentKnown?: string | null) => {
        setIsChecking(true);
        try {
            const res = await fetch(LATEST_URL, { cache: "no-store" });
            if (res.ok) {
                const data: UpdateManifest = await res.json();
                setManifest(data);

                const localVersion = currentKnown ?? INSTALLED_VERSION;
                setLastKnown(localVersion);

                if (data.latest !== localVersion) {
                    setIsOutdated(true);
                } else {
                    setIsOutdated(false);
                }
            }
        } catch (e) {
            console.error("Failed to fetch PatchCord update manifest", e);
        }
        setIsChecking(false);
    };

    const markAsUpdated = async () => {
        if (!manifest) return;
        // In this installer flow, clicking download assumes they will install it.
        // We set the LAST_UPDATED_KEY so it doesn't spam them again until a NEW version drops.
        await DataStore.set(LAST_UPDATED_KEY, manifest.latest);
        setIsOutdated(false);
        setLastKnown(manifest.latest);
        VencordNative.native.openExternal(manifest.downloadUrl || "https://patchcord.itssolar.dev/download.html");
    };

    if (isChecking && !manifest) {
        return (
            <Card variant="primary" className={Margins.top20}>
                <Flex alignItems="center" gap="1em">
                    <div className="vc-spinner" style={{ width: 24, height: 24 }} />
                    <Paragraph>Checking for updates...</Paragraph>
                </Flex>
            </Card>
        );
    }

    if (isOutdated && manifest) {
        return (
            <Flex flexDirection="column" gap="16px" className={Margins.top20}>
                <Card
                    style={{
                        background: "linear-gradient(135deg, rgba(88, 101, 242, 0.1), rgba(235, 69, 158, 0.1))",
                        borderColor: "var(--brand-experiment)",
                        borderWidth: "2px",
                        borderStyle: "solid"
                    }}
                >
                    <HeadingSecondary>🚀 New Update Available!</HeadingSecondary>
                    <Paragraph className={Margins.bottom20}>
                        PatchCord <strong>{manifest.latest}</strong> was released on {manifest.buildDate}.
                    </Paragraph>

                    {manifest.changelog && manifest.changelog.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <HeadingSecondary>What's New:</HeadingSecondary>
                            <ul style={{ paddingLeft: 20, listStyleType: "circle", color: "var(--text-normal)" }}>
                                {manifest.changelog.map((item, idx) => (
                                    <li key={idx} style={{ marginBottom: 4 }}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Flex gap="12px">
                        <Button
                            color="brand"
                            onClick={markAsUpdated}
                        >
                            Download Installer
                        </Button>
                        <Button
                            look="outlined"
                            color="primary"
                            onClick={async () => {
                                await DataStore.set(LAST_UPDATED_KEY, manifest.latest);
                                setIsOutdated(false);
                                setLastKnown(manifest.latest);
                            }}
                        >
                            Ignore for now
                        </Button>
                    </Flex>
                </Card>
            </Flex>
        );
    }

    return (
        <Card variant="success" className={Margins.top20}>
            <HeadingSecondary>🎉 You're fully up to date!</HeadingSecondary>
            <Paragraph className={Margins.bottom16}>
                You are running the latest release ({lastKnown}). We'll let you know when the next update drops.
            </Paragraph>
            <Button
                look="outlined"
                color="green"
                disabled={isChecking}
                onClick={() => checkUpdates(lastKnown)}
            >
                {isChecking ? "Checking..." : "Check Again"}
            </Button>
        </Card>
    );
}
