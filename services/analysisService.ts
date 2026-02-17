
/**
 * ANTI-GRAVITY AI DEVELOPER RULE:
 * This project uses strict Semantic Versioning. Whenever you modify the 
 * Interview UI, the Analysis Logic, or the PDF Generation, you MUST:
 * 1. Increment the version number in the UI constant (e.g., v2.0.2 to v2.0.3).
 * 2. Sync this version number to the PDF Report footer.
 * 3. Acknowledge the version bump in your response.
 */

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
  const ai = new GoogleGenAI({ apiKey: "AIzaSyDEYYpKqolWP3Pbm6_q9dgppE-wuoRR6Ms" });

  const isSpanish = setup.language === 'Spanish';

  const studentInstruction = isSpanish
    ? `Eres un "Mentor de Carrera" realizando una 'Entrevista de Práctica'. 
      Mantén altas expectativas profesionales para la atmósfera, pero usa una 'Mentalidad de Crecimiento' para la calificación.
      
      REGLAS DE IDIOMA (MANDATORIO):
      1. TODO el texto generado (Resumen, Justificaciones, Fortalezas, Mejoras, Análisis Detallado) DEBE estar en ESPAÑOL profesional.
      2. Usa terminología profesional de la industria (ej. "habilidades técnicas").
      3. Traduce "Glows and Grows" como "Fortalezas" y "Mapa de Crecimiento" en tus explicaciones.
      
      REGLAS DE CALIFICACIÓN:
      1. Otorga crédito parcial por esfuerzo y honestidad. 
      2. Proporciona exactamente 3 'Fortalezas' (Glows) y 3 áreas de 'Mapa de Crecimiento' (Grows) en los comentarios.
      3. Anima al estudiante a revisar su transcripción e intentar de nuevo para superar su puntaje.
      4. MATEMÁTICAS: Los puntajes de las métricas deben ser números enteros entre 0 y 20.
      5. TOTAL: El campo 'score' debe ser igual a la suma de las cinco métricas.
      
      Devuelve JSON siguiendo el esquema proporcionado.`
    : `You are a Professional Mentor conducting a 'Mock Interview'. 
      Set high professional expectations for the atmosphere, but use a 'Growth Mindset' for the grading.
      
      LANGUAGE RULES:
      1. ALL generated text MUST be in ENGLISH.
      
      GRADING RULES:
      1. Award partial credit for effort and honesty. 
      2. Provide exactly 3 'Glows' (strengths) and 3 'Grows' (specific areas to improve for next time) in the feedback.
      3. Encourage the student to review their transcript and try again to beat their score.
      4. MATH: Metric scores must be integers between 0 and 20.
      5. TOTAL: The 'score' field must equal the sum of the five metrics.
      
      Return JSON following the provided schema.`;

  const proInstruction = isSpanish
    ? `Eres un Auditor de Cumplimiento CTE estricto (Auditoría de Cumplimiento CTE). Tu trabajo es calificar a los estudiantes basándote ÚNICAMENTE en los estándares de la industria y las pruebas en la transcripción.
      
      REGLAS DE IDIOMA (MANDATORIO):
      1. TODO el texto generado DEBE estar en ESPAÑOL profesional.
      
      REGLAS DE CALIFICACIÓN:
      1. Sin inflación de calificaciones; si faltan pruebas, califica con 0.
      2. Sé directo y honesto en la auditoría de desempeño.
      3. MATEMÁTICAS: Los puntajes de las métricas deben ser números enteros entre 0 y 20.
      4. TOTAL: El campo 'score' debe ser igual a la suma de las cinco métricas.
      
      Devuelve JSON siguiendo el esquema proporcionado.`
    : `You are a strict CTE Compliance Auditor (CTE Compliance Audit). Your job is to score students based ONLY on the industry standards and evidence in the transcript.
      
      LANGUAGE RULES:
      1. ALL generated text MUST be in ENGLISH.
      
      GRADING RULES:
      1. No grade inflation; if evidence is missing, score it 0.
      2. Be blunt and honest performance auditing.
      3. MATH: Metric scores must be integers between 0 and 20.
      4. TOTAL: The 'score' field must equal the sum of the five metrics.
      
      Return JSON following the provided schema.`;

  const baseInstruction = setup.difficulty === 'professional' ? proInstruction : studentInstruction;

  const fallbackInstruction = isSpanish
    ? `PERSONA: ${setup.difficulty === 'professional' ? 'Auditor de Cumplimiento CTE' : 'Mentor de Carrera'} (Modo de Emergencia). 
      TAREA: Califica esta transcripción basándote ÚNICAMENTE en la evidencia. 
      REGLAS: 
      1. IDIOMA: TODO EL TEXTO EN ESPAÑOL.
      2. ${setup.difficulty === 'professional' ? 'Sin inflación de calificaciones; auditoría de desempeño directa.' : 'Altas expectativas pero Mentalidad de Crecimiento; crédito parcial por esfuerzo.'}
      3. Verifica todas las matemáticas; suma manualmente las 5 métricas.
      
      Devuelve JSON siguiendo el esquema proporcionado.`
    : `PERSONA: ${setup.difficulty === 'professional' ? 'Strict CTE Compliance Auditor' : 'Professional Mentor'} (Emergency Mode). 
      TASK: Score this transcript based ONLY on evidence. 
      RULES: 
      1. LANGUAGE: ALL TEXT IN ENGLISH.
      2. ${setup.difficulty === 'professional' ? 'No grade inflation; blunt performance auditing.' : 'High expectations but Growth Mindset; partial credit for effort.'}
      3. Double-check all math; manually sum the 5 metrics to ensure the total 'score' is mathematically perfect.
      
      Return JSON following the provided schema.`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: `Perform a final performance audit on this transcript.
    
    ASSESSMENT MODE: ${setup.difficulty === 'professional' ? 'Professional (Audit)' : 'Student (Mock Interview)'}
    
    SCORING ARCHITECTURE (CRITICAL):
    There are 5 categories. Each category MUST be scored from 0 to 20.
    1. Technical Skills (0-20)
    2. Communication (0-20)
    3. Problem Solving (0-20)
    4. Adaptability (0-20)
    5. Self-Awareness (0-20)
    
    The TOTAL SCORE must be the SUM of these five categories (Max 100).
    
    GRADING RIGOR:
    ${setup.difficulty === 'professional'
        ? `- STRICT AUDIT: Do not be "generous." If evidence is missing, score 0. Be blunt.
         - Unprofessional behavior = score 0-5.`
        : `- MOCK INTERVIEW: Use a coaching tone. Avoid harsh phrases like "fundamentally lacked."
         - SCORING FLOOR: If the student attempted an answer, give 5-8 points minimum for effort. Only give 0 if there is NO audio for that section.
         - MISTAKE HANDLING: For major errors (e.g. phone use), score low (5/20) but explain the professional standard gently.`}
    
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
          assessmentMode: { type: Type.STRING, enum: ["student", "professional"] },
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
        required: ["score", "summary", "strengths", "improvements", "metrics", "metricDetails", "detailedAnalysis", "assessmentMode"]
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
  const cleanedTranscription = transcription.map(entry => ({
    ...entry,
    text: entry.text.replace(/\s+/g, ' ').trim()
  }));

  const transcriptText = cleanedTranscription
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
    result.transcript = cleanedTranscription;
    return result;
  } catch (error: any) {
    console.warn("Pro analysis failed, attempting retry/fallback...", error);

    if (error.status === 429 || error.message?.includes('429')) {
      await sleep(2000);
      try {
        const result = await runAnalysisRequest(setup, transcriptText, 'gemini-3-pro-preview');
        result.isPartial = isPartial;
        result.isLowPowerMode = false;
        result.transcript = cleanedTranscription;
        return result;
      } catch (retryError) {
        console.warn("Pro retry failed, engaging emergency Flash fallback.");
      }
    }

    try {
      const result = await runAnalysisRequest(setup, transcriptText, 'gemini-3-flash-preview', true);
      result.isPartial = isPartial;
      result.isLowPowerMode = true;
      result.transcript = cleanedTranscription;
      return result;
    } catch (fallbackError) {
      console.error("Critical: Fallback analysis also failed.");
      throw new Error(setup.language === 'Spanish'
        ? "No se pudo realizar el análisis. Inténtelo de nuevo más tarde."
        : "Failed to perform analysis. Please try again later.");
    }
  }
}
