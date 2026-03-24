"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";

export function ScasiLoginAnimation({ onComplete }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onComplete) onComplete();
        }, 3000); // animation duration

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div
            style={{
                height: "100vh",
                width: "100vw",
                background: "#050311",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Outfit, sans-serif",
                color: "white",
                flexDirection: "column",
                gap: 20,
            }}
        >
            {/* Envelope Animation */}
            <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6 }}
                style={{
                    width: 90,
                    height: 90,
                    borderRadius: 18,
                    background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 36,
                }}
            >
                ✉️
            </motion.div>

            {/* Text */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#c4b5fd",
                }}
            >
                Organising your emails with AI...
            </motion.div>

            {/* Loading dots */}
            <div style={{ display: "flex", gap: 8 }}>
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                        transition={{
                            duration: 1.4,
                            repeat: Infinity,
                            delay: i * 0.2,
                        }}
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#7c3aed",
                        }}
                    />
                ))}
            </div>
        </div>
    );
}