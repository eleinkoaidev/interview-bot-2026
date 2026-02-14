
import { GoogleGenAI, Type } from "@google/genai";
import { Feedback, InterviewSetup, TranscriptionEntry } from "../types";
import { cleanTranscriptionText } from "../utils/stringUtils";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runAnalysisRequest(
  setup: InterviewSetup, 
  transcriptText: string, 
  modelName: string, 
  isFallback: boolean = false
): Promise<Feedback> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const interviewerName = setup.interviewerName || 'Alex';
  
  const baseInstruction = `You are a strict CTE Compliance Auditor. Your job is to score students based ONLY on the evidence in the transcript.
      
      OUTPUT RULES:
      1. LANGUAGE: ${setup.language}.
      2. MATH: Metric scores must be integers between 0 and 20.
      3. TOTAL: The 'score' field must equal the sum of the five metrics.
      4. FEEDBACK: Be specific. Mention exact phrases from the transcript.
      
      Return JSON following the provided schema.`;

  const fallbackInstruction = `PERSONA: Strict CTE Compliance Auditor (Emergency Mode). 
      TASK: Score this transcript based ONLY on evidence. 
      RULES: 
      1. No grade inflation; if evidence is missing for a category, score it 0. 
      2. Be blunt and honest; high school students need the truth to grow. 
      3. Double-check all math; manually sum the 5 metrics to ensure the total 'score' is mathematically perfect.
      
      Return JSON following the provided schema.`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: `Perform a final performance audit on this transcript.
    
    SCORING ARCHITECTURE (CRITICAL):
    There are 5 categories. Each category MUST be scored from 0 to 20.
    1. Technical Skills (0-20)
    2. Communication (0-20)
    3. Problem Solving (0-20)
    4. Adaptability (0-20)
    5. Self-Awareness (0-20)
    
    The TOTAL SCORE must be the SUM of these five categories (Max 100).
    
    GRADING RIGOR:
    - Unprofessional, dismissive, or rude behavior MUST result in a score of 0-5 for Communication, even if the candidate is technically correct.
    - If evidence is missing (e.g., no technical question asked), score that category 0.
    - Do not be "generous." High school students need honest feedback to grow.
    
    TRANSCRIPT:
    ${transcriptText}
    `,
    config: {
      systemInstruction: isFallback ? fallbackInstruction : baseInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER, description: "Sum of all metric scores (0-100)" },
          summary: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
          metrics: {
            type: Type.OBJECT,
            properties: {
              technicalSkills: { type: Type.INTEGER, description: "Score from 0 to 20" },
              communication: { type: Type.INTEGER, description: "Score from 0 to 20" },
              problemSolving: { type: Type.INTEGER, description: "Score from 0 to 20" },
              adaptability: { type: Type.INTEGER, description: "Score from 0 to 20" },
              selfAwareness: { type: Type.INTEGER, description: "Score from 0 to 20" }
            },
            required: ["technicalSkills", "communication", "problemSolving", "adaptability", "selfAwareness"]
          },
          metricDetails: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                score: { type: Type.INTEGER, description: "Raw points (0-20)" },
                weight: { type: Type.INTEGER, description: "Always 20" },
                justification: { type: Type.STRING }
              },
              required: ["label", "score", "weight", "justification"]
            }
          },
          detailedAnalysis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                feedback: { type: Type.STRING }
              },
              required: ["question", "feedback"]
            }
          }
        },
        required: ["score", "summary", "strengths", "improvements", "metrics", "metricDetails", "detailedAnalysis"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from AI");
  
  const feedback = JSON.parse(text) as Feedback;
  
  // Safety check: ensure no metric exceeds its weight
  feedback.metricDetails = feedback.metricDetails.map(m => ({
    ...m,
    score: Math.min(m.score, m.weight)
  }));

  return feedback;
}

export async function analyzeInterview(
  setup: InterviewSetup,
  transcription: TranscriptionEntry[]
): Promise<Feedback> {
  const candidateTurns = transcription.filter(t => t.role === 'candidate');
  const totalCandidateWords = candidateTurns.reduce((acc, turn) => acc + turn.text.trim().split(/\s+/).length, 0);

  if (totalCandidateWords === 0) {
    const insufficientMsg = setup.language === 'Spanish'
      ? "No se detectó respuesta del candidato. Por favor, hable durante la entrevista para recibir comentarios."
      : "No candidate response was detected. Please speak during the interview to receive feedback.";
    throw new Error(insufficientMsg);
  }

  const isPartial = totalCandidateWords < 30;
  const transcriptText = transcription
    .map(entry => {
      const cleaned = cleanTranscriptionText(entry.text);
      const roleLabel = entry.role === 'interviewer' ? (setup.interviewerName || 'Alex') : 'Student';
      return `${roleLabel}: ${cleaned}`;
    })
    .join('\n');

  try {
    const result = await runAnalysisRequest(setup, transcriptText, 'gemini-3-pro-preview');
    result.isPartial = isPartial;
    result.isLowPowerMode = false;
    return result;
  } catch (error: any) {
    console.warn("Pro analysis failed, attempting retry/fallback...", error);
    
    if (error.status === 429 || error.message?.includes('429')) {
      await sleep(2000);
      try {
        const result = await runAnalysisRequest(setup, transcriptText, 'gemini-3-pro-preview');
        result.isPartial = isPartial;
        result.isLowPowerMode = false;
        return result;
      } catch (retryError) {
        console.warn("Pro retry failed, engaging emergency Flash fallback.");
      }
    }

    try {
      const result = await runAnalysisRequest(setup, transcriptText, 'gemini-3-flash-preview', true);
      result.isPartial = isPartial;
      result.isLowPowerMode = true;
      return result;
    } catch (fallbackError) {
      console.error("Critical: Fallback analysis also failed.");
      throw new Error(setup.language === 'Spanish' 
        ? "No se pudo realizar el análisis. Inténtelo de nuevo más tarde." 
        : "Failed to perform analysis. Please try again later.");
    }
  }
}
