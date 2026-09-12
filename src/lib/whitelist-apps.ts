// Everything is locked by default. These are the only doors the user may keep open.
// Kept as plain data so the native Android layer can later map each entry to a
// package name without touching the UI.
export interface WhitelistApp {
  id: string;
  name: string;
  note: string;
}

export const WHITELIST_APPS: WhitelistApp[] = [
  { id: "phone", name: "Phone", note: "calls only" },
  { id: "messages", name: "Messages", note: "no group chats" },
  { id: "camera", name: "Camera", note: "for proof" },
  { id: "maps", name: "Maps", note: "if you're moving" },
  { id: "music", name: "Music", note: "audio only" },
  { id: "calculator", name: "Calculator", note: "" },
  { id: "notes", name: "Notes", note: "" },
  { id: "banking", name: "Banking", note: "" },
  { id: "email", name: "Email", note: "read only" },
  { id: "clock", name: "Clock", note: "alarms" },
];
