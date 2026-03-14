import { NextResponse } from 'next/server';
import { nlpAgent, ClassifyInputSchema } from '@/src/agents/nlp';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const input = ClassifyInputSchema.parse(body);
        const result = await nlpAgent.classify(input);

        return NextResponse.json({ result });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Classify API Error:', message);

        if (message.includes('rate') || message.includes('Rate')) {
            return NextResponse.json(
                { error: 'Rate limit reached. Please retry shortly.' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
