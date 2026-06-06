'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props { data: { sector: string; amount: number }[] }

const COLORS = ['#1B5E20', '#2E7D32', '#388E3C', '#F9A825'];

export function CommissionChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="amount" nameKey="sector" cx="50%" cy="50%" outerRadius={80} label={({ sector, percent }) => `${sector} ${(percent * 100).toFixed(0)}%`}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-CI')} FCFA`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
