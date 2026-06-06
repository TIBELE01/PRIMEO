'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

export default function TwoFactorPage() {
  const { verifyTotp } = useAuth();
  const { requiresTotp } = useAuthStore();
  const toast = useToast();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!requiresTotp) router.push('/login');
    inputRef.current?.focus();
  }, [requiresTotp, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    try {
      await verifyTotp(code);
    } catch {
      toast.error('Code 2FA invalide');
      setCode('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-900">PRIMEO</h1>
          <p className="text-gray-500 mt-1">Vérification en deux étapes</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Code d'authentification</h2>
          <p className="text-sm text-gray-500 mb-6">Entrez le code à 6 chiffres de votre application TOTP.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="input w-full text-center text-2xl tracking-widest font-mono"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            <Button type="submit" loading={loading} disabled={code.length !== 6} className="w-full">
              Vérifier
            </Button>
          </form>
          <button onClick={() => router.push('/login')} className="mt-4 text-sm text-gray-500 hover:text-primary-700 w-full text-center">
            Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
}
