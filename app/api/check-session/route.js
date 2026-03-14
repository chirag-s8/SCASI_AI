import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (session) {
            return NextResponse.json({ authenticated: true }, { status: 200 });
        }

        return NextResponse.json({ authenticated: false }, { status: 401 });
    } catch (_error) {
        return NextResponse.json({ error: "Session check failed" }, { status: 500 });
    }
}
