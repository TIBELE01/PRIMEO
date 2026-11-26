'use client';
// Sécurité du compte administrateur : activation de la double authentification
// (TOTP). Utilise les routes existantes de l'API (/users/me/2fa/setup et /confirm) ;
// une fois activée, chaque connexion à l'admin demande le code à 6 chiffres.
import { useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { ShieldCheck } from 'lucide-react';

interface SetupResult { secret: string; qrCode: string }

export default function AccountSecurityPage() {
  const toast = useToast();
  const [setup, setSetup] = useState<SetupResult | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    setInfo(null);
    try {
      setSetup(await api.post<SetupResult>('/users/me/2fa/setup'));
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error ?? err?.response?.data?.message;
      if (status === 409) setInfo('La double authentification est déjà activée sur ce compte.');
      else toast.error(msg ?? 'Impossible de démarrer l’activation');
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!/^\d{6}$/.test(code)) { toast.error('Saisissez le code à 6 chiffres affiché par l’application'); return; }
    setLoading(true);
    try {
      await api.post('/users/me/2fa/confirm', { token: code });
      setDone(true);
      setSetup(null);
      toast.success('Double authentification activée');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Code incorrect, réessayez');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sécurité du compte</h1>
        <p className="text-sm text-gray-500">Double authentification (2FA) de votre compte administrateur.</p>
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-primary-600 shrink-0 mt-0.5" size={22} />
          <div className="space-y-3 w-full">
            {done ? (
              <p className="text-sm text-green-700 font-medium">
                La double authentification est active. À chaque connexion, le code de votre application
                d’authentification vous sera demandé.
              </p>
            ) : info ? (
              <p className="text-sm text-gray-700">{info}</p>
            ) : !setup ? (
              <>
                <p className="text-sm text-gray-700">
                  Protégez l’accès à l’administration : en plus du mot de passe, un code à 6 chiffres généré
                  par une application d’authentification (Google Authenticator, Microsoft Authenticator, Authy…)
                  sera demandé à chaque connexion.
                </p>
                <Button onClick={start} loading={loading}>Activer la double authentification</Button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-700">
                  1. Scannez ce QR code avec votre application d’authentification
                  (ou saisissez la clé manuellement).
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={setup.qrCode} alt="QR code de configuration 2FA" width={180} height={180} className="rounded-lg border border-gray-200" />
                <p className="text-xs text-gray-500 break-all">Clé : <span className="font-mono">{setup.secret}</span></p>
                <p className="text-sm text-gray-700">2. Saisissez le code à 6 chiffres affiché par l’application.</p>
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    className="input w-36 font-mono tracking-widest"
                    aria-label="Code à 6 chiffres"
                  />
                  <Button onClick={confirm} loading={loading}>Confirmer</Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
