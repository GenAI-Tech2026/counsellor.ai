import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey && process.env.NODE_ENV !== 'development') {
  console.warn("Missing GEMINI_API_KEY environment variable. Chat functionality will fail.");
}

const genAI = new GoogleGenerativeAI(apiKey || "dummy-key-for-build");

export const EAMCET_DATA_FILES = [
  {
    fileData: {
      mimeType: 'application/pdf',
      fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/67th9ht2v0nn'
    }
  },
  {
    fileData: {
      mimeType: 'application/pdf',
      fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/qkrszacivj7i'
    }
  },
  {
    fileData: {
      mimeType: 'application/pdf',
      fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/1h9lwgf8fyye'
    }
  }
];

export const getGeminiChatSession = (history = []) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `You are an expert AI Admission Counsellor for a platform called 'Admission Mantrana'. 
Your goal is to guide students through college admissions, career choices, and entrance exams. 
You have been provided with three PDF documents containing the official Telangana EAPCET (EAMCET) 2025 last ranks for First Phase, Second Phase, and Final Phase.
When a student asks what colleges they can get with their rank, or asks about specific cutoffs, you MUST use the data from these attached PDF documents to calculate and respond.
Be supportive, professional, and provide clear, structured advice.
Ask clarifying questions if the student's request is too broad (e.g., if they don't mention their caste/category, gender, or preferred branch, ask them).` 
  });

  return model.startChat({
    history: history,
    generationConfig: {
      maxOutputTokens: 1000,
    },
  });
};
