// Notification types, channel configs, and preference schema

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'new_booking'                       // received by professional
  | 'property_interest'                 // client expressed interest in a real-estate listing (ancien flux)
  | 'interest_booking_received'         // professionnel immobilier reçoit une demande d'intérêt structurée
  | 'interest_submitted'                // client : confirmation d'intérêt enregistré
  | 'payment_failed'
  | 'payment_success'
  | 'new_message'
  | 'review_received'
  | 'review_published'
  | 'review_reply'                      // le professionnel a répondu à l'avis du client
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'subscription_renewal'
  | 'subscription_suspended'
  | 'subscription_upgraded'             // montée en gamme confirmée
  | 'subscription_downgraded'           // rétrogradation programmée
  | 'subscription_reactivated'          // réactivation après paiement des arriérés
  | 'subscription_grace_warning'        // avertissement avant suspension (3 jours restants)
  | 'account_suspended'                 // admin action
  | 'property_approved'                 // admin moderation
  | 'property_rejected'                 // admin moderation
  | 'property_modifications_requested'  // admin moderation
  | 'property_suspended'                // admin moderation
  | 'ticket_status_changed'             // support ticket status update
  | 'ticket_comment_added'              // agent replied to ticket
  | 'collaborator_accepted'             // guest accepted co-manager invitation
  | 'otp_code'                          // always sent via SMS — bypasses prefs
  | 'referral_reward'                   // referrer earns wallet credit when referee completes first booking
  | 'boost_activated'                   // property boost (free or paid) successfully activated
  | 'boost_expiry_reminder'            // rappel 24h avant expiration du boost
  | 'stay_reminder'                    // rappel J-1 au client avant le début du séjour / de la réservation
  | 'booking_dates_updated'            // client a modifié les dates d'une réservation confirmée
  | 'menu_approved'                    // admin moderation — plat validé
  | 'menu_rejected';                   // admin moderation — plat rejeté

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  email: true,
  push: true,
  sms: true,
};

export interface ChannelConfig {
  email: boolean;
  emailTemplateId?: number;
  push: boolean;
  pushPriority: 'high' | 'normal';
  sms: boolean;
  smsCritical: boolean; // if true: sent even when user has disabled SMS
}

// Brevo template IDs are defined in brevo.config.ts
export const CHANNEL_CONFIG: Record<NotificationType, ChannelConfig> = {
  booking_confirmed:        { email: true,  push: true,  pushPriority: 'high',   sms: false, smsCritical: false },
  booking_cancelled:        { email: true,  push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  new_booking:              { email: true,  push: true,  pushPriority: 'high',   sms: true,  smsCritical: false },
  property_interest:              { email: true,  push: true,  pushPriority: 'high',   sms: false, smsCritical: false },
  interest_booking_received:      { email: true,  push: true,  pushPriority: 'high',   sms: true,  smsCritical: false },
  interest_submitted:             { email: true,  push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  payment_failed:           { email: true,  push: true,  pushPriority: 'high',   sms: true,  smsCritical: true  },
  payment_success:          { email: true,  push: true,  pushPriority: 'high',   sms: false, smsCritical: false },
  new_message:              { email: true,  push: true,  pushPriority: 'high',   sms: false, smsCritical: false },
  review_received:          { email: true,  push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  review_published:         { email: false, push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  review_reply:             { email: true,  push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  dispute_opened:           { email: true,  push: true,  pushPriority: 'high',   sms: false, smsCritical: false },
  dispute_resolved:         { email: true,  push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  kyc_approved:             { email: true,  push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  kyc_rejected:             { email: true,  push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  subscription_renewal:         { email: true,  push: false, pushPriority: 'normal', sms: false, smsCritical: false },
  subscription_suspended:       { email: true,  push: true,  pushPriority: 'high',   sms: true,  smsCritical: true  },
  subscription_upgraded:        { email: true,  push: true,  pushPriority: 'high',   sms: false, smsCritical: false },
  subscription_downgraded:      { email: true,  push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  subscription_reactivated:     { email: true,  push: true,  pushPriority: 'high',   sms: false, smsCritical: false },
  subscription_grace_warning:   { email: true,  push: true,  pushPriority: 'high',   sms: true,  smsCritical: false },
  account_suspended:                  { email: true,  push: true,  pushPriority: 'high',   sms: false, smsCritical: false },
  property_approved:                  { email: true,  push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  property_rejected:                  { email: true,  push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  property_modifications_requested:   { email: true,  push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  property_suspended:                 { email: true,  push: true,  pushPriority: 'high',   sms: false, smsCritical: false },
  ticket_status_changed:              { email: true,  push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  ticket_comment_added:               { email: true,  push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  collaborator_accepted:              { email: false, push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  otp_code:                           { email: false, push: false, pushPriority: 'normal', sms: true,  smsCritical: true  },
  referral_reward:                    { email: true,  push: true,  pushPriority: 'high',   sms: false, smsCritical: false },
  boost_activated:                    { email: true,  push: true,  pushPriority: 'high',   sms: false, smsCritical: false },
  boost_expiry_reminder:              { email: true,  push: true,  pushPriority: 'high',   sms: false, smsCritical: false },
  stay_reminder:                      { email: true,  push: true,  pushPriority: 'high',   sms: false, smsCritical: false },
  booking_dates_updated:              { email: false, push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  menu_approved:                      { email: true,  push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
  menu_rejected:                      { email: true,  push: true,  pushPriority: 'normal', sms: false, smsCritical: false },
};

export interface NotifyParams {
  type: NotificationType;
  recipientId: string;
  data: NotificationData;
}

export interface NotificationData {
  // Booking
  bookingId?: string;
  propertyTitle?: string;
  isInterest?: boolean;
  interestMessage?: string;
  startDate?: string;
  endDate?: string;
  totalAmount?: number;
  // Messaging
  senderName?: string;
  messagePreview?: string;
  // Auth
  otpCode?: string;
  // KYC
  reason?: string;
  // Payment
  planName?: string;
  invoiceUrl?: string;
  // Review
  rating?: number;
  // Dispute
  disputeId?: string;
  // Subscription workflow
  previousPlanName?: string;
  newPlanName?: string;
  effectiveDate?: string;
  daysRemaining?: number;
  suspendedCount?: number;
  suspendedTitles?: string;
  // Generic
  title?: string;
  body?: string;
  [key: string]: unknown;
}
