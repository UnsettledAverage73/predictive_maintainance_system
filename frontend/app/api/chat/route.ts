import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

let groq: Groq | null = null;

if (process.env.GROQ_API_KEY) {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface EquipmentData {
  temperature: number;
  vibration: number;
  pressure: number;
  runtimeHours: number;
  efficiency: number;
  lastMaintenance: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!groq) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured. Please set up your Groq API key in environment variables.' },
        { status: 500 }
      );
    }

    const { messages, machineId, machineName, equipmentData } =
      await request.json();

    // Format equipment data for context
    let equipmentContext = '';
    if (equipmentData) {
      equipmentContext = `

Current Equipment Status:
- Temperature: ${equipmentData.temperature}°C
- Vibration: ${equipmentData.vibration} mm/s
- Pressure: ${equipmentData.pressure} bar
- Runtime Hours: ${equipmentData.runtimeHours}
- Efficiency: ${equipmentData.efficiency}%
- Last Maintenance: ${equipmentData.lastMaintenance}`;
    }

    // Build conversation history for Groq
    const conversationMessages = messages.map(
      (msg: Message) => ({
        role: msg.role,
        content: msg.content,
      })
    );

    // Add system context
    const systemPrompt = `You are an expert industrial equipment maintenance advisor AI. You have deep knowledge of predictive maintenance, equipment diagnostics, and failure analysis. 

Your role is to help maintenance engineers understand equipment health, predict failures, and provide step-by-step maintenance recommendations.

When responding:
1. Provide clear, actionable insights
2. Explain technical concepts in understandable terms
3. Prioritize safety and equipment longevity
4. Suggest preventive measures when applicable
5. Reference specific metrics and thresholds when relevant

Machine Details:
- ID: ${machineId}
- Name: ${machineName}${equipmentContext}

Always base recommendations on the current equipment data when available.`;

    const response = await groq.messages.create({
      model: 'mixtral-8x7b-32768',
      max_tokens: 1024,
      system: systemPrompt,
      messages: conversationMessages,
    });

    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return NextResponse.json({
      message: assistantMessage,
      machineId,
    });
  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof Error && error.message.includes('401')) {
      return NextResponse.json(
        { error: 'Invalid or missing GROQ_API_KEY' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
