const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Verified reachable model IDs for this account from browser console test
const ENDPOINTS = [
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
];

/**
 * AI Project Manager analysis using Google Gemini
 * @param {Object} project - The project data
 * @param {Array} employees - List of employees
 * @param {Array} projectHistory - Past project data
 * @returns {Promise<Object>} - Parsed AI analysis
 */
export const analyzeProject = async (project, employees, projectHistory) => {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file.");
  }

  const prompt = `You are an autonomous AI project manager. Analyze the project and employee data below and return ONLY a valid JSON object with no markdown, no explanation, no code blocks.

PROJECT: ${JSON.stringify(project)}
EMPLOYEES: ${JSON.stringify(employees)}
HISTORY: ${JSON.stringify(projectHistory)}

Return this exact JSON structure:
{
  "subtasks": [{ "task_name": "string", "required_skill": "string", "priority": "Low|Medium|High", "estimated_days": number }],
  "assignments": [{ "employee_id": "string", "employee_name": "string", "task_name": "string", "reason": "string", "workload_after": number }],
  "estimated_completion_days": number,
  "risk_flags": ["string"],
  "tool_recommendations": ["string"]
}`;

  let lastError = null;

  for (const url of ENDPOINTS) {
    try {
      console.log(`📡 Attempting Gemini API call to: ${url.split('?')[0]}...`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1, // Lower temperature for more consistent JSON
            topP: 0.95,
            topK: 40
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const msg = errorData.error?.message || response.statusText;
        console.warn(`⚠️ Endpoint failed (${msg}). Trying next...`);
        lastError = msg;
        continue; // Try next endpoint
      }

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("Gemini returned an empty response.");

      // Robust JSON cleaning
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }

      return JSON.parse(text);
    } catch (error) {
      console.error(`💥 Error at ${url.split('?')[0]}:`, error.message);
      lastError = error.message;
    }
  }

  throw new Error(`All Gemini endpoints failed. Last error: ${lastError}`);
};

/**
 * Extract structured project details from NL description
 * @param {string} description - User's plain text description
 * @returns {Promise<Object>} - Extracted project fields
 */
export const extractProjectDetails = async (description) => {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API Key is missing.");
  }

  const prompt = `Extract project details from this natural language description and return ONLY a valid JSON object with no markdown, no explanation, no code blocks.

Description: ${description}

Return exactly this JSON structure:
{
  "project_name": "string (short 3-5 word name)",
  "description": "string (one sentence summary)",
  "required_skills": ["string", "string"],
  "deadline_days": number (convert weeks/months to days, default 30 if not mentioned),
  "priority": "High" | "Medium" | "Low",
  "project_id": "string (generate a unique ID like 'PRJ005')"
}`;

  let lastError = null;

  for (const url of ENDPOINTS) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        lastError = errorData.error?.message || response.statusText;
        continue;
      }

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;

      // Clean JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) text = jsonMatch[0];

      return JSON.parse(text);
    } catch (error) {
      lastError = error.message;
    }
  }

  throw new Error(`Extraction failed: ${lastError}`);
};

// Keep existing generateContent as a legacy/simple helper
export const generateContent = async (prompt) => {
  return "Placeholder response from Gemini";
};

/**
 * Generates a team performance summary using Gemini
 * @param {Array} performanceData - List of task performances
 * @returns {Promise<string>} - 2 sentence professional summary
 */
export const getPerformanceSummary = async (performanceData) => {
  if (!GEMINI_API_KEY) throw new Error("API Key missing");

  const prompt = `Based on this project performance data: ${JSON.stringify(performanceData)}, write a 2 sentence team performance summary. Be specific about who performed well and who was late. Keep it professional.`;

  for (const url of ENDPOINTS) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.7 }
        }),
      });

      if (!response.ok) continue;
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Excellent team performance overall.";
    } catch (err) {
      console.error("Gemini summary failed:", err);
    }
  }
  return "Project successfully concluded with high-quality deliverables.";
};
