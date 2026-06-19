import { getGeminiChatSession, EAMCET_DATA_FILES } from '@/lib/gemini';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Inject the PDFs so Gemini remembers the context on every turn.
    // If there is history, the files must go into the first user message's parts.
    let chatHistory = history || [];
    if (chatHistory.length > 0) {
      chatHistory[0].parts = [
        ...EAMCET_DATA_FILES,
        ...chatHistory[0].parts
      ];
    }
    
    const chatSession = getGeminiChatSession(chatHistory);
    
    // If it's the first message (no history), attach PDFs directly to the message
    let messageContent = message;
    if (chatHistory.length === 0) {
      messageContent = [
        ...EAMCET_DATA_FILES,
        { text: message }
      ];
    }
    
    // We send the message and wait for the response
    const result = await chatSession.sendMessage(messageContent);
    const responseText = result.response.text();

    return NextResponse.json({ text: responseText });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate response' }, { status: 500 });
  }
}
