/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Heart } from "@components/Heart";
import { Paragraph } from "@components/Paragraph";
import { DonateButton, TranslateButton } from "@components/settings";
import { Margins } from "@utils/margins";
import { Modal, openModal } from "@webpack/common";
import { PC_ICON_DATA_URL } from "@components/Icons/PatchCordIcon";

export function VencordDonorModal() {
    openModal(props => (
        <ErrorBoundary noop onError={() => {
            props.onClose();
            VencordNative.native.openExternal("https://github.com/sponsors/Vendicated");
        }}>
            <Modal
                {...props}
                title={
                    <Heading
                        tag="h2"
                        style={{
                            width: "100%",
                            textAlign: "center",
                            margin: 0
                        }}
                    >
                        <Flex justifyContent="center" alignItems="center" gap="0.5em">
                            <Heart />
                            Vencord Donor
                        </Flex>
                    </Heading>
                }
            >
                <div>
                    <Flex>
                        <img
                            role="presentation"
                            src={PC_ICON_DATA_URL}
                            alt=""
                            style={{ margin: "auto" }}
                        />
                        <img
                            role="presentation"
                            src={PC_ICON_DATA_URL}
                            alt=""
                            style={{ margin: "auto" }}
                        />
                    </Flex>
                    <div style={{ padding: "1em" }}>
                        <Paragraph>
                            This Badge is a special perk for PatchCord Users
                        </Paragraph>
                        <Paragraph className={Margins.top20}>
                            Please consider supporting the development of PatchCord by becoming a donor. It would mean a lot :3
                        </Paragraph>
                    </div>
                </div>
                <div>
                    <Flex justifyContent="center" style={{ width: "100%" }}>
                        <DonateButton />
                    </Flex>
                </div>
            </Modal>
        </ErrorBoundary>
    ));
}

export function EquicordDonorModal() {
    openModal(props => (
        <ErrorBoundary noop onError={() => {
            props.onClose();
            VencordNative.native.openExternal("https://ko-fi.com/itssolardev");
        }}>
            <Modal
                {...props}
                title={
                    <Heading
                        tag="h2"
                        style={{
                            width: "100%",
                            textAlign: "center",
                            margin: 0
                        }}
                    >
                        <Flex justifyContent="center" alignItems="center" gap="0.5em">
                            <Heart />
                            PatchCord User
                        </Flex>
                    </Heading>
                }
            >
                <div>
                    <Flex>
                        <img
                            role="presentation"
                            src={PC_ICON_DATA_URL}
                            alt=""
                            style={{ margin: "auto" }}
                        />
                    </Flex>
                    <div style={{ padding: "1em" }}>
                        <Paragraph>
                            This Badge is a special perk for PatchCord Users. It is a way to show your support for the development of PatchCord and its community.
                        </Paragraph>
                        <Paragraph className={Margins.top20}>
                            Please consider supporting the development of PatchCord by becoming a donor. It would mean a lot! :3
                        </Paragraph>
                    </div>
                </div>
                <div>
                    <Flex justifyContent="center" style={{ width: "100%" }}>
                        <DonateButton equicord={true} />
                    </Flex>
                </div>
            </Modal>
        </ErrorBoundary >
    ));
}

export function EquicordTranslatorModal() {
    openModal(props => (
        <ErrorBoundary noop onError={() => {
            props.onClose();
        }}>
            <Modal
                {...props}
                title={
                    <Heading
                        tag="h2"
                        style={{
                            width: "100%",
                            textAlign: "center",
                            margin: 0
                        }}
                    >
                        <Flex justifyContent="center" alignItems="center" gap="0.5em">
                            Equicord Translator
                        </Flex>
                    </Heading>
                }
            >
                <div>
                    <Flex>
                        <img
                            className="vc-translate-modal-icon"
                            role="presentation"
                            src="https://badge.equicord.org/translator.png"
                            alt=""
                        />
                    </Flex>
                    <div className="vc-translate-modal-paragraph">
                        <Paragraph>
                            Awarded to contributors who expand Equicord’s language support by translating content for the community.
                        </Paragraph>
                    </div>
                </div>
                <div>
                    <Flex justifyContent="center" style={{ width: "100%" }}>
                        <TranslateButton />
                    </Flex>
                </div>
            </Modal>
        </ErrorBoundary>
    ));
}
