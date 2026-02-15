
import React, { useState, useEffect, useRef } from 'react';
import { InterviewSetup } from '../types';

interface AudioTestProps {
  setup: InterviewSetup;
  setSetup: (setup: InterviewSetup) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const SENSITIVITY_THRESHOLDS = {
  high: 0.008,   // Quiet room
  normal: 0.02,  // Default
  low: 0.045     // Noisy classroom/shared space
};

const AudioTest: React.FC<AudioTestProps> = ({ setup, setSetup, onConfirm, onCancel }) => {
  const [micActive, setMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isAboveThreshold, setIsAboveThreshold] = useState(false);
  const [speakerTested, setSpeakerTested] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const activeThreshold = SENSITIVITY_THRESHOLDS[setup.micSensitivity || 'normal'];

  useEffect(() => {
    const startMicTest = async () => {
      try {
        if (!streamRef.current) {
          streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        if (!audioContextRef.current) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioCtx();
        }

        const audioCtx = audioContextRef.current;

        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        if (sourceRef.current) sourceRef.current.disconnect();
        if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();

        const source = audioCtx.createMediaStreamSource(streamRef.current);
        sourceRef.current = source;

        const scriptProcessor = audioCtx.createScriptProcessor(2048, 1, 1);
        scriptProcessorRef.current = scriptProcessor;

        scriptProcessor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);

          // Determine if this sound would trigger Alex
          setIsAboveThreshold(rms > activeThreshold);

          // Visual scaling for the UI bar (relative to the active threshold)
          const scaled = (rms / activeThreshold) * 50;
          setMicLevel(Math.min(100, scaled));
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(audioCtx.destination);
        setMicActive(true);
      } catch (err) {
        console.error("Mic test failed", err);
      }
    };

    startMicTest();

    return () => {
      if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current.onaudioprocess = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
    };
  }, [activeThreshold]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const playTestSound = async () => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1);
    setSpeakerTested(true);
  };

  const changeSensitivity = (id: 'high' | 'normal' | 'low') => {
    setSetup({ ...setup, micSensitivity: id });
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
        <h2 className="text-3xl font-black text-gray-900 mb-6 uppercase tracking-tight">System Check</h2>
        <p className="text-gray-500 mb-8 text-lg">Ensure Alex can hear you over background noise.</p>

        <div className="space-y-8">
          {/* Environment Calibration Section */}
          <div className="bg-black p-6 rounded-2xl shadow-inner space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-black text-[#CC5500] uppercase tracking-[0.2em]">Environment Calibration</label>
              <div className="bg-gray-800 px-2 py-1 rounded-md">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Current Threshold: </span>
                <span className="text-[10px] text-white font-mono font-bold">{activeThreshold}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'high', label: 'Quiet', sub: 'Home Office' },
                { id: 'normal', label: 'Balanced', sub: 'Shared Area' },
                { id: 'low', label: 'Noisy', sub: 'Classroom' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => changeSensitivity(opt.id as any)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${setup.micSensitivity === opt.id ? 'bg-[#CC5500] border-[#CC5500] text-white shadow-lg shadow-[#CC5500]/20' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                >
                  <span className="font-black text-xs uppercase tracking-widest">{opt.label}</span>
                  <span className="text-[10px] opacity-70 italic font-bold leading-none mt-1">{opt.sub}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 font-bold italic text-center leading-relaxed">
              If the meter stays orange while you aren't talking, switch to <span className="text-white">NOISY</span>.
              If Alex can't hear you, switch to <span className="text-white">QUIET</span>.
            </p>
          </div>

          {/* Mic Test with Gate feedback */}
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center">
                <svg className={`w-5 h-5 mr-2 ${isAboveThreshold ? 'text-[#CC5500]' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                Voice Detection
              </h3>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isAboveThreshold ? 'bg-[#CC5500] animate-pulse' : 'bg-gray-300'}`}></div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isAboveThreshold ? 'text-[#CC5500]' : 'text-gray-400'}`}>
                  {isAboveThreshold ? 'Speaking Detected' : 'Filtering Noise'}
                </span>
              </div>
            </div>

            <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden border border-gray-100 flex relative">
              {/* Threshold indicator line at 50% */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-black/20 z-10"></div>

              <div
                className={`h-full transition-all duration-75 ease-out ${isAboveThreshold ? 'bg-[#CC5500]' : 'bg-gray-400'}`}
                style={{ width: `${micLevel}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Silence</p>
              <p className="text-[10px] font-black text-gray-900 uppercase tracking-wider">Speech Trigger</p>
            </div>
          </div>

          {/* Speaker Test */}
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center">
                <svg className={`w-5 h-5 mr-2 ${speakerTested ? 'text-[#CC5500]' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
                Audio Output
              </h3>
            </div>
            <button
              onClick={playTestSound}
              className="w-full py-4 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-[#CC5500] hover:text-[#CC5500] transition-all font-black flex items-center justify-center space-x-2 uppercase tracking-widest text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
              <span>Verify Speakers</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-10">
          <button
            onClick={onCancel}
            className="py-4 px-6 border-2 border-gray-200 rounded-2xl font-black text-gray-500 hover:bg-gray-50 transition-all uppercase tracking-widest text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!micActive}
            className={`py-4 px-6 rounded-2xl font-black text-white shadow-lg transition-all uppercase tracking-widest text-sm ${micActive ? 'bg-black hover:bg-[#CC5500] border-2 border-black' : 'bg-gray-300 cursor-not-allowed'}`}
          >
            Begin Interview
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioTest;
