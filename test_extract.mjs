import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0,
    maxOutputTokens: 256,
  },
});

async function run() {
  const prompt = `Extract admission counselling parameters from this student conversation.
Return ONLY valid JSON — no markdown, no explanation.

Conversation:
"""
Tell me about NIAT
Tell me about Plaksha University
Tell me about NIAT
"""

JSON schema (null for anything not mentioned):
{
  "rank": <integer or null>,
  "exam": <"TGEAPCET" | "APEAMCET" | "JEE" | "JEE Advanced" | "KCET" | "MHTCET" | null>,
  "category": <category code or null — see per-exam rules>,
  "gender": <"boys"|"girls" | null>,
  "branch_preference": <plain English or null>,
  "location_preference": <city/district/institute name or null>
}

Exam mapping:
- "eamcet / eapcet / tgeapcet / Telangana EAPCET" → "TGEAPCET"
- "apeamcet / ap eapcet / ap eamcet / Andhra Pradesh EAPCET" → "APEAMCET"
- "jee main / mains / josaa / nit / iiit / gfti / mains rank" → "JEE"
- "jee advanced / advanced / iit (admission) / CRL advanced" → "JEE Advanced"
- "kcet / kea / karnataka cet / Karnataka CET" → "KCET"
- "mht-cet / mhtcet / maharashtra cet / cap round" → "MHTCET"

Other:
- "girl / female / she / woman" → "girls"; "boy / male / he / man" → "boys"
- "five hundred" → 500; "1000" → 1000
- Expand branch abbreviations: "CSE" → "Computer Science", "ECE" → "Electronics and Communication", "EEE" → "Electrical and Electronics", "ME" or "Mech" → "Mechanical Engineering", "IT" → "Information Technology".`;

  const result = await model.generateContent(prompt);
  console.log("EXTRACTED:", result.response.text());
}

run();
