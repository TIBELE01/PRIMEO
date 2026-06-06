'use client';
import { PieChart as RechartsPie, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PieData { name: string; value: number }
interface Props { data: PieData[]; colors?: string[]; height?: number }

const DEFAULT_COLORS = ['#1B5E20', '#2E7D32', '#388E3C', '#F9A825', '#F57F17'];

export function PieChartWidget({ data, colors = DEFAULT_COLORS, height = 220 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPie>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </RechartsPie>
    </ResponsiveContainer>
  );
}
