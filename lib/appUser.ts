import { v5 as uuidv5 } from "uuid";
import type { Session } from "next-auth";

// Stable namespace so the same email -> same UUID across environments.
const APP_USER_NAMESPACE = "7f0b20fd-9d03-4d5e-94a4-9cb0a55b0a2e";

export function getAppUserIdFromSession(session: Session): string {
  const email = session.user?.email;
  if (!email) throw new Error("Session user email missing");
  return uuidv5(email.toLowerCase(), APP_USER_NAMESPACE);
}

