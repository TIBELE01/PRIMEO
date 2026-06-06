'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props { data: { month: string; amount: number }[] }

export function RevenueChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-CI')} FCFA`} />
        <Line type="monotone" dataKey="amount" stroke="#F9A825" strokeWidth={2} dot={{ r: 4 }} name="Revenus" />
      </LineChart>
    </ResponsiveContainer>
  );
}
