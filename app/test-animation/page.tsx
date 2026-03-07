"use client";

import { MailMindLoginAnimation } from "../../components/MailMindLoginAnimation";
import { useRouter } from "next/navigation";

export default function TestAnimationPage() {
    const router = useRouter();

    return (
        <div>
            <MailMindLoginAnimation
                onComplete={() => {
                    console.log("Animation completed!");
                    alert("Animation completed! Redirecting to home...");
                    router.push("/");
                }}
            />
        </div>
    );
}
