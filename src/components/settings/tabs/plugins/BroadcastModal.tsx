import { Button } from "@components/Button";
import { DataStore } from "@api/index";
import { Modal, ModalProps, React, TextInput, Toasts, useEffect, useState } from "@webpack/common";

const BROADCAST_ENDPOINT = "https://patchcord.itssolar.dev/broadcast/api/broadcast.php";
const SECRET_STORAGE_KEY = "PatchCord_BroadcastSecret";
const SECRET_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const TYPE_OPTIONS = [
    { label: "Info", value: 0, color: "#5865f2" },
    { label: "Success", value: 1, color: "#3ba55c" },
    { label: "Warning", value: 2, color: "#faa81a" },
    { label: "Danger", value: 3, color: "#ed4245" },
];

export function BroadcastModal(props: ModalProps) {
    const [message, setMessage] = useState("");
    const [author, setAuthor] = useState("PatchCord");
    const [link, setLink] = useState("");
    const [secret, setSecret] = useState("");
    const [type, setType] = useState(0);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        (async () => {
            const stored = await DataStore.get(SECRET_STORAGE_KEY) as { secret: string; expiresAt: number; } | null;
            if (stored?.secret && stored.expiresAt > Date.now()) {
                setSecret(stored.secret);
            } else {
                await DataStore.set(SECRET_STORAGE_KEY, null);
            }
        })();
    }, []);

    const handleSend = async () => {
        if (!message || !secret) {
            Toasts.show({
                message: "Message and Secret are required",
                type: Toasts.Type.FAILURE,
                id: Toasts.genId()
            });
            return;
        }

        setSending(true);
        try {
            const payload: Record<string, unknown> = {
                message,
                author: author || "PatchCord",
                type,
                secret,
                id: Date.now().toString()
            };
            if (link) payload.link = link;

            const res = await fetch(BROADCAST_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "Unknown error");
                throw new Error(`HTTP ${res.status}: ${text}`);
            }

            await DataStore.set(SECRET_STORAGE_KEY, {
                secret,
                expiresAt: Date.now() + SECRET_TTL_MS
            });

            Toasts.show({
                message: "Broadcast sent successfully!",
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId()
            });
            props.onClose();
        } catch (e) {
            Toasts.show({
                message: `Failed to broadcast: ${e instanceof Error ? e.message : String(e)}`,
                type: Toasts.Type.FAILURE,
                id: Toasts.genId()
            });
        } finally {
            setSending(false);
        }
    };

    const labelStyle: React.CSSProperties = {
        display: "block",
        marginBottom: 6,
        fontWeight: 600,
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "var(--header-secondary)"
    };

    return (
        <Modal {...props} title="Owner Broadcast">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Author */}
                <div>
                    <label style={labelStyle}>Author Name</label>
                    <TextInput
                        value={author}
                        onChange={setAuthor}
                        placeholder="PatchCord"
                        disabled={sending}
                    />
                </div>

                {/* Message */}
                <div>
                    <label style={labelStyle}>Broadcast Message</label>
                    <TextInput
                        value={message}
                        onChange={setMessage}
                        placeholder="Type your announcement..."
                        disabled={sending}
                    />
                </div>

                {/* Optional link */}
                <div>
                    <label style={labelStyle}>Link (optional)</label>
                    <TextInput
                        value={link}
                        onChange={setLink}
                        placeholder="https://..."
                        disabled={sending}
                    />
                </div>

                {/* Secret */}
                <div>
                    <label style={labelStyle}>Owner Secret</label>
                    <TextInput
                        value={secret}
                        onChange={setSecret}
                        placeholder="Enter owner secret"
                        disabled={sending}
                        type="password"
                    />
                </div>

                {/* Type selector */}
                <div>
                    <label style={labelStyle}>Announcement Type</label>
                    <div style={{ display: "flex", gap: 8 }}>
                        {TYPE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setType(opt.value)}
                                style={{
                                    flex: 1,
                                    padding: "6px 0",
                                    border: `2px solid ${type === opt.value ? opt.color : "transparent"}`,
                                    borderRadius: 6,
                                    background: type === opt.value ? opt.color + "22" : "var(--background-secondary)",
                                    color: type === opt.value ? opt.color : "var(--text-muted)",
                                    fontWeight: type === opt.value ? 700 : 400,
                                    fontSize: 13,
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <Button
                    onClick={handleSend}
                    disabled={sending || !message}
                    style={{ width: "100%", marginTop: 4 }}
                >
                    {sending ? "Broadcasting..." : "Broadcast to All Clients"}
                </Button>
            </div>
        </Modal>
    );
}
