
import React, { useState } from 'react';
import { InterviewSetup } from '../types';

interface SetupFormProps {
  onStart: (setup: InterviewSetup) => void;
}

const JOBS_BY_FIELD: Record<string, string[]> = {
  "cybersecurity": [
    'Junior SOC Analyst',
    'Cybersecurity Intern',
    'IT Security Assistant',
    'Junior Pentester',
    'Help Desk (Security Focused)',
    'Information Security Associate'
  ],
  "viticulture": [
    'Cellar Hand',
    'Vineyard Assistant',
    'Lab Technician',
    'Tasting Room Associate',
    'Vineyard Intern'
  ],
  "fire tech & ems": [
    'Volunteer Firefighter',
    'EMT Trainee',
    'Emergency Dispatcher',
    'Wildland Firefighter Trainee',
    'EMS Assistant'
  ],
  "engineering": [
    'CAD Drafter',
    'Junior Civil Engineer',
    'Mechanical Engineering Assistant',
    'Robotics Intern',
    'Project Engineering Aide'
  ],
  "manufacturing": [
    'Machinist Trainee',
    'Quality Control Assistant',
    'Assembly Technician',
    'Welder Apprentice',
    'Production Floor Assistant'
  ],
  "graphic design & photography": [
    'Junior Graphic Designer',
    'Photography Assistant',
    'Social Media Content Creator',
    'Branding Intern',
    'Production Artist'
  ],
  "sports medicine": [
    'Athletic Training Student',
    'Physical Therapy Assistant',
    'Rehab Aide',
    'Fitness Specialist Intern',
    'Exercise Science Assistant'
  ],
  "video production": [
    'Production Assistant',
    'Video Editor Intern',
    'Assistant Camera Operator',
    'Audio Technician Trainee',
    'Lighting Assistant'
  ]
};

const SetupForm: React.FC<SetupFormProps> = ({ onStart }) => {
  const [isOther, setIsOther] = useState(false);
  const fields = Object.keys(JOBS_BY_FIELD).sort((a, b) => a.localeCompare(b));
  
  const [setup, setSetup] = useState<InterviewSetup>({
    studentName: '',
    careerField: fields[0],
    jobTitle: JOBS_BY_FIELD[fields[0]][0],
    companyName: 'NextGen Solutions',
    experience: 'High School Student / Entry Level',
    interviewType: 'Behavioral & Basic Technical',
    language: 'English',
    micSensitivity: 'normal'
  });

  const handleFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const field = e.target.value;
    const defaultJob = JOBS_BY_FIELD[field][0];
    setSetup({
      ...setup,
      careerField: field,
      jobTitle: defaultJob
    });
    setIsOther(false);
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'Other') {
      setIsOther(true);
      setSetup({ ...setup, jobTitle: '' });
    } else {
      setIsOther(false);
      setSetup({ ...setup, jobTitle: val });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart(setup);
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 font-black uppercase tracking-tight">Configure Interview</h1>
        <p className="text-gray-500 mb-8 font-medium">
          Personalize your session to get the most accurate feedback.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Student Full Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#CC5500] transition-all outline-none font-bold text-gray-900 bg-gray-50"
              placeholder="Enter your first and last name"
              value={setup.studentName}
              onChange={(e) => setSetup({ ...setup, studentName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">CTE Field</label>
              <select
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#CC5500] outline-none capitalize font-bold text-gray-900 bg-gray-50"
                value={setup.careerField}
                onChange={handleFieldChange}
              >
                {fields.map(field => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Target Company</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#CC5500] transition-all outline-none font-bold text-gray-900 bg-gray-50"
                placeholder="e.g. Acme Corp"
                value={setup.companyName}
                onChange={(e) => setSetup({ ...setup, companyName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Job Role</label>
            <select
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#CC5500] outline-none font-bold text-gray-900 bg-gray-50"
              value={isOther ? 'Other' : setup.jobTitle}
              onChange={handleRoleChange}
            >
              {JOBS_BY_FIELD[setup.careerField].map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
              <option value="Other">Other (Custom Role)</option>
            </select>
            {isOther && (
              <input
                type="text"
                required
                autoFocus
                className="mt-3 w-full px-4 py-3 rounded-xl border-2 border-[#CC5500] outline-none font-bold text-gray-900 bg-white"
                placeholder="Type specific job title"
                value={setup.jobTitle}
                onChange={(e) => setSetup({ ...setup, jobTitle: e.target.value })}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Experience Level</label>
              <select
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#CC5500] outline-none font-bold text-gray-900 bg-gray-50"
                value={setup.experience}
                onChange={(e) => setSetup({ ...setup, experience: e.target.value })}
              >
                <option>High School Student / Entry Level</option>
                <option>1-2 years experience</option>
                <option>Vocational School Grad</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Interview Focus</label>
              <select
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#CC5500] outline-none font-bold text-gray-900 bg-gray-50"
                value={setup.interviewType}
                onChange={(e) => setSetup({ ...setup, interviewType: e.target.value })}
              >
                <option>Soft Skills & Communication</option>
                <option>Behavioral & Basic Technical</option>
                <option>Internship Screening</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white font-black text-xs">
                  {setup.language === 'English' ? 'EN' : 'ES'}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Spanish Mode</p>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Interview Language</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={setup.language === 'Spanish'}
                  onChange={(e) => setSetup({ ...setup, language: e.target.checked ? 'Spanish' : 'English' })}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#CC5500]"></div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-black hover:bg-[#CC5500] text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-3 border-2 border-black uppercase tracking-[0.2em] text-sm mt-4"
          >
            <span>Continue to System Check</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupForm;
