import { getGeminiChatSession, EAMCET_DATA_FILES } from '@/lib/gemini';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const chatSession = getGeminiChatSession(history || []);
    
    let messageContent = message;
    if ((history || []).length === 0) {
      messageContent = [
        ...EAMCET_DATA_FILES,
        { text: message }
      ];
    }
    
    console.log("SENDING TO GEMINI:");
    console.log("HISTORY LENGTH:", (history || []).length);
    console.log("MESSAGE CONTENT TYPE:", typeof messageContent);
    if (Array.isArray(messageContent)) console.log("MESSAGE HAS FILES:", messageContent.length > 1);

    // We send the message and wait for the response
    const result = await chatSession.sendMessage(messageContent);
    const responseText = result.response.text();

    return NextResponse.json({ text: responseText });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate response' }, { status: 500 });
  }
}
