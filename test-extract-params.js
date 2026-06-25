require('dotenv').config({path: '.env.local'});
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const extractModel = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
    systemInstruction: "Extract admission search parameters. Return exactly: { \"rank\": number|null, \"exam\": string|null (one of: 'TGEAPCET', 'APEAMCET', 'JEE_MAINS', 'JEE_ADVANCED', 'KCET', 'MHTCET'), \"category\": string|null (one of: 'OC', 'BC-A', 'BC-B', 'BC-C', 'BC-D', 'BC-E', 'SC-I', 'SC-II', 'SC-III', 'ST', 'EWS'), \"gender\": 'boys'|'girls'|null, \"branch_preference\": string|null, \"location_preference\": string|null }",
  });

  const currentMessage = "I got 4000 rank in ap eamcet";
  try {
    const r = await extractModel.generateContent(`Extract params from:\n\n${currentMessage}`);
    console.log(r.response.text());
  } catch(e) {
    console.error(e);
  }
}
test();
