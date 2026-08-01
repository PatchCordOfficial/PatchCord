import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Flex } from "@components/Flex";
import { HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Margins } from "@utils/margins";
import * as DataStore from "@api/DataStore";
import { React, useState, useEffect } from "@webpack/common";

const LATEST_URL = "https://patchcord.itssolar.dev/installer/latest.json";
const LAST_UPDATED_KEY = "PatchcordUpdater_lastUpdatedDate";

function normalizeVersion(v: string): string {
    return v.trim().replace(/^v/i, "");
}

export interface UpdateManifest {
    latest: string;
    buildDate: string;
    downloadUrl: string;
    changelog: string[];
}

export function UpdaterDashboard() {
    const [manifest, setManifest] = useState<UpdateManifest | null>(null);
    const [isChecking, setIsChecking] = useState(true);
    const [isOutdated, setIsOutdated] = useState(false);

    useEffect(() => {
        checkUpdates();
    }, []);

    const checkUpdates = async () => {
        setIsChecking(true);
        try {
            const res = await fetch(LATEST_URL, { cache: "no-store" });
            if (res.ok) {
                const data: UpdateManifest = await res.json();
                setManifest(data);
                setIsOutdated(normalizeVersion(data.latest) !== normalizeVersion(VERSION));
            }
        } catch (e) {
            console.error("Failed to fetch PatchCord update manifest", e);
        }
        setIsChecking(false);
    };

    const markAsUpdated = async () => {
        if (!manifest) return;
        await DataStore.set(LAST_UPDATED_KEY, manifest.latest);
        VencordNative.native.openExternal(manifest.downloadUrl || "https://patchcord.itssolar.dev/download.html");
    };

    const VersionInfoCard = (
        <Card variant="primary" className={Margins.top20}>
            <HeadingSecondary>Version Info</HeadingSecondary>
            <Flex flexDirection="column" gap="4px" className={Margins.top8}>
                <Paragraph>
                    Current version: <strong>{VERSION}</strong>
                </Paragraph>
                <Paragraph>
                    Latest version: <strong>{manifest ? manifest.latest : isChecking ? "Checking..." : "Unknown"}</strong>
                </Paragraph>
            </Flex>
        </Card>
    );

    if (isChecking && !manifest) {
        return (
            <Flex flexDirection="column" gap="16px">
                {VersionInfoCard}
                <Card variant="primary">
                    <Flex alignItems="center" gap="1em">
                        <div className="vc-spinner" style={{ width: 24, height: 24 }} />
                        <Paragraph>Checking for updates...</Paragraph>
                    </Flex>
                </Card>
            </Flex>
        );
    }

    if (isOutdated && manifest) {
        return (
            <Flex flexDirection="column" gap="16px" className={Margins.top20}>
                {VersionInfoCard}
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
        <Flex flexDirection="column" gap="16px" className={Margins.top20}>
            {VersionInfoCard}
            <Card variant="success">
                <HeadingSecondary>🎉 You're fully up to date!</HeadingSecondary>
                <Paragraph className={Margins.bottom16}>
                    You are running the latest release ({VERSION}). We'll let you know when the next update drops.
                </Paragraph>
                <Button
                    look="outlined"
                    color="green"
                    disabled={isChecking}
                    onClick={() => checkUpdates()}
                >
                    {isChecking ? "Checking..." : "Check Again"}
                </Button>
            </Card>
        </Flex>
    );
}
