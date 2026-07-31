import { Button } from "@components/Button";
import { Modal, ModalProps, React, TextInput, Toasts, useState } from "@webpack/common";
import { Constants, RestAPI } from "@webpack/common";

export default function BanUserModal(props: ModalProps) {
    const [guildId, setGuildId] = useState("");
    const [userId, setUserId] = useState("");
    const [reason, setReason] = useState("");
    const [deleteDays, setDeleteDays] = useState("1");
    const [confirm, setConfirm] = useState("");
    const [busy, setBusy] = useState(false);

    const handleBan = async () => {
        if (confirm !== "BAN") {
            Toasts.show({ message: "Type BAN in the confirmation field to proceed.", type: Toasts.Type.FAILURE, id: Toasts.genId() });
            return;
        }
        if (!guildId || !userId) {
            Toasts.show({ message: "Guild ID and User ID are required.", type: Toasts.Type.FAILURE, id: Toasts.genId() });
            return;
        }

        setBusy(true);
        try {
            const url = `/guilds/${guildId}/bans/${userId}`;
            const body = { delete_message_days: Number(deleteDays) || 1, reason: reason || undefined };
            await RestAPI.put({ url, body });

            Toasts.show({ message: `Banned ${userId} from guild ${guildId}.`, type: Toasts.Type.SUCCESS, id: Toasts.genId() });
            props.onClose();
        } catch (e) {
            Toasts.show({ message: `Failed to ban user: ${e instanceof Error ? e.message : String(e)}`, type: Toasts.Type.FAILURE, id: Toasts.genId() });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal {...props} title="Ban User">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Guild ID</label>
                <TextInput value={guildId} onChange={setGuildId} placeholder="Guild ID (e.g. 123456789012345678)" disabled={busy} />

                <label style={{ fontSize: 12, fontWeight: 700 }}>User ID</label>
                <TextInput value={userId} onChange={setUserId} placeholder="User ID to ban" disabled={busy} />

                <label style={{ fontSize: 12, fontWeight: 700 }}>Delete message days (0-7)</label>
                <TextInput value={deleteDays} onChange={setDeleteDays} placeholder="1" disabled={busy} />

                <label style={{ fontSize: 12, fontWeight: 700 }}>Reason (optional)</label>
                <TextInput value={reason} onChange={setReason} placeholder="Reason for ban" disabled={busy} />

                <label style={{ fontSize: 12, fontWeight: 700 }}>Type "BAN" to confirm</label>
                <TextInput value={confirm} onChange={setConfirm} placeholder="Type BAN to confirm" disabled={busy} />

                <Button onClick={handleBan} disabled={busy} style={{ width: "100%" }}>
                    {busy ? "Banning..." : "Ban User"}
                </Button>
            </div>
        </Modal>
    );
}
