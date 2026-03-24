"use client";

import { SessionProvider } from "next-auth/react";
import { VoiceProvider } from "./voice/VoiceContext";

export function Providers({ children }) {
    return (
        <SessionProvider>
            <VoiceProvider>{children}</VoiceProvider>
        </SessionProvider>
    );
}
