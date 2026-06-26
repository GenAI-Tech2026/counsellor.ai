require('dotenv').config({path: '.env.local'});
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are a helpful, professional AI admission counsellor...
1. **Exam** — Which entrance exam / counselling is the rank from?
2. **Rank**
3. **Category** —
   - TGEAPCET: OC, BC-A, BC-B, BC-C, BC-D, BC-E, SC-I, SC-II, SC-III, ST, EWS.
   - APEAMCET: OC, BC-A, BC-B, BC-C, BC-D, BC-E, SC, ST, EWS.
   - JEE / JEE Advanced: OPEN, OBC-NCL, SC, ST, EWS.
4. **Gender** (if required by exam).`;

async function test() {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  });

  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: "My rank is 5000" }] },
      { role: "model", parts: [{ text: "Thank you. Could you please let me know which entrance exam this rank is for (TGEAPCET, APEAMCET, JEE Main, JEE Advanced, KCET, or MHT-CET)?" }] }
    ],
    generationConfig: { maxOutputTokens: 2048 },
  });

  // Now we use OPEN instead of OC
  const augmentedMessage = `STUDENT PROFILE (already provided — do not re-ask): exam JEE, rank 5000, category OPEN.

USER MESSAGE:
I got 99 percentile in jee main`;

  try {
    const result = await chat.sendMessage(augmentedMessage);
    console.log("RESPONSE:", result.response.text());
  } catch (e) {
    console.error(e);
  }
}
test();
