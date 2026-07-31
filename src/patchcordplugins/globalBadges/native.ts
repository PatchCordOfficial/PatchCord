import { IpcMainInvokeEvent } from "electron";
import { fetchJson } from "@main/utils/http";

export async function fetchBadgesJson(_: IpcMainInvokeEvent, url: string) {
    return await fetchJson<Record<string, any>>(url, { cache: "no-store" });
}
