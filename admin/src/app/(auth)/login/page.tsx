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
          <span className="inline-flex items-center justify-center rounded-2xl bg-white p-3 shadow-sm border border-gray-100 mb-3">
            <img
              src="https://res.cloudinary.com/dlnnxvepd/image/upload/e_trim/c_fit,w_240,h_240,f_png/v1795644228/primeo_logo_z7suoi.png"
              alt="Primeo"
              className="h-10 w-auto"
            />
          </span>
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
