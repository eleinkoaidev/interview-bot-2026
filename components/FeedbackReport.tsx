
import React, { useRef, useState } from 'react';
import { Feedback, InterviewSetup } from '../types';
import RadarChart from './RadarChart';

interface FeedbackReportProps {
  feedback: Feedback;
  setup: InterviewSetup;
  onRestart: () => void;
}

const FeedbackReport: React.FC<FeedbackReportProps> = ({ feedback, setup, onRestart }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const isSpanish = setup.language === 'Spanish';
  const interviewerName = setup.interviewerName || 'Alex';

  const t = {
    download: isSpanish ? 'Descargar Informe PDF' : 'Download PDF Report',
    generating: isSpanish ? 'Generando PDF...' : 'Generating PDF...',
    title: isSpanish ? 'Registro de Desempeño de Entrevista OVHS' : 'OVHS Interview Performance Record',
    candidate: isSpanish ? 'Candidato' : 'Candidate',
    summary: isSpanish ? 'Resumen de Revisión' : 'Review Summary',
    finalScore: isSpanish ? 'Puntos Finales' : 'Final Points',
    weightedMetrics: isSpanish ? 'Métricas Ponderadas' : 'Weighted Metrics',
    standards: isSpanish ? 'Evaluación detallada según los estándares de CTE' : 'Detailed evaluation across CTE standards',
    credit: isSpanish ? 'Crédito Disponible' : 'Available Credit',
    keyAssets: isSpanish ? 'Fortalezas Clave' : 'Key Assets',
    growthMap: isSpanish ? 'Mapa de Crecimiento' : 'Growth Map',
    notes: isSpanish ? `Notas de ${interviewerName}` : `${interviewerName}'s Notes`,
    tryAnother: isSpanish ? 'Probar otro campo' : 'Try Another Field',
    date: isSpanish ? 'Fecha Generada' : 'Date Generated',
    assessmentMode: isSpanish ? 'Modo de Evaluación' : 'Assessment Mode',
    studentMode: isSpanish ? 'Entrevista de Práctica Profesional' : 'Professional Mock Interview',
    proMode: isSpanish ? 'Auditoría de Cumplimiento CTE' : 'CTE Compliance Audit',
    coachFeedback: isSpanish ? 'Comentarios del Entrenador' : "Coach's Feedback",
    partialBanner: isSpanish ? 'SESIÓN PARCIAL DETECTADA' : 'PARTIAL SESSION DETECTED',
    partialDescription: isSpanish
      ? 'Esta entrevista finalizó antes de completar todas las fases. Las puntuaciones reflejan solo la evidencia proporcionada.'
      : 'This interview was ended before completion. Scores reflect only the limited evidence provided.',
    transcriptTitle: isSpanish ? 'Transcripción Completa de la Entrevista' : 'Full Interview Transcript',
    interviewerLabel: isSpanish ? 'Entrevistador' : 'Interviewer',
    candidateLabel: isSpanish ? 'Candidato' : 'Candidate',
  };

  const handleDownloadPDF = () => {
    if (!reportRef.current) return;
    setIsDownloading(true);

    const safeName = setup.studentName.replace(/\s+/g, '_');
    const safeJob = setup.jobTitle.replace(/\s+/g, '_');

    const element = reportRef.current;

    // Configure options specifically to handle page breaks better
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `Interview_Report_${safeName}_${safeJob}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        scrollY: -window.scrollY // Fixes issues where scrolling affects capture
      },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const html2pdf = (window as any).html2pdf;
    if (html2pdf) {
      // Use the promise-based chain to ensure the state is reset only after completion
      html2pdf().set(opt).from(element).save().then(() => {
        setIsDownloading(false);
      }).catch((err: any) => {
        console.error("PDF generation error", err);
        setIsDownloading(false);
      });
    } else {
      console.error("html2pdf library not found");
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 animate-fadeIn">
      {/* Dynamic CSS to prevent breaks inside cards during PDF generation */}
      <style>{`
        @media print {
          .pdf-section { page-break-inside: avoid !important; break-inside: avoid !important; }
        }
        .pdf-section { page-break-inside: avoid; break-inside: avoid; }
      `}</style>

      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className={`flex items-center space-x-2 px-6 py-3 bg-[#CC5500] text-white font-black rounded-xl shadow-lg hover:bg-black transition-all uppercase tracking-widest text-xs ${isDownloading ? 'opacity-50 cursor-wait' : ''}`}
        >
          {isDownloading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          <span>{isDownloading ? t.generating : t.download}</span>
        </button>
      </div>

      <div ref={reportRef} className="space-y-8 bg-white p-4">
        {feedback.isPartial && (
          <div className="pdf-section bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl flex items-center space-x-4">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-amber-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-amber-900 font-black text-xs uppercase tracking-widest">{t.partialBanner}</p>
              <p className="text-amber-800 text-sm font-medium italic mt-1">{t.partialDescription}</p>
            </div>
          </div>
        )}

        <div className="pdf-section border-b-4 border-[#CC5500] pb-6 mb-8">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[#CC5500] font-black uppercase tracking-[0.2em] text-xs mb-1">{t.title}</p>
              <h1 className="text-3xl font-black text-black uppercase tracking-tight">{setup.jobTitle}</h1>
              <div className="mt-2 flex items-center space-x-6">
                <div>
                  <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">{t.candidate}</p>
                  <p className="text-black font-black text-xl uppercase tracking-tight">{setup.studentName}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">{t.assessmentMode}</p>
                  <p className="text-[#CC5500] font-black text-xs uppercase tracking-widest">
                    {feedback.assessmentMode === 'professional' ? t.proMode : t.studentMode}
                  </p>
                </div>
              </div>
              <p className="text-gray-500 font-bold text-sm mt-1">{setup.careerField} • {setup.companyName}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">{t.date}</p>
              <p className="text-black font-bold text-xs">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="pdf-section bg-white rounded-3xl shadow-xl p-8 lg:p-10 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-10 items-center">
            <div className="flex-1 space-y-4">
              <h1 className="text-3xl lg:text-4xl font-black text-gray-900 leading-tight uppercase tracking-tight">
                {feedback.assessmentMode === 'student' ? t.coachFeedback : t.summary}
              </h1>
              <p className="text-gray-600 leading-relaxed text-lg font-medium text-left">
                {feedback.summary}
              </p>
            </div>

            <div className="relative w-48 h-48 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="84"
                  stroke="#f3f4f6"
                  strokeWidth="16"
                  fill="transparent"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="84"
                  stroke={feedback.isPartial ? "#d97706" : "#CC5500"}
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray={527.78}
                  strokeDashoffset={527.78 - (527.78 * Math.min(100, feedback.score)) / 100}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className={`text-6xl font-black ${feedback.isPartial ? 'text-amber-600' : 'text-black'}`}>{feedback.score}</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t.finalScore}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pdf-section bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{t.weightedMetrics}</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{t.standards}</p>
            </div>
            <div className="hidden sm:block bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <RadarChart metrics={feedback.metrics} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {feedback.metricDetails.map((detail, i) => {
              const percentage = (detail.score / detail.weight) * 100;

              return (
                <div key={i} className="pdf-section group p-5 bg-gray-50 rounded-2xl border border-gray-100 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-black text-[#CC5500] flex items-center justify-center font-black border border-black transition-colors">
                        {detail.weight}
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm">{detail.label}</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.credit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-3xl font-black ${percentage < 40 ? 'text-red-500' : 'text-black'}`}>
                        {detail.score}
                      </span>
                      <span className="text-gray-400 font-black text-sm"> / {detail.weight}</span>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-4 border border-gray-100">
                    <div
                      className={`h-full ${percentage < 40 ? 'bg-red-500' : 'bg-[#CC5500]'}`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-start space-x-3 bg-white/70 p-4 rounded-xl border border-gray-100 shadow-sm">
                    <svg className={`w-4 h-4 mt-1 flex-shrink-0 ${percentage < 40 ? 'text-red-500' : 'text-[#CC5500]'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-gray-700 italic font-medium leading-relaxed">
                      {detail.justification}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="pdf-section bg-gray-50 rounded-3xl p-8 border-l-4 border-[#CC5500] shadow-sm">
            <h2 className="text-lg font-black text-black mb-6 flex items-center uppercase tracking-widest">
              <svg className="w-5 h-5 mr-3 text-[#CC5500]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.keyAssets}
            </h2>
            <ul className="space-y-4">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex items-start text-gray-700 font-medium bg-white p-3 rounded-xl border border-gray-100">
                  <span className="text-[#CC5500] font-black mr-3">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pdf-section bg-gray-50 rounded-3xl p-8 border-l-4 border-black shadow-sm">
            <h2 className="text-lg font-black text-black mb-6 flex items-center uppercase tracking-widest">
              <svg className="w-5 h-5 mr-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.growthMap}
            </h2>
            <ul className="space-y-4">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="flex items-start text-gray-700 font-medium bg-white p-3 rounded-xl border border-gray-100">
                  <span className="text-black font-black mr-3">→</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tight">{t.notes}</h2>
          <div className="space-y-6">
            {feedback.detailedAnalysis.map((item, i) => (
              <div key={i} className="pdf-section p-6 bg-gray-50 rounded-2xl border border-gray-100 transition-colors">
                <p className="font-black text-gray-900 mb-4 text-sm uppercase tracking-wider">{item.question}</p>
                <div className="flex items-start space-x-3 text-gray-700 bg-white p-4 rounded-xl border border-gray-100 font-medium italic">
                  <svg className="w-5 h-5 text-[#CC5500] mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  </svg>
                  <p>{item.feedback}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pdf-section px-8 pb-4">
          <div className={`text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center p-4 rounded-2xl border-2 ${feedback.isLowPowerMode ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
            <span className="mr-2">{feedback.isLowPowerMode ? '⚡' : '✨'}</span>
            <span>
              {feedback.assessmentMode === 'professional' ? 'Industry Audit' : 'Mock Interview'}
              {' '}Mode • {feedback.isLowPowerMode ? 'Gemini Flash' : 'Gemini Pro'} Performance Engine
            </span>
          </div>
        </div>

        {feedback.transcript && (
          <div className="pdf-section bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tight">{t.transcriptTitle}</h2>
            <div className="space-y-4 border-t border-gray-100 pt-6">
              {feedback.transcript.map((entry, i) => (
                <div key={i} className="flex flex-col space-y-1">
                  <p className="font-black text-gray-400 uppercase tracking-widest text-[8px]">
                    {entry.role === 'interviewer' ? t.interviewerLabel : t.candidateLabel}:
                  </p>
                  <p className="text-gray-700 text-[10px] sm:text-[9pt] leading-relaxed text-left">
                    {entry.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center pt-8 pb-12 space-x-4">
        <button
          onClick={onRestart}
          className="px-12 py-5 bg-black text-white font-black rounded-2xl shadow-xl shadow-black/10 hover:bg-[#CC5500] hover:shadow-[#CC5500]/20 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center space-x-3 uppercase tracking-widest text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{t.tryAnother}</span>
        </button>
      </div>
    </div>
  );
};

export default FeedbackReport;
