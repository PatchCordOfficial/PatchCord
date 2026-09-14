import { isPluginEnabled, isSafeMode, plugins } from "@api/PluginManager";
import { Settings, SettingsStore } from "@api/Settings";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Notice } from "@components/Notice";
import { Paragraph } from "@components/Paragraph";
import { pluginIssues } from "@debug/reporterData";
import { Margins } from "@utils/margins";
import { relaunch } from "@utils/native";
import { saveFile } from "@utils/web";
import { Alerts, showToast, Toasts, useState } from "@webpack/common";

import gitHash from "~git-hash";

function getIssues() {
    return Array.from(pluginIssues, ([plugin, issues]) => ({ plugin, issues: [...issues] }))
        .sort((a, b) => a.plugin.localeCompare(b.plugin));
}

export function RecoverySection() {
    const [issues, setIssues] = useState(getIssues);
    const [busy, setBusy] = useState(false);

    async function restart() {
        setBusy(true);
        const previous = Settings.safeMode;
        Settings.safeMode = !isSafeMode;
        try {
            await VencordNative.settings.set(SettingsStore.plain);
            relaunch();
        } catch {
            Settings.safeMode = previous;
            setBusy(false);
            showToast("Could not save recovery settings or restart the client.", Toasts.Type.FAILURE);
        }
    }

    return (
        <>
            <Heading className={Margins.top20}>Recovery and Diagnostics</Heading>
            <Paragraph>
                Safe Mode skips optional plugin startup and patches. Your plugin selection stays saved and returns when you leave Safe Mode. Required plugins and their dependencies remain active.
            </Paragraph>
            {isSafeMode && <Notice.Info className={Margins.bottom16}>Safe Mode is active. Plugin toggles are unavailable until you restart normally.</Notice.Info>}
            <Flex flexWrap="wrap" className={Margins.bottom16}>
                <Button disabled={busy} onClick={() => Alerts.show({
                    title: isSafeMode ? "Leave Safe Mode?" : "Restart in Safe Mode?",
                    body: isSafeMode ? "Restart with your saved plugin selection." : "Restart with optional plugins disabled. Your saved plugin selection will not change.",
                    confirmText: "Restart",
                    onConfirm: restart
                })}>
                    {isSafeMode ? "Restore Plugins and Restart" : "Restart in Safe Mode"}
                </Button>
                <Button variant="secondary" onClick={() => setIssues(getIssues())}>Refresh Diagnostics</Button>
                <Button variant="secondary" onClick={() => {
                    const report = {
                        client: "PatchCord",
                        version: VERSION,
                        build: gitHash,
                        safeMode: isSafeMode,
                        enabledPluginCount: Object.keys(plugins).filter(isPluginEnabled).length,
                        issues: getIssues()
                    };
                    saveFile(new File([JSON.stringify(report, null, 2)], "PatchCord-diagnostics.json", { type: "application/json" }));
                }}>Export Diagnostics</Button>
            </Flex>
            <Paragraph>Diagnostics cover failures recorded in this session. Refresh after reproducing an issue. The export contains build information, plugin names and failure categories.</Paragraph>
            {issues.length === 0
                ? <Paragraph>No plugin startup or patch failures have been recorded in this session.</Paragraph>
                : <ul>{issues.map(({ plugin, issues }) => <li key={plugin}><strong>{plugin}</strong>: {issues.join(", ")}.</li>)}</ul>}
        </>
    );
}
