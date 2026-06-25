require('dotenv').config({path: '.env.local'});
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
      maxOutputTokens: 256,
    },
  });

  const convText = `Student: My rank is 5000
Counsellor: Thank you. Could you please let me know which entrance exam this rank is for (TGEAPCET, APEAMCET, JEE Main, JEE Advanced, KCET, or MHT-CET)?
Student: I got 99 percentile in jee mains`;

  const prompt = `Extract admission counselling parameters from this student conversation.
Return ONLY valid JSON — no markdown, no explanation.

Conversation:
"""
${convText}
"""

JSON schema (null for anything not mentioned):
{
  "rank": <integer or null>,
  "exam": <"TGEAPCET" | "APEAMCET" | "JEE" | "JEE Advanced" | "KCET" | "MHTCET" | null>,
  "category": <category code or null — see per-exam rules>,
  "gender": <"boys"|"girls" | null>,
  "branch_preference": <plain English or null>,
  "location_preference": <city/district or null>
}

Exam mapping:
- "eamcet / eapcet / tgeapcet / Telangana EAPCET" → "TGEAPCET"
- "apeamcet / ap eapcet / ap eamcet / Andhra Pradesh EAPCET" → "APEAMCET"
- "jee main / mains / josaa / nit / iiit / gfti / mains rank" → "JEE"
- "jee advanced / advanced / iit (admission) / CRL advanced" → "JEE Advanced"
- "kcet / kea / karnataka cet / Karnataka CET" → "KCET"
- "mht-cet / mhtcet / maharashtra cet / cap round" → "MHTCET"

Category mapping when exam is TGEAPCET (Telangana categories):
...`;

  try {
    const result = await model.generateContent(prompt);
    console.log(result.response.text());
  } catch (e) {
    console.error(e);
  }
}
test();
