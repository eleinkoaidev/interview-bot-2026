🛡️ OVHS Interview Bot (Build v2.3.5-stable)
An AI-driven professional mock interview platform designed for High School Cybersecurity students. This tool provides real-time voice interaction, performance analytics, and automated PDF reporting.

🚀 Key Features (The "Laboratory" Build)
Intelligent Voice UX: Real-time speech-to-text with integrated noise suppression and silence detection optimized for high-school environments.

AI Transcript Reconstruction: A custom cleaning pipeline that repairs fragmented speech-to-text data (e.g., "cy ber se curity" -> "cybersecurity").

Dynamic Performance Reporting: Automated radar charts and CTE-standard scoring across five core categories: Technical Skills, Communication, Problem Solving, Adaptability, and Self-Awareness.

Resilience Logic: Automatic local storage of interview data to prevent progress loss during API "High Demand" spikes.

🛠️ Technical Improvements
Model: Powered by Gemini 3 Flash-Lite for low-latency, high-intelligence dialogue.

Fixed Role Logic: Hard-coded transcript labeling to ensure the Interviewer and Candidate are correctly identified in PDF exports.

Radar Chart Sync: Synchronized data mapping between the AI-generated JSON scores and the SVG Radar Chart axes.

UI/UX: Implemented a "Success Checklist" to calibrate the environment before the microphone initializes.
