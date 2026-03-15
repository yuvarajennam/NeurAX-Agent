import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
const API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!API_KEY) {
  console.error('❌ API Key not found in .env');
  process.exit(1);
}

const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
  console.log('🔍 Fetching available models...\n');
  try {
    const response = await fetch(URL);
    const data = await response.json();
    
    if (data.error) {
      console.error('❌ API Error:', data.error.message);
      return;
    }

    console.log('✅ Available Models:');
    data.models.forEach(m => {
      console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
    });
  } catch (err) {
    console.error('💥 Connection Error:', err.message);
  }
}

listModels();
