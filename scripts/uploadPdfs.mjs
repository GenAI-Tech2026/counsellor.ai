import { GoogleAIFileManager } from "@google/generative-ai/server";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const fileManager = new GoogleAIFileManager(apiKey);

async function uploadFile(filePath, displayName) {
  console.log(`Uploading ${displayName}...`);
  const uploadResponse = await fileManager.uploadFile(filePath, {
    mimeType: "application/pdf",
    displayName: displayName,
  });
  console.log(`Uploaded ${displayName} as: ${uploadResponse.file.uri}`);
  return uploadResponse.file;
}

async function main() {
  const baseDir = path.resolve(__dirname, '../public/data/tgeamcet');
  
  const filesToUpload = [
    { name: "TGEAPCET_2025_LASTRANKS_FirstPhase.pdf", path: path.join(baseDir, 'TGEAPCET_2025_LASTRANKS_FirstPhase.pdf') },
    { name: "TGEAPCET_2025_LASTRANKS_SecondPhase.pdf", path: path.join(baseDir, 'TGEAPCET_2025_LASTRANKS_SecondPhase.pdf') },
    { name: "TGEAPCET_2025_FINALPHASE_LASTRANKS.pdf", path: path.join(baseDir, 'TGEAPCET_2025_FINALPHASE_LASTRANKS.pdf') }
  ];

  const uploadedFiles = [];
  for (const file of filesToUpload) {
    try {
      const uploaded = await uploadFile(file.path, file.name);
      uploadedFiles.push(uploaded);
    } catch (e) {
      console.error(`Error uploading ${file.name}:`, e);
    }
  }

  console.log("\n--- Upload Complete ---");
  console.log("Add these URIs to your config:");
  uploadedFiles.forEach(f => {
    console.log(`{ mimeType: '${f.mimeType}', fileUri: '${f.uri}' } // ${f.displayName}`);
  });
}

main();
