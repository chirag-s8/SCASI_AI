"use client";

import { useEffect } from "react";

export default function LoadingPage() {
    useEffect(() => {
        console.log("🎬 Loading page mounted - Animation should start now");
    }, []);

    return null;
}
