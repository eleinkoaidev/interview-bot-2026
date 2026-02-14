
import React from 'react';
import { FeedbackMetrics } from '../types';

interface RadarChartProps {
  metrics: FeedbackMetrics;
}

const RadarChart: React.FC<RadarChartProps> = ({ metrics }) => {
  const size = 300;
  const center = size / 2;
  const radius = size * 0.4;
  const axes = [
    { label: 'Technical', key: 'technicalSkills' },
    { label: 'Comm.', key: 'communication' },
    { label: 'Logic', key: 'problemSolving' },
    { label: 'Flex', key: 'adaptability' },
    { label: 'Self', key: 'selfAwareness' },
  ];

  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    const r = (radius * value) / 100;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polyPoints = axes
    .map((axis, i) => {
      const { x, y } = getCoordinates(i, (metrics as any)[axis.key]);
      return `${x},${y}`;
    })
    .join(' ');

  const gridLevels = [25, 50, 75, 100];

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Background Grids */}
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={axes
              .map((_, i) => {
                const { x, y } = getCoordinates(i, level);
                return `${x},${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        {/* Axis Lines */}
        {axes.map((_, i) => {
          const { x, y } = getCoordinates(i, 100);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          );
        })}

        {/* Data Polygon */}
        <polygon
          points={polyPoints}
          fill="rgba(204, 85, 0, 0.2)"
          stroke="#CC5500"
          strokeWidth="3"
          className="transition-all duration-1000"
        />

        {/* Points */}
        {axes.map((axis, i) => {
          const { x, y } = getCoordinates(i, (metrics as any)[axis.key]);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="#000000"
              className="transition-all duration-1000"
            />
          );
        })}

        {/* Labels */}
        {axes.map((axis, i) => {
          const { x, y } = getCoordinates(i, 120);
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              className="text-[9px] font-black fill-gray-900 uppercase tracking-widest"
              dominantBaseline="middle"
            >
              {axis.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default RadarChart;