
/**
 * ANTI-GRAVITY AI DEVELOPER RULE:
 * This project uses strict Semantic Versioning. Whenever you modify the 
 * Interview UI, the Analysis Logic, or the PDF Generation, you MUST:
 * 1. Increment the version number in the UI constant (e.g., v2.0.2 to v2.0.3).
 * 2. Sync this version number to the PDF Report footer.
 * 3. Acknowledge the version bump in your response.
 */

import React, { useState } from 'react';
import Header from './components/Header';
import SetupForm from './components/SetupForm';
import AudioTest from './components/AudioTest';
import InterviewSession from './components/InterviewSession';
import FeedbackReport from './components/FeedbackReport';
import { AppState, Feedback, InterviewSetup, TranscriptionEntry } from './types';
import { analyzeInterview } from './services/analysisService';

const INTERVIEWERS = [
  { name: 'Alex', voice: 'Charon' },
  { name: 'Sarah', voice: 'Kore' }
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.SETUP);
  const [setup, setSetup] = useState<InterviewSetup | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const startSetup = (setupData: InterviewSetup) => {
    setSetup(setupData);
    setState(AppState.TESTING);
  };

  const confirmAudio = () => {
    if (!setup) return;

    // Randomly select interviewer persona
    const persona = INTERVIEWERS[Math.floor(Math.random() * INTERVIEWERS.length)];

    setSetup({
      ...setup,
      interviewerName: persona.name,
      interviewerVoice: persona.voice
    });

    setState(AppState.INTERVIEWING);
  };

  const cancelSetup = () => {
    setState(AppState.SETUP);
  };

  const endInterview = async (transcription: TranscriptionEntry[]) => {
    if (!setup) return;

    setState(AppState.ANALYZING);
    setAnalysisError(null);
    try {
      const results = await analyzeInterview(setup, transcription);
      setFeedback(results);
      setState(AppState.FEEDBACK);
    } catch (error: any) {
      console.error(error);
      setAnalysisError(error.message || "Something went wrong during analysis.");
    }
  };

  const reset = () => {
    setState(AppState.SETUP);
    setSetup(null);
    setFeedback(null);
    setAnalysisError(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {state === AppState.SETUP && (
          <SetupForm onStart={startSetup} />
        )}

        {state === AppState.TESTING && setup && (
          <AudioTest
            setup={setup}
            setSetup={setSetup}
            onConfirm={confirmAudio}
            onCancel={cancelSetup}
          />
        )}

        {state === AppState.INTERVIEWING && setup && (
          <InterviewSession setup={setup} onEnd={endInterview} />
        )}

        {state === AppState.ANALYZING && (
          <div className="flex flex-col items-center justify-center py-32 px-4 space-y-6">
            {!analysisError ? (
              <>
                <div className="w-16 h-16 border-4 border-[#CC5500] border-t-black rounded-full animate-spin"></div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Analyzing Performance</h2>
                  <p className="text-gray-500">{setup?.interviewerName || 'Alex'} is finalizing your feedback report...</p>
                </div>
              </>
            ) : (
              <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center space-y-6">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-gray-900 uppercase">Analysis Incomplete</h2>
                  <p className="text-gray-600 font-medium text-sm leading-relaxed">{analysisError}</p>
                </div>
                <button
                  onClick={reset}
                  className="w-full py-4 bg-black text-white font-black rounded-xl uppercase tracking-widest text-xs hover:bg-[#CC5500] transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>
        )}

        {state === AppState.FEEDBACK && feedback && setup && (
          <FeedbackReport feedback={feedback} setup={setup} onRestart={reset} />
        )}
      </main>

      <footer className="py-12 bg-black text-center border-t-4 border-[#CC5500]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-white font-bold text-lg mb-2">OVHS Interviews</p>
          <p className="text-gray-400 text-sm tracking-widest uppercase mb-4">Where Success Begins!</p>
          <p className="text-gray-500 text-[10px] flex items-center justify-center space-x-2">
            <span>&copy; 2026 OVHS Interviews. All Rights Reserved.</span>
            <span className="text-[#CC5500]/40">•</span>
            <span className="font-mono uppercase tracking-tighter text-gray-600">Build v2.0.5-stable</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
