
export interface InterviewSetup {
  studentName: string;
  careerField: string;
  jobTitle: string;
  companyName: string;
  experience: string;
  interviewType: string;
  language: 'English' | 'Spanish';
  micSensitivity: 'high' | 'normal' | 'low';
  interviewerName?: string;
  interviewerVoice?: string;
  difficulty: 'student' | 'professional';
}

export interface FeedbackMetrics {
  technicalSkills: number;
  communication: number;
  problemSolving: number;
  adaptability: number;
  selfAwareness: number;
}

export interface MetricDetail {
  label: string;
  score: number;
  weight: number;
  justification: string;
}

export interface Feedback {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  metrics: FeedbackMetrics;
  metricDetails: MetricDetail[];
  detailedAnalysis: {
    question: string;
    feedback: string;
  }[];
  isPartial?: boolean;
  isLowPowerMode?: boolean;
  assessmentMode: 'student' | 'professional';
}

export enum AppState {
  SETUP = 'SETUP',
  TESTING = 'TESTING',
  INTERVIEWING = 'INTERVIEWING',
  ANALYZING = 'ANALYZING',
  FEEDBACK = 'FEEDBACK'
}

export interface TranscriptionEntry {
  role: 'interviewer' | 'candidate';
  text: string;
}
