'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      toast.error('Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://res.cloudinary.com/dlnnxvepd/image/upload/c_pad,b_transparent,w_240,h_240/v1782345787/Logo_Primeo_1_gzcjq2.png"
            alt="Primeo"
            className="h-12 w-auto mx-auto mb-3"
          />
          <p className="text-gray-500 mt-1">Administration</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Connexion</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="input w-full" placeholder="admin@primeo.ci" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="input w-full" placeholder="••••••••" />
            </div>
            <Button type="submit" loading={loading} className="w-full">Se connecter</Button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Accès réservé aux administrateurs PRIMEO</p>
      </div>
    </div>
  );
}
