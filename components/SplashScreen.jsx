"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen() {
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        // Trigger animation after component loads
        setTimeout(() => {
            setAnimate(true);
        }, 100);
    }, []);

    return (
        <div
            style={{
                height: "100vh",
                width: "100vw",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "white",
            }}
        >
            <Image
                src="/logo.png"
                alt="Mail Mind Logo"
                width={230}
                height={230}
                priority
                style={{
                    width: animate ? "230px" : "40px",
                    height: "auto",
                    opacity: animate ? 1 : 0,
                    transition: "all 1.5s ease-in-out",
                }}
            />
        </div>
    );
}
