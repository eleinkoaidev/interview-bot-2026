
/**
 * ANTI-GRAVITY AI DEVELOPER RULE:
 * This project uses strict Semantic Versioning. Whenever you modify the 
 * Interview UI, the Analysis Logic, or the PDF Generation, you MUST:
 * 1. Increment the version number in the UI constant (e.g., v2.0.2 to v2.0.3).
 * 2. Sync this version number to the PDF Report footer.
 * 3. Acknowledge the version bump in your response.
 */

import React, { useState, useEffect, useRef } from 'react';
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
  const [isRetryable, setIsRetryable] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasZombieBackup, setHasZombieBackup] = useState(false);
  const lastTranscriptionRef = useRef<TranscriptionEntry[]>([]);

  // Task 3: Zombie Check — on mount, detect any crash-saved transcript backup
  useEffect(() => {
    try {
      const savedTranscript = localStorage.getItem('prointerviews_backup_transcript');
      const savedSetup = localStorage.getItem('prointerviews_backup_setup');
      if (savedTranscript && savedSetup) {
        const parsed = JSON.parse(savedTranscript);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHasZombieBackup(true);
        }
      }
    } catch (e) {
      console.warn('Error reading zombie backup:', e);
    }
  }, []);

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

  const runAnalysis = async (transcription: TranscriptionEntry[], currentSetup: InterviewSetup) => {
    try {
      const results = await analyzeInterview(currentSetup, transcription);
      setFeedback(results);
      setState(AppState.FEEDBACK);
      // NOTE: localStorage is cleared inside FeedbackReport on successful render
    } catch (error: any) {
      console.error(error);
      setAnalysisError(error.message || 'Something went wrong during analysis.');
      setIsRetryable(!!(error as any).retryable);
    }
  };

  const endInterview = async (transcription: TranscriptionEntry[]) => {
    if (!setup) return;
    lastTranscriptionRef.current = transcription;
    setState(AppState.ANALYZING);
    setAnalysisError(null);
    setIsRetryable(false);
    await runAnalysis(transcription, setup);
  };

  // Task 3: Retry button — reads the localStorage backup, re-attempts analysis
  const retryAnalysis = async () => {
    if (!setup) return;
    let transcription = lastTranscriptionRef.current;
    try {
      const saved = localStorage.getItem('prointerviews_backup_transcript');
      if (saved) transcription = JSON.parse(saved) as TranscriptionEntry[];
    } catch (_) { }

    setIsRetrying(true);
    setAnalysisError(null);
    await runAnalysis(transcription, setup);
    setIsRetrying(false);
  };

  // Task 3: Zombie Recovery — reconstruct full state from localStorage and re-analyze
  const recoverZombieSession = async () => {
    try {
      const savedTranscript = localStorage.getItem('prointerviews_backup_transcript');
      const savedSetup = localStorage.getItem('prointerviews_backup_setup');
      if (!savedTranscript || !savedSetup) return;

      const transcript = JSON.parse(savedTranscript) as TranscriptionEntry[];
      const recoveredSetup = JSON.parse(savedSetup) as InterviewSetup;

      lastTranscriptionRef.current = transcript;
      setSetup(recoveredSetup);
      setState(AppState.ANALYZING);
      setAnalysisError(null);
      setIsRetryable(false);
      setHasZombieBackup(false);
      setIsRetrying(true);
      await runAnalysis(transcript, recoveredSetup);
    } catch (error: any) {
      console.error(error);
      setAnalysisError(error.message || 'Recovery failed.');
      setIsRetryable(!!(error as any).retryable);
    } finally {
      setIsRetrying(false);
    }
  };

  const dismissZombie = () => {
    setHasZombieBackup(false);
    try {
      localStorage.removeItem('prointerviews_backup_transcript');
      localStorage.removeItem('prointerviews_backup_setup');
    } catch (_) { }
  };

  const reset = () => {
    setState(AppState.SETUP);
    setSetup(null);
    setFeedback(null);
    setAnalysisError(null);
    setIsRetryable(false);
    setIsRetrying(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {state === AppState.SETUP && (
          <>
            {/* Task 3: Zombie Recovery Banner */}
            {hasZombieBackup && (
              <div className="max-w-2xl mx-auto px-4 mt-8 mb-4">
                <div className="bg-[#CC5500] text-white rounded-2xl shadow-xl p-6 border-2 border-black flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-black rounded-lg flex-shrink-0">
                      <svg className="w-6 h-6 text-[#CC5500]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-widest text-base">Incomplete Session Found</h3>
                      <p className="text-sm font-medium opacity-90">A previous interview didn't finish generating its report. Resume it now.</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full sm:w-auto flex-shrink-0">
                    <button
                      onClick={recoverZombieSession}
                      className="px-6 py-3 bg-black text-white font-black rounded-xl uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-colors whitespace-nowrap"
                    >
                      Resume Previous Session
                    </button>
                    <button
                      onClick={dismissZombie}
                      className="px-4 py-2 border-2 border-white/40 text-white/80 hover:text-white hover:border-white font-bold rounded-lg uppercase tracking-widest text-[10px] transition-colors whitespace-nowrap text-center"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            )}
            <SetupForm onStart={startSetup} />
          </>
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
                {/* Task 3: Retry Analysis button — only shown when error is retryable */}
                {isRetryable && (
                  <button
                    onClick={retryAnalysis}
                    disabled={isRetrying}
                    className="w-full py-4 bg-[#CC5500] text-white font-black rounded-xl uppercase tracking-widest text-xs hover:bg-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isRetrying ? 'Retrying...' : (setup?.language === 'Spanish' ? 'Reintentar Análisis' : 'Retry Analysis')}
                  </button>
                )}
                <button
                  onClick={reset}
                  className="w-full py-4 bg-black text-white font-black rounded-xl uppercase tracking-widest text-xs hover:bg-[#CC5500] transition-colors"
                >
                  {setup?.language === 'Spanish' ? 'Volver al Inicio' : 'Back to Dashboard'}
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
            <span className="font-mono uppercase tracking-tighter text-gray-600">Build v2.2.2-stable</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
