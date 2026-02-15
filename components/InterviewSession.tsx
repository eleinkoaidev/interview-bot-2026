
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Blob } from '@google/genai';
import { InterviewSetup, TranscriptionEntry } from '../types';
import { decode, encode, decodeAudioData } from '../utils/audioUtils';
import { cleanTranscriptionText } from '../utils/stringUtils';

interface InterviewSessionProps {
  setup: InterviewSetup;
  onEnd: (transcription: TranscriptionEntry[]) => void;
}

const InterviewSession: React.FC<InterviewSessionProps> = ({ setup, onEnd }) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [displayTranscription, setDisplayTranscription] = useState<TranscriptionEntry[]>([]);
  const allEntriesRef = useRef<TranscriptionEntry[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputChainRef = useRef<AudioNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<any>(null);
  const isInitialized = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const interviewerName = setup.interviewerName || 'Alex';
  const interviewerVoice = setup.interviewerVoice || 'Charon';

  const isInterviewerSpeakingRef = useRef(false);
  const isUserSpeakingRef = useRef(false);
  const isNewTurnRef = useRef(true);
  const turnCompletionTimeoutRef = useRef<number | null>(null);
  const noResponseTimeoutRef = useRef<number | null>(null);
  const isPreparingToSpeak = useRef(false);

  const userSpeechTimeout = useRef<number | null>(null);
  const processingTimeout = useRef<number | null>(null);
  const vadDebounceTimeRef = useRef<number>(0);
  const preRollBufferRef = useRef<Float32Array>(new Float32Array(8000)); // 500ms @ 16kHz
  const preRollOffsetRef = useRef<number>(0);
  const hasSentPreRollRef = useRef<boolean>(false);

  const setupRef = useRef(setup);
  useEffect(() => {
    setupRef.current = setup;
  }, [setup]);

  // Auto-scroll to bottom whenever transcription updates
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayTranscription]);

  // Dynamic sensitivity thresholds
  const SENSITIVITY_THRESHOLDS = {
    high: 0.005,   // Higher sensitivity
    normal: 0.012,
    low: 0.035
  };
  const activeThreshold = SENSITIVITY_THRESHOLDS[setup.micSensitivity || 'normal'];

  const clearSilenceTimer = useCallback(() => {
    if (noResponseTimeoutRef.current) {
      window.clearTimeout(noResponseTimeoutRef.current);
      noResponseTimeoutRef.current = null;
    }
  }, []);

  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    // 3.5 seconds wait before nudge. A bit more than 3 to allow for natural pauses.
    noResponseTimeoutRef.current = window.setTimeout(() => {
      if (sessionRef.current && !isUserSpeakingRef.current && !isInterviewerSpeakingRef.current) {
        const nudgePrompt = setup.language === 'Spanish'
          ? "[SISTEMA: El candidato no ha respondido. Por favor, pregunta amablemente si entendieron la pregunta, si necesitan que la repitas o si prefieren que la reformules de otra manera. Mantén un tono de apoyo.]"
          : "[SYSTEM: The candidate has been silent for a while. Please friendly-ly check if they understood the question, if they need you to repeat it, or if they'd like you to rephrase it in a different way. Maintain a supportive tone.]";

        sessionRef.current.sendRealtimeInput({ text: nudgePrompt });
      }
    }, 3500);
  }, [setup.language, clearSilenceTimer]);

  const stopInterviewerAudio = useCallback(() => {
    if (sourcesRef.current) {
      sourcesRef.current.forEach(s => {
        try {
          s.stop();
        } catch (e) {
          // Source might already be stopped
        }
      });
      sourcesRef.current.clear();
    }
    nextStartTimeRef.current = 0;
    setIsInterviewerSpeaking(false);
    isInterviewerSpeakingRef.current = false;
    setIsProcessing(false);
    isNewTurnRef.current = true;
    clearSilenceTimer();
  }, [clearSilenceTimer]);

  const updateTranscript = useCallback((role: 'interviewer' | 'candidate', text: string) => {
    if (!text) return;

    const lastEntry = allEntriesRef.current[allEntriesRef.current.length - 1];
    if (lastEntry && lastEntry.role === role) {
      const needsSpace = !lastEntry.text.endsWith(' ') && !text.startsWith(' ');
      lastEntry.text += (needsSpace ? ' ' : '') + text;

      setDisplayTranscription([...allEntriesRef.current]);
    } else {
      const newEntry: TranscriptionEntry = { role, text };
      allEntriesRef.current.push(newEntry);
      setDisplayTranscription([...allEntriesRef.current]);
    }
  }, []);

  const initSession = useCallback(async () => {
    if (isInitialized.current) return;
    if (sessionRef.current) return;
    isInitialized.current = true;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      await inputCtx.resume();
      await outputCtx.resume();

      const compressor = outputCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, outputCtx.currentTime);
      compressor.knee.setValueAtTime(40, outputCtx.currentTime);
      compressor.ratio.setValueAtTime(12, outputCtx.currentTime);
      compressor.attack.setValueAtTime(0, outputCtx.currentTime);
      compressor.release.setValueAtTime(0.25, outputCtx.currentTime);

      const gainNode = outputCtx.createGain();
      gainNode.gain.setValueAtTime(1.5, outputCtx.currentTime);

      compressor.connect(gainNode);
      gainNode.connect(outputCtx.destination);

      audioContextRef.current = outputCtx;
      outputChainRef.current = compressor;

      const silentGain = inputCtx.createGain();
      silentGain.gain.setValueAtTime(0, inputCtx.currentTime);
      silentGain.connect(inputCtx.destination);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            const source = inputCtx.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            const scriptProcessor = inputCtx.createScriptProcessor(2048, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);

              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);

              const scaledLevel = Math.min(100, (rms / activeThreshold) * 30);
              setMicLevel(scaledLevel);

              const isLocked = isInterviewerSpeakingRef.current || isProcessing || isPreparingToSpeak.current;
              const effectiveThreshold = isLocked ? Infinity : activeThreshold;

              // Audio Ring Buffer (Pre-roll)
              for (let i = 0; i < inputData.length; i++) {
                preRollBufferRef.current[preRollOffsetRef.current] = inputData[i];
                preRollOffsetRef.current = (preRollOffsetRef.current + 1) % preRollBufferRef.current.length;
              }

              if (!isLocked && rms > effectiveThreshold) {
                const now = Date.now();
                if (vadDebounceTimeRef.current === 0) {
                  vadDebounceTimeRef.current = now;
                }

                if (now - vadDebounceTimeRef.current >= 200) { // 200ms Debounce
                  // User is talking, clear the silence timer
                  clearSilenceTimer();

                  if (isInterviewerSpeakingRef.current) {
                    stopInterviewerAudio();
                  }

                  setIsUserSpeaking(true);
                  isUserSpeakingRef.current = true;
                  setIsProcessing(false);

                  if (userSpeechTimeout.current) window.clearTimeout(userSpeechTimeout.current);
                  if (processingTimeout.current) window.clearTimeout(processingTimeout.current);

                  userSpeechTimeout.current = window.setTimeout(() => {
                    setIsUserSpeaking(false);
                    isUserSpeakingRef.current = false;
                    hasSentPreRollRef.current = false;
                    processingTimeout.current = window.setTimeout(() => {
                      if (!isInterviewerSpeakingRef.current) setIsProcessing(true);
                    }, 1000);
                  }, 500);
                }
              } else {
                vadDebounceTimeRef.current = 0;
              }

              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = isLocked ? 0 : inputData[i] * 32768;
              }

              sessionPromise.then((session) => {
                // If this is the start of speech, send the pre-roll first
                if (isUserSpeakingRef.current && !hasSentPreRollRef.current) {
                  hasSentPreRollRef.current = true;
                  const preRollSize = preRollBufferRef.current.length;
                  const preRollInt16 = new Int16Array(preRollSize);
                  const startIndex = preRollOffsetRef.current;

                  for (let i = 0; i < preRollSize; i++) {
                    const idx = (startIndex + i) % preRollSize;
                    preRollInt16[i] = preRollBufferRef.current[idx] * 32768;
                  }

                  session.sendRealtimeInput({
                    media: {
                      data: encode(new Uint8Array(preRollInt16.buffer)),
                      mimeType: 'audio/pcm;rate=16000',
                    }
                  });
                }

                const pcmBlob: Blob = {
                  data: encode(new Uint8Array(int16.buffer)),
                  mimeType: 'audio/pcm;rate=16000',
                };
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(silentGain);

            sessionPromise.then(session => {
              const currentSetup = setupRef.current;
              const isSpanish = currentSetup.language === 'Spanish';
              const initialPrompt = isSpanish
                ? `El candidato, ${currentSetup.studentName}, acaba de entrar a la sala. Por favor, dale la bienvenida calurosamente por su nombre completo en ESPAÑOL, preséntate como ${interviewerName}, ${interviewerName === 'Alex' ? 'un reclutador senior' : 'una gerente de adquisición de talento'} en ${currentSetup.companyName}. Luego, pregúntale cómo prefiere que le llames durante la entrevista.`
                : `The candidate, ${currentSetup.studentName}, has just entered the room. Please welcome them warmly by their full name in ENGLISH, introduce yourself as ${interviewerName}, a ${interviewerName === 'Alex' ? 'senior recruiter' : 'talent acquisition manager'} at ${currentSetup.companyName}. Then, ask them how they would prefer to be addressed during this interview.`;
              session.sendRealtimeInput({ text: initialPrompt });
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              updateTranscript('interviewer', message.serverContent.outputTranscription.text);
            } else if (message.serverContent?.inputTranscription) {
              updateTranscript('candidate', message.serverContent.inputTranscription.text);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              clearSilenceTimer(); // Interviewer starts outputting audio
              const ctx = audioContextRef.current!;
              const chain = outputChainRef.current!;

              if (isNewTurnRef.current) {
                isNewTurnRef.current = false;
                isPreparingToSpeak.current = true;
                if (turnCompletionTimeoutRef.current) window.clearTimeout(turnCompletionTimeoutRef.current);

                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime) + 0.8;
                setIsProcessing(true);

                const startDelayMs = (nextStartTimeRef.current - ctx.currentTime) * 1000;
                setTimeout(() => {
                  if (!isInterviewerSpeakingRef.current && sourcesRef.current.size > 0) {
                    setIsInterviewerSpeaking(true);
                    isInterviewerSpeakingRef.current = true;
                    isPreparingToSpeak.current = false;
                    setIsProcessing(false);
                  }
                }, Math.max(0, startDelayMs));
              }

              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(chain);

              source.onended = () => {
                if (sourcesRef.current) {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) {
                    if (turnCompletionTimeoutRef.current) window.clearTimeout(turnCompletionTimeoutRef.current);
                    turnCompletionTimeoutRef.current = window.setTimeout(() => {
                      setIsInterviewerSpeaking(false);
                      isInterviewerSpeakingRef.current = false;
                      isNewTurnRef.current = true;
                      setIsProcessing(false);
                      // Start silence monitoring now that interviewer has finished their turn
                      startSilenceTimer();
                    }, 600);
                  }
                }
              };

              if (!isUserSpeakingRef.current) {
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              }
            }

            if (message.serverContent?.interrupted) {
              stopInterviewerAudio();
            }
          },
          onerror: (e) => console.error("Live Error", e),
          onclose: () => console.log("Live Closed")
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: interviewerVoice } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are ${interviewerName}, a professional ${interviewerName === 'Alex' ? 'senior recruiter' : 'talent acquisition manager'} at ${setup.companyName} conducting an entry-level interview.
          
          LANGUAGE: Conduct this entire interview in ${setup.language}. 
          FIELD: ${setup.careerField}
          CANDIDATE: High school student named ${setup.studentName}, ${setup.experience}.
          ROLE: ${setup.jobTitle}.
          
          Always sound alert, professional, supportive, and clear in ${setup.language}.
          
          CRITICAL BEHAVIOR: 
          - Welcome the student by their FULL NAME initially: ${setup.studentName}.
          - IMMEDIATELY after welcoming them, ask how they would prefer to be addressed (e.g., first name, nickname, or Mr./Ms. [Last Name]).
          - Once they provide a preference, use ONLY that preferred name for the rest of the interview to keep the tone natural and professional.
          - BARGE-IN HANDLING: If the candidate starts speaking while you are talking, you MUST stop talking immediately. Your server sends an 'interrupted' signal—acknowledge it silently by waiting for them to finish.
          - Do not rush.
          - Speak naturally and ask one question at a time.
          - Start the interaction immediately by welcoming the candidate in ${setup.language}.
          - SILENCE HANDLING: If you receive a hidden [SYSTEM] nudge about silence, check in with the candidate warmly. Ask if they understood the question, or if you should repeat or rephrase it. Don't make them feel bad; interviews can be stressful.`
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      setIsConnecting(false);
      console.error("Initialization failed", err);
    }
  }, [updateTranscript, activeThreshold, stopInterviewerAudio, interviewerName, interviewerVoice, startSilenceTimer, clearSilenceTimer]);

  useEffect(() => {
    initSession();
    return () => {
      if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
      }
      isInitialized.current = false;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (userSpeechTimeout.current) window.clearTimeout(userSpeechTimeout.current);
      if (processingTimeout.current) window.clearTimeout(processingTimeout.current);
      if (turnCompletionTimeoutRef.current) window.clearTimeout(turnCompletionTimeoutRef.current);
      if (noResponseTimeoutRef.current) window.clearTimeout(noResponseTimeoutRef.current);
    };
  }, [initSession]);

  const handleEndInterview = () => {
    onEnd([...allEntriesRef.current]);
  };

  const statusText = setup.language === 'Spanish'
    ? (isInterviewerSpeaking ? `${interviewerName} está hablando` : isProcessing ? `${interviewerName} está reflexionando...` : isUserSpeaking ? `${interviewerName} está escuchando...` : `${interviewerName} está listo`)
    : (isInterviewerSpeaking ? `${interviewerName} is speaking` : isProcessing ? `${interviewerName} is reflecting...` : isUserSpeaking ? `${interviewerName} is listening...` : `${interviewerName} is ready`);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 min-h-[500px] flex flex-col relative">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-black">
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">{setup.jobTitle}</h2>
            <p className="text-xs font-bold text-[#CC5500] uppercase tracking-widest">{setup.careerField} • {setup.companyName}</p>
          </div>
          <button
            onClick={handleEndInterview}
            className="px-6 py-2 bg-[#CC5500] text-white font-black rounded-lg hover:bg-white hover:text-black transition-all shadow-md uppercase tracking-widest text-xs"
          >
            {setup.language === 'Spanish' ? 'Finalizar Sesión' : 'End Session'}
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
          {isConnecting ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 border-4 border-[#CC5500] border-t-black rounded-full animate-spin"></div>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs animate-pulse">
                {setup.language === 'Spanish' ? 'Entrando a la Sala...' : 'Entering Interview Room...'}
              </p>
            </div>
          ) : (
            <>
              <div className="relative">
                <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 ${isInterviewerSpeaking ? 'bg-black scale-105 shadow-2xl shadow-[#CC5500]/40 border-4 border-[#CC5500]' : isProcessing ? 'bg-gray-800 scale-100 shadow-xl border-4 border-gray-600' : isUserSpeaking ? 'bg-[#CC5500] scale-105 shadow-2xl shadow-[#CC5500]/20 border-4 border-white' : 'bg-gray-100 border-4 border-gray-200'}`}>
                  {isInterviewerSpeaking ? (
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2 h-8 bg-[#CC5500] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2 h-12 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-8 bg-[#CC5500] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  ) : isProcessing ? (
                    <div className="flex space-x-1">
                      <div className="w-2.5 h-2.5 bg-[#CC5500] rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2.5 h-2.5 bg-[#CC5500] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  ) : (
                    <div className="relative">
                      <svg className={`w-20 h-20 transition-colors duration-300 ${isUserSpeaking ? 'text-white' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      </svg>
                    </div>
                  )}
                </div>
                {(isInterviewerSpeaking || isProcessing) && (
                  <div className={`absolute -inset-6 rounded-full animate-pulse -z-10 ${isInterviewerSpeaking ? 'bg-[#CC5500]/10' : 'bg-gray-500/10'}`}></div>
                )}
              </div>

              <div className="text-center space-y-4 w-full max-w-xs">
                <p className={`text-xl font-black uppercase tracking-widest transition-colors duration-300 ${isInterviewerSpeaking ? 'text-[#CC5500]' : isProcessing ? 'text-gray-700' : isUserSpeaking ? 'text-black' : 'text-gray-400'}`}>
                  {statusText}
                </p>

                <div className="space-y-1">
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden border border-gray-100">
                    <div
                      className={`h-full transition-all duration-150 ${isUserSpeaking ? 'bg-[#CC5500]' : 'bg-black'}`}
                      style={{ width: `${micLevel}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                      {setup.language === 'Spanish' ? 'Sensibilidad de Entrada' : 'Input Sensitivity'}
                    </p>
                    <p className="text-[10px] text-[#CC5500] font-black uppercase tracking-widest italic">
                      Mode: {setup.micSensitivity}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-gray-50 p-6 border-t border-gray-100 h-48 overflow-y-auto">
          <p className="text-[10px] font-black text-[#CC5500] uppercase tracking-[0.2em] mb-4">
            {setup.language === 'Spanish' ? 'Transcripción en tiempo real' : 'Real-time Transcript Feed'}
          </p>
          <div className="space-y-4 pb-8">
            {displayTranscription.map((t, i) => (
              <div key={i} className={`flex space-x-3 ${t.role === 'interviewer' ? 'text-black font-black' : 'text-gray-600'}`}>
                <span className="whitespace-nowrap uppercase tracking-widest text-[10px] mt-1">
                  {t.role === 'interviewer' ? `${interviewerName.toUpperCase()}:` : (setup.language === 'Spanish' ? 'TÚ:' : 'YOU:')}
                </span>
                <span className="text-sm font-medium leading-relaxed italic border-l-2 border-gray-200 pl-3">{t.text}</span>
              </div>
            ))}
            {displayTranscription.length === 0 && (
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest text-center py-4">
                {setup.language === 'Spanish' ? `${interviewerName} comenzará pronto...` : `${interviewerName} will begin shortly...`}
              </p>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSession;
