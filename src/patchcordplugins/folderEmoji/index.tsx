/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { findStoreLazy } from "@webpack";
import definePlugin, { OptionType } from "@utils/types";
import { ModalRoot, ModalHeader, ModalContent, ModalFooter, ModalCloseButton, ModalSize } from "@utils/modal";
import { Button, Menu, openModal, showToast, TextInput, Toasts, useState } from "@webpack/common";

const SortedGuildStore = findStoreLazy("SortedGuildStore");

const settings = definePluginSettings({
    folderIcons: {
        type: OptionType.COMPONENT,
        hidden: true,
        description: "folder icon data",
        component: () => <></>
    },
    solidIcon: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Use a solid background on the folder icon"
    }
});

type FolderIcon = { url: string } | null;

function getFolderIcons(): Record<string, FolderIcon> {
    if (!settings.store.folderIcons) settings.store.folderIcons = {};
    return settings.store.folderIcons as Record<string, FolderIcon>;
}

function int2rgba(rgbVal: number, alpha: number = 1): string {
    const b = rgbVal & 0xFF;
    const g = (rgbVal & 0xFF00) >>> 8;
    const r = (rgbVal & 0xFF0000) >>> 16;
    return `rgba(${[r, g, b].join(",")},${alpha})`;
}

function getCleanName(name: string): string {
    return name.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{200D}\u{FE0F}\u{20E3}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\p{Extended_Pictographic}\s]+/u, "").trim();
}

function FolderEmojiModal({ folderId, folderName, onClose }: { folderId: number; folderName: string; onClose: () => void }) {
    const [value, setValue] = useState("");
    const isUrl = value.trim().startsWith("http");

    return (
        <ModalRoot size={ModalSize.SMALL}>
            <ModalHeader>
                <h3>Set Folder Emoji / Icon</h3>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <TextInput
                    value={value}
                    onChange={(v: string) => setValue(v)}
                    placeholder="Paste an emoji or image URL (e.g. 😀 or https://...)"
                    autoFocus={true}
                />
                {isUrl && (
                    <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "8px",
                        overflow: "hidden",
                        background: "var(--background-secondary-alt)",
                        marginTop: "12px"
                    }}>
                        <img
                            src={value.trim()}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                    </div>
                )}
            </ModalContent>
            <ModalFooter>
                <Button
                    color={Button.Colors.RED}
                    size={Button.Sizes.MEDIUM}
                    onClick={() => {
                        delete getFolderIcons()[String(folderId)];
                        showToast("Folder icon removed", Toasts.Type.SUCCESS);
                        onClose();
                    }}
                >
                    Remove Icon
                </Button>
                <Button
                    size={Button.Sizes.MEDIUM}
                    onClick={() => {
                        const input = value.trim();
                        if (!input) return;

                        if (input.startsWith("http")) {
                            getFolderIcons()[String(folderId)] = { url: input };
                            showToast("Folder icon set", Toasts.Type.SUCCESS);
                        } else {
                            const cleanName = getCleanName(folderName);
                            const newName = `${input} ${cleanName}`;
                            navigator.clipboard.writeText(newName).then(() => {
                                showToast("Folder name copied! Right-click folder → Folder Settings → paste", Toasts.Type.SUCCESS);
                            }).catch(() => {
                                showToast("Failed to copy", Toasts.Type.FAILURE);
                            });
                        }
                        onClose();
                    }}
                >
                    Apply
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export default definePlugin({
    name: "FolderEmoji",
    description: "Right-click a server folder to add an emoji or custom icon",
    authors: [{ name: "itssolar.dev", id: 864612087741546527n }],
    settings,
    patches: [
        {
            find: "#{intl::GUILD_FOLDER_TOOLTIP_A11Y_LABEL}",
            replacement: {
                match: /(\(0,\i\.jsx\)\(\i,\{folderNode:(\i),hovered:\i,sorting:\i\}\))/,
                replace: "($self.folderIcon({folderNode:$2})?$self.renderIcon({folderNode:$2}):$1)"
            }
        }
    ],
    contextMenus: {
        "guild-context": (children, props: any) => {
            if (!("folderId" in props)) return;

            const folder = SortedGuildStore.getGuildFolderById(props.folderId);
            if (!folder) return;

            const currentName = folder.folderName ?? "Folder";

            children.push(
                <Menu.MenuItem
                    id="folder-emoji"
                    label="Set Folder Emoji / Icon"
                    action={() => {
                        openModal(modalProps => (
                            <FolderEmojiModal
                                folderId={props.folderId}
                                folderName={currentName}
                                onClose={modalProps.onClose}
                            />
                        ));
                    }}
                />
            );
        }
    },
    folderIcon(props: any): boolean {
        return !!(getFolderIcons()[props.folderNode.id]?.url);
    },
    renderIcon(props: any) {
        const data = getFolderIcons()[props.folderNode.id];
        if (!data?.url) return null;

        return (
            <div
                style={{
                    backgroundColor: int2rgba(props.folderNode.color, settings.store.solidIcon ? 1 : 0.4),
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%",
                    height: "100%"
                }}
            >
                <img
                    alt=""
                    src={data.url}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "4px" }}
                />
            </div>
        );
    }
});
