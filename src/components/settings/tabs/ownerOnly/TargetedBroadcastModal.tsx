import { Button } from "@components/Button";
import { Modal, ModalProps, React, TextInput, Toasts, useState } from "@webpack/common";
import { RestAPI } from "@webpack/common";

export default function TargetedBroadcastModal(props: ModalProps) {
    const [userIds, setUserIds] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        const ids = userIds.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
        if (!ids.length || !message) {
            Toasts.show({ message: "User IDs and message are required.", type: Toasts.Type.FAILURE, id: Toasts.genId() });
            return;
        }

        setSending(true);
        const results: { id: string; ok: boolean; err?: string; }[] = [];
        for (const id of ids) {
            try {
                // create DM channel
                const dmRes = await RestAPI.post({ url: `/users/@me/channels`, body: { recipient_id: id } });
                const channelId = dmRes.body?.id;
                if (!channelId) throw new Error("Failed to open DM channel");
                // send message
                await RestAPI.post({ url: `/channels/${channelId}/messages`, body: { content: message } });
                results.push({ id, ok: true });
            } catch (e) {
                results.push({ id, ok: false, err: e instanceof Error ? e.message : String(e) });
            }
        }

        const failed = results.filter(r => !r.ok);
        if (failed.length) {
            Toasts.show({ message: `Sent to ${results.length - failed.length}/${results.length}. Failures: ${failed.map(f => f.id).join(", ")}`, type: Toasts.Type.FAILURE, id: Toasts.genId() });
        } else {
            Toasts.show({ message: `Message sent to ${results.length} users.`, type: Toasts.Type.SUCCESS, id: Toasts.genId() });
            props.onClose();
        }

        setSending(false);
    };

    return (
        <Modal {...props} title="Targeted Broadcast">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>User IDs (comma or space separated)</label>
                <TextInput value={userIds} onChange={setUserIds} placeholder="1234, 5678, ..." disabled={sending} />

                <label style={{ fontSize: 12, fontWeight: 700 }}>Message</label>
                <TextInput value={message} onChange={setMessage} placeholder="Your message..." disabled={sending} />

                <Button onClick={handleSend} disabled={sending || !message} style={{ width: "100%" }}>
                    {sending ? "Sending..." : "Send Targeted Broadcast"}
                </Button>
            </div>
        </Modal>
    );
}
