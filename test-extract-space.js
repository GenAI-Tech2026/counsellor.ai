require('dotenv').config({path: '.env.local'});
const { retrieveApeamcetContext } = require('./lib/rag.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const { contextBlock } = await retrieveApeamcetContext('APEAMCET 2022 OC boys rank 4000 eligible colleges last rank', 40, { oc_boys: { '$gte': 3400 } });

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const extractModel = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 8192 },
  });

  const catLabel = "OC  Boys"; // Two spaces
  const extractPrompt = `From the RETRIEVED CONTEXT, extract every college-branch row and output ONLY a JSON array (no prose).

RETRIEVED CONTEXT:
"""
${contextBlock}
"""

For EACH row, output: { "college": "<institute name>", "branch": "<program/branch>", "closing": <the closing/last rank for "${catLabel}" as an integer>, "phase": "<phase/round>" }
Rules:
- "closing" MUST be the rank listed for the student's exact category "${catLabel}". If that category has no rank for a row, skip the row.
- Copy numbers EXACTLY from the context (digits only, no commas). Never invent. Output [] if none.`;

  try {
    const r = await extractModel.generateContent(extractPrompt);
    console.log(r.response.text());
  } catch (e) {
    console.error(e);
  }
}
test();
