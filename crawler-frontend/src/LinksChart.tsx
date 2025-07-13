// LinksChart.tsx
import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface LinksChartProps {
  internal: number;
  external: number;
  broken: number;
}

export const LinksChart: React.FC<LinksChartProps> = ({ internal, external, broken }) => {
  const data = {
    labels: ['Internal', 'External', 'Broken'],
    datasets: [
      {
        label: 'Links Distribution',
        data: [internal, external, broken],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)', // синий
          'rgba(255, 206, 86, 0.6)', // желтый
          'rgba(255, 99, 132, 0.6)', // красный
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return <Pie data={data} />;
};
