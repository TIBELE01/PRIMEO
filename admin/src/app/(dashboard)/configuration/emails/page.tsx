'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import { Mail, ChevronDown, ChevronUp, Save, Eye } from 'lucide-react';

// Default templates seeded locally if none exist in DB
const DEFAULT_TEMPLATES: Template[] = [
  {
    name: 'booking_confirmation',
    label: 'Confirmation de réservation',
    subject: 'Votre réservation Primeo est confirmée — {{bookingId}}',
    bodyHtml: `<p>Bonjour {{clientName}},</p>
<p>Votre réservation <strong>{{propertyTitle}}</strong> du <strong>{{startDate}}</strong> au <strong>{{endDate}}</strong> est confirmée.</p>
<p>Montant total : <strong>{{totalAmount}} FCFA</strong></p>
<p>Montant payé en ligne : <strong>{{paidOnline}} FCFA</strong></p>
<p>Solde à régler en cash à l'arrivée : <strong>{{remainingCash}} FCFA</strong></p>
<p>Merci de faire confiance à Primeo !</p>`,
    variables: ['clientName', 'propertyTitle', 'startDate', 'endDate', 'totalAmount', 'paidOnline', 'remainingCash', 'bookingId'],
    updatedAt: null,
  },
  {
    name: 'password_reset',
    label: 'Réinitialisation de mot de passe',
    subject: 'Réinitialisation de votre mot de passe Primeo',
    bodyHtml: `<p>Bonjour {{firstName}},</p>
<p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
<p><a href="{{resetLink}}" style="background:#1B5E20;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">Définir un nouveau mot de passe</a></p>
<p>Ce lien expire dans <strong>30 minutes</strong>. Si vous n'avez pas fait cette demande, ignorez cet email.</p>`,
    variables: ['firstName', 'resetLink'],
    updatedAt: null,
  },
  {
    name: 'booking_reminder',
    label: 'Rappel de séjour (J-1)',
    subject: 'Rappel — Votre séjour commence demain',
    bodyHtml: `<p>Bonjour {{clientName}},</p>
<p>Votre séjour à <strong>{{propertyTitle}}</strong> commence demain (<strong>{{startDate}}</strong>).</p>
<p>Adresse : {{propertyAddress}}</p>
<p>Contacts de l'hôte : {{hostPhone}}</p>
<p>À très bientôt !</p>`,
    variables: ['clientName', 'propertyTitle', 'startDate', 'propertyAddress', 'hostPhone'],
    updatedAt: null,
  },
  {
    name: 'invoice',
    label: 'Facture',
    subject: 'Votre facture Primeo n° {{invoiceNumber}}',
    bodyHtml: `<p>Bonjour {{recipientName}},</p>
<p>Veuillez trouver ci-joint votre facture n° <strong>{{invoiceNumber}}</strong> d'un montant de <strong>{{amount}} FCFA</strong>.</p>
<p><a href="{{pdfUrl}}">Télécharger la facture PDF</a></p>`,
    variables: ['recipientName', 'invoiceNumber', 'amount', 'pdfUrl'],
    updatedAt: null,
  },
  {
    name: 'dispute_notification',
    label: 'Notification de litige',
    subject: 'Un litige a été ouvert concernant votre réservation',
    bodyHtml: `<p>Bonjour {{recipientName}},</p>
<p>Un litige a été ouvert concernant la réservation <strong>{{bookingId}}</strong>.</p>
<p>Motif : <em>{{reason}}</em></p>
<p>Notre équipe prendra contact avec vous sous 48h. Vous pouvez suivre l'avancement dans votre espace Primeo.</p>`,
    variables: ['recipientName', 'bookingId', 'reason'],
    updatedAt: null,
  },
  {
    name: 'subscription_renewal',
    label: 'Renouvellement d\'abonnement',
    subject: 'Votre abonnement Primeo a été renouvelé',
    bodyHtml: `<p>Bonjour {{professionalName}},</p>
<p>Votre abonnement <strong>{{planName}}</strong> a été renouvelé avec succès pour un montant de <strong>{{amount}} FCFA</strong>.</p>
<p>Prochaine date de facturation : <strong>{{nextBillingDate}}</strong></p>`,
    variables: ['professionalName', 'planName', 'amount', 'nextBillingDate'],
    updatedAt: null,
  },
];

interface Template {
  name: string;
  label: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
  updatedAt: string | null;
}

function TemplateEditor({ template, onSave, saving }: {
  template: Template;
  onSave: (data: Pick<Template, 'subject' | 'bodyHtml'>) => void;
  saving: boolean;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.bodyHtml);
  const [showPreview, setShowPreview] = useState(false);

  const isDirty = subject !== template.subject || bodyHtml !== template.bodyHtml;

  return (
    <div className="space-y-3 pt-4">
      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Objet de l'email</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input w-full"
        />
      </div>

      {/* Body */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Corps HTML</label>
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="flex items-center gap-1 text-xs text-primary-700 hover:text-primary-900"
          >
            <Eye size={12} />
            {showPreview ? 'Masquer aperçu' : 'Aperçu rendu'}
          </button>
        </div>
        <textarea
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          rows={10}
          className="input w-full font-mono text-xs resize-y"
          spellCheck={false}
        />
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <p className="text-xs text-gray-400 mb-2">Aperçu (HTML rendu)</p>
          <div
            className="prose prose-sm max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>
      )}

      {/* Variables reminder */}
      <div>
        <p className="text-xs text-gray-400 mb-1">Variables disponibles :</p>
        <div className="flex flex-wrap gap-1">
          {template.variables.map((v) => (
            <span key={v} className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
              {`{{${v}}}`}
            </span>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          size="sm"
          leftIcon={<Save size={14} />}
          loading={saving}
          disabled={!isDirty}
          onClick={() => onSave({ subject, bodyHtml })}
        >
          Sauvegarder
        </Button>
      </div>
    </div>
  );
}

export default function EmailTemplatesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [savingName, setSavingName] = useState<string | null>(null);

  const { data: dbTemplates, isLoading } = useQuery<any[]>({
    queryKey: ['email-templates'],
    queryFn: configService.getEmailTemplates,
  });

  // Merge DB templates over defaults
  const templates: Template[] = DEFAULT_TEMPLATES.map((def) => {
    const db = dbTemplates?.find((t: any) => t.name === def.name);
    if (db) {
      return {
        ...def,
        subject: db.subject ?? def.subject,
        bodyHtml: db.bodyHtml ?? def.bodyHtml,
        updatedAt: db.updatedAt ?? null,
      };
    }
    return def;
  });

  const handleSave = async (name: string, data: Pick<Template, 'subject' | 'bodyHtml'>) => {
    const tpl = templates.find((t) => t.name === name)!;
    setSavingName(name);
    try {
      await configService.updateEmailTemplate(name, { ...data, variables: tpl.variables });
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template sauvegardé');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSavingName(null);
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Mail size={22} className="text-primary-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates d'emails transactionnels</h1>
          <p className="text-sm text-gray-500">Personnalisez les emails envoyés automatiquement via Brevo</p>
        </div>
      </div>

      <div className="space-y-2">
        {templates.map((tpl) => (
          <Card key={tpl.name} padding={false} className="overflow-hidden">
            <button
              onClick={() => setExpanded((e) => e === tpl.name ? null : tpl.name)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-gray-400 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{tpl.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{tpl.name}</p>
                </div>
                {tpl.updatedAt && (
                  <Badge variant="info" className="ml-2">
                    Modifié le {formatDate(tpl.updatedAt)}
                  </Badge>
                )}
              </div>
              {expanded === tpl.name
                ? <ChevronUp size={16} className="text-gray-400 shrink-0" />
                : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
            </button>

            {expanded === tpl.name && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <TemplateEditor
                  key={tpl.name + (tpl.updatedAt ?? '')}
                  template={tpl}
                  onSave={(data) => handleSave(tpl.name, data)}
                  saving={savingName === tpl.name}
                />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
