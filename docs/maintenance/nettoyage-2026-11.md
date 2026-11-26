# Nettoyage du dépôt — novembre 2026

Réorganisation et nettoyage validés par le responsable du projet. Aucun comportement applicatif modifié : chaque élément supprimé n'était chargé, importé ni appelé par aucun code en service.

Vérifications après nettoyage : compilation TypeScript (backend 0 erreur, admin 0 erreur, mobile inchangé), tests backend 996/996, admin 24/24, mobile 178/178, aucun lien Markdown cassé.

## 1. Réorganisation (aucune suppression)

| Avant | Après |
|---|---|
| `Contexte.MD` | `docs/presentation/contexte-primeo.md` |
| `k6/search-load.test.js` | `tests/load/k6/search-load.test.js` |
| `load-tests/README.md` | `tests/load/README.md` |
| `load-tests/search.load.js` | `tests/load/search.load.js` |
| `docs/AUTHENTIFICATION.md` | `docs/architecture/AUTHENTIFICATION.md` |
| `docs/RLS.md` | `docs/architecture/RLS.md` |
| `docs/RUNBOOK-PAIEMENT-LIVE.md` | `docs/operations/RUNBOOK-PAIEMENT-LIVE.md` |
| `docs/COMMUNICATION-NORASEND.md` | `docs/operations/COMMUNICATION-NORASEND.md` |
| `docs/ACCESSIBILITY.md` | `docs/guides/ACCESSIBILITY.md` |
| `docs/E2E-DETOX.md` | `docs/guides/E2E-DETOX.md` |
| `docs/vitrine-README.md` | `docs/sites/vitrine.md` |
| `docs/vitrine-API.md` | `docs/sites/vitrine-api.md` |
| `docs/legal-site-README.md` | `docs/sites/site-legal.md` |

Liens mis à jour : workflows CI (`ci-backend.yml`, `load-test.yml`, `ci-mobile.yml`), `mobile/.detoxrc.js`, `mobile/e2e/complete-flow.test.js`, README des tests de charge, arborescence du README principal, lien interne de `docs/sites/vitrine.md`.

## 2. Code jamais importé (225 fichiers)

Raison commune : aucun fichier en service ne les importe (analyse knip + vérification manuelle). Impact : aucun.

### backend (76)

| Fichier | Lignes | Rôle |
|---|---|---|
| `backend/src/config/app.config.ts` | 21 | General application configuration |
| `backend/src/config/database.config.ts` | 9 | Prisma client configuration and connection settings |
| `backend/src/config/sentry.config.ts` | 13 | Sentry error tracking — lazy-loaded only when DSN is configured |
| `backend/src/jobs/invoice-generator.job.ts` | 3 | Invoice generation is handled inside subscription.job.ts at renewal time. |
| `backend/src/common/constants/amenities.ts` | 30 | Standard amenities list for property listings |
| `backend/src/common/constants/booking-status.ts` | 18 | Booking lifecycle states |
| `backend/src/common/constants/errors.ts` | 41 | Application-level error codes for consistent API error responses |
| `backend/src/common/constants/payment-options.ts` | 14 | Booking payment options — three models supported by Genius Pay |
| `backend/src/common/constants/property-types.ts` | 31 | Property/listing types covering the four business sectors |
| `backend/src/database/repositories/property.repository.ts` | 38 | Property repository — DB operations for listings across all sectors |
| `backend/src/database/repositories/user.repository.ts` | 29 | User repository — thin wrapper over Prisma for user-related DB operations |
| `backend/src/modules/messaging/messaging.socket.ts` | 2 | Legacy socket path — re-exports from socket.server.ts for backward compatibility |
| `backend/src/modules/admin/dto/manage-user.dto.ts` | 15 | DTOs for admin user management actions |
| `backend/src/modules/admin/dto/moderate-property.dto.ts` | 7 | DTOs for admin property moderation |
| `backend/src/modules/admin/dto/platform-config.dto.ts` | 8 | DTOs for platform-level configuration (admin only) |
| `backend/src/modules/admin/middlewares/admin.middleware.ts` | 4 | Admin middleware — ensures the user has admin role |
| `backend/src/modules/analytics/aggregators/occupancy.aggregator.ts` | 26 | Occupancy aggregator — booking occupancy rate for a property over a date range |
| `backend/src/modules/analytics/aggregators/revenue.aggregator.ts` | 16 | Revenue aggregator — computes platform revenue for a given period |
| `backend/src/modules/auth/dto/change-password.dto.ts` | 2 | Re-exported from users module's consolidated DTO |
| `backend/src/modules/auth/dto/forgot-password.dto.ts` | 2 | Re-exported from the consolidated auth.dto |
| `backend/src/modules/auth/dto/login.dto.ts` | 2 | Re-exported from the consolidated auth.dto |
| `backend/src/modules/auth/dto/otp-verify.dto.ts` | 2 | Re-exported from the consolidated auth.dto |
| `backend/src/modules/auth/dto/register.dto.ts` | 2 | Re-exported from the consolidated auth.dto |
| `backend/src/modules/auth/dto/reset-password.dto.ts` | 2 | Re-exported from the consolidated auth.dto |
| `backend/src/modules/auth/dto/two-factor.dto.ts` | 2 | Re-exported from the consolidated auth.dto |
| `backend/src/modules/availabilities/dto/block-dates.dto.ts` | 2 | Re-exported from consolidated availability.dto |
| `backend/src/modules/availabilities/dto/update-availability.dto.ts` | 2 | Re-exported from consolidated availability.dto |
| `backend/src/modules/bookings/dto/cancel-booking.dto.ts` | 2 | Re-exported from consolidated booking.dto |
| `backend/src/modules/bookings/dto/create-booking.dto.ts` | 2 | Re-exported from consolidated booking.dto |
| `backend/src/modules/bookings/dto/update-booking.dto.ts` | 8 | Partial update DTO for bookings (e.g., special requests) |
| `backend/src/modules/bookings/entities/booking.entity.ts` | 4 | Booking entity — mirrors the Prisma Booking model |
| `backend/src/modules/bookings/entities/hotel-booking.entity.ts` | 6 | Hotel booking entity — includes property details for hôtellerie sector |
| `backend/src/modules/bookings/entities/restaurant-booking.entity.ts` | 6 | Restaurant booking entity — covers table reservation context |
| `backend/src/modules/boosts/jobs/boost-expiration.job.ts` | 3 | Boost expiration job (module-level) — delegates to the global job registry |
| `backend/src/modules/currencies/dto/get-rates.dto.ts` | 2 | Placeholder — no request body for GET /rates |
| `backend/src/modules/disputes/dto/open-dispute.dto.ts` | 2 | Re-exported from consolidated dispute.dto |
| `backend/src/modules/disputes/dto/resolve-dispute.dto.ts` | 2 | Re-exported from admin module's DTO |
| `backend/src/modules/disputes/entities/dispute.entity.ts` | 3 | Dispute entity — mirrors the Prisma Dispute model |
| `backend/src/modules/favorites/dto/add-favorite.dto.ts` | 7 | DTO for adding a property to favorites |
| `backend/src/modules/favorites/dto/create-list.dto.ts` | 8 | DTO for creating a named favorites list (future feature) |
| `backend/src/modules/media/providers/cloudinary.provider.ts` | 3 | Cloudinary provider — re-exports the shared upload/delete helpers |
| `backend/src/modules/messaging/dto/mark-read.dto.ts` | 7 | DTO for marking booking messages as read |
| `backend/src/modules/messaging/dto/send-message.dto.ts` | 8 | DTO for REST send-message (primary path is Socket.io) |
| `backend/src/modules/notifications/providers/email.provider.ts` | 23 | Email notification provider — wraps the Brevo mailer utility |
| `backend/src/modules/notifications/providers/sms.provider.ts` | 16 | SMS notification provider — wraps the Orange SMS client |
| `backend/src/modules/payments/dto/initiate-payment.dto.ts` | 2 | Re-exported from consolidated payment.dto |
| `backend/src/modules/payments/dto/payment-callback.dto.ts` | 15 | Genius Pay webhook callback payload type |
| `backend/src/modules/professional/dto/create-kyc.dto.ts` | 2 | Re-exported from consolidated professional.dto |
| `backend/src/modules/professional/dto/update-kyc.dto.ts` | 2 | DTO de mise à jour KYC — re-soumission après rejet (réutilise le DTO consolidé) |
| `backend/src/modules/promos/dto/create-promo.dto.ts` | 2 | Re-exported from consolidated promo.dto |
| `backend/src/modules/promos/dto/validate-promo.dto.ts` | 2 | Re-exported from consolidated promo.dto |
| `backend/src/modules/properties/dto/create-property.dto.ts` | 2 | Re-exported from consolidated property.dto |
| `backend/src/modules/properties/dto/search-properties.dto.ts` | 2 | Re-exported from consolidated property.dto |
| `backend/src/modules/properties/dto/update-property.dto.ts` | 2 | Re-exported from consolidated property.dto |
| `backend/src/modules/properties/entities/hotel-property.entity.ts` | 3 | Hotel property entity — hôtellerie-specific view |
| `backend/src/modules/properties/entities/property.entity.ts` | 4 | Property entity — mirrors the Prisma Property model |
| `backend/src/modules/properties/entities/real-estate-property.entity.ts` | 3 | Real estate property entity — immobilier-specific view |
| `backend/src/modules/properties/entities/residence-property.entity.ts` | 3 | Residence property entity — hébergement-specific view |
| `backend/src/modules/properties/entities/restaurant-property.entity.ts` | 3 | Restaurant property entity — restauration-specific view |
| `backend/src/modules/properties/services/calendar.service.ts` | 13 | Calendar service — monthly availability view for a property |
| `backend/src/modules/properties/services/scoring.service.ts` | 17 | Scoring service — computes property ranking score for search result ordering |
| `backend/src/modules/referrals/dto/create-referral.dto.ts` | 7 | DTO for applying a referral code during registration |
| `backend/src/modules/reviews/dto/create-review.dto.ts` | 2 | Re-exported from consolidated review.dto |
| `backend/src/modules/reviews/dto/respond-review.dto.ts` | 2 | Re-exported from consolidated review.dto |
| `backend/src/modules/reviews/entities/review.entity.ts` | 3 | Review entity — mirrors the Prisma Review model |
| `backend/src/modules/subscriptions/dto/create-subscription.dto.ts` | 7 | DTO for initial subscription creation (Essentiel is auto-created on KYC approval) |
| `backend/src/modules/subscriptions/dto/upgrade-plan.dto.ts` | 2 | Re-exported from consolidated subscription.dto |
| `backend/src/modules/subscriptions/jobs/invoice-generator.job.ts` | 2 | Invoice generation is integrated into the subscription renewal job. |
| `backend/src/modules/subscriptions/jobs/subscription-cron.job.ts` | 3 | Subscription cron job (module-level) — delegates to the global job registry |
| `backend/src/modules/support/dto/create-ticket.dto.ts` | 2 | Re-exported from consolidated support.dto |
| `backend/src/modules/support/tickets/ticket.entity.ts` | 3 | Support ticket entity — mirrors the Prisma SupportTicket model |
| `backend/src/modules/support/tickets/ticket.service.ts` | 2 | Ticket service (module-level alias) — re-exports from the main support service |
| `backend/src/modules/users/dto/change-password.dto.ts` | 2 | Re-exported from consolidated users.dto |
| `backend/src/modules/users/dto/create-user.dto.ts` | 2 | Create user DTO — registration flows use auth.dto directly |
| `backend/src/modules/users/dto/update-user.dto.ts` | 2 | Re-exported from consolidated users.dto |
| `backend/src/modules/users/entities/user.entity.ts` | 6 | User entity — TypeScript type mirroring the Prisma User model |

### admin (14)

| Fichier | Lignes | Rôle |
|---|---|---|
| `admin/src/hooks/useDataTable.ts` | 53 | useDataTable: pagination, sorting, filtering state for data tables |
| `admin/src/lib/validators.ts` | 10 | Form validators for admin dashboard |
| `admin/src/components/charts/BarChart.tsx` | 24 | définit `BarChartWidget` |
| `admin/src/components/charts/LineChart.tsx` | 24 | définit `LineChartWidget` |
| `admin/src/components/charts/PieChart.tsx` | 21 | définit `PieChartWidget` |
| `admin/src/components/forms/ConfigForm.tsx` | 50 | définit `ConfigForm` |
| `admin/src/components/layout/MobileMenu.tsx` | 27 | définit `MobileMenu` |
| `admin/src/components/tables/BookingsTable.tsx` | 21 | définit `BookingsTable` |
| `admin/src/components/tables/DisputesTable.tsx` | 23 | définit `DisputesTable` |
| `admin/src/components/tables/PropertiesTable.tsx` | 24 | définit `PropertiesTable` |
| `admin/src/components/tables/UsersTable.tsx` | 29 | définit `UsersTable` |
| `admin/src/app/(dashboard)/analytics/components/BookingsChart.tsx` | 18 | définit `BookingsChart` |
| `admin/src/app/(dashboard)/analytics/components/CommissionChart.tsx` | 20 | définit `CommissionChart` |
| `admin/src/app/(dashboard)/analytics/components/RevenueChart.tsx` | 18 | définit `RevenueChart` |

### mobile (135)

| Fichier | Lignes | Rôle |
|---|---|---|
| `mobile/src/constants/amenities.ts` | 50 | Amenity list with icon names (Ionicons compatible) |
| `mobile/src/constants/countries.ts` | 17 | countries: list of African countries with dial codes for phone input |
| `mobile/src/constants/routes.ts` | 51 | Route name constants — single source of truth for all screen names |
| `mobile/src/hooks/useAppState.ts` | 14 | useAppState: listen to React Native AppState changes (foreground/background) |
| `mobile/src/hooks/useBooking.ts` | 23 | useBooking: fetch and manage bookings for the current user |
| `mobile/src/hooks/useFeatureFlags.ts` | 68 | Hook feature flags — récupère les flags depuis l'API et met en cache 60s |
| `mobile/src/hooks/useInfiniteScroll.ts` | 30 | useInfiniteScroll: manages paginated list data with load-more support |
| `mobile/src/hooks/useKeyboard.ts` | 22 | useKeyboard: tracks keyboard visibility and height |
| `mobile/src/hooks/useMessages.ts` | 25 | useMessages: subscribe to chat messages for a specific booking |
| `mobile/src/hooks/useProperties.ts` | 24 | useProperties: search and filter properties from propertiesStore |
| `mobile/src/hooks/useSocket.ts` | 20 | useSocket: exposes the shared socket instance and connection status |
| `mobile/src/hooks/useTheme.ts` | 3 | useTheme — re-export from ThemeProvider for cleaner import paths |
| `mobile/src/i18n/index.ts` | 41 | i18n setup — react-i18next, langue persistée (AsyncStorage), repli appareil → fr |
| `mobile/src/i18n/resources.ts` | 222 | i18n resource map — French (fr) and English (en) |
| `mobile/src/navigation/AuthStack.tsx` | 29 | Auth stack — screens accessible before authentication |
| `mobile/src/navigation/ClientStack.tsx` | 87 | Client navigation stack — all client-facing screens |
| `mobile/src/services/notifications.ts` | 2 | Push notifications facade — re-exports from the notification service |
| `mobile/src/services/socket.ts` | 2 | Socket.io client facade — re-exports from the socket service module |
| `mobile/src/store/bookingsStore.ts` | 31 | Bookings list and selected booking state (Zustand) |
| `mobile/src/store/propertiesStore.ts` | 31 | Properties search results and detail cache (Zustand) |
| `mobile/src/store/uiStore.ts` | 30 | UI state — loading overlays, toast messages, theme (Zustand) |
| `mobile/src/types/api.ts` | 34 | ApiResponse, PaginatedResponse, ApiError types |
| `mobile/src/types/booking.ts` | 62 | Booking, BookingStatus, PaymentOption types |
| `mobile/src/types/message.ts` | 28 | Message, Conversation types |
| `mobile/src/types/navigation.ts` | 12 | Navigation prop types — re-exports from navigation/types.ts |
| `mobile/src/types/theme.ts` | 2 | Theme type exports — single source of truth |
| `mobile/src/types/user.ts` | 48 | User, UserRole, AuthResponse types |
| `mobile/src/components/booking/BookingCard.tsx` | 76 | définit `BookingCard` |
| `mobile/src/components/booking/BookingConfirmationCard.tsx` | 34 | BookingConfirmationCard: success card shown after booking is confirmed |
| `mobile/src/components/booking/BookingStatusBadge.tsx` | 34 | définit `BookingStatusBadge` |
| `mobile/src/components/booking/BookingSummary.tsx` | 34 | BookingSummary: detailed cost summary shown before payment |
| `mobile/src/components/booking/CancellationPolicy.tsx` | 22 | CancellationPolicy: displays the property cancellation policy text |
| `mobile/src/components/booking/PriceBreakdown.tsx` | 28 | PriceBreakdown: itemized price line component |
| `mobile/src/components/boost/BoostBadge.tsx` | 22 | BoostBadge: flame icon badge shown on boosted property cards |
| `mobile/src/components/boost/BoostCard.tsx` | 35 | BoostCard: card for purchasing or viewing a property boost |
| `mobile/src/components/boost/BoostTimer.tsx` | 30 | BoostTimer: countdown timer showing remaining time on an active boost |
| `mobile/src/components/chat/ChatHeader.tsx` | 34 | ChatHeader: top bar showing conversation participant name and online status |
| `mobile/src/components/chat/ChatInput.tsx` | 42 | ChatInput: message composer bar with send button |
| `mobile/src/components/chat/ChatMessageStatus.tsx` | 15 | ChatMessageStatus: sent / delivered / read checkmark indicator |
| `mobile/src/components/chat/ConversationItem.tsx` | 95 | définit `ConversationItem` |
| `mobile/src/components/chat/MessageBubble.tsx` | 52 | définit `MessageBubble` |
| `mobile/src/components/chat/QuickReplyButton.tsx` | 21 | QuickReplyButton: tappable suggestion chip to pre-fill the message input |
| `mobile/src/components/chat/TypingIndicator.tsx` | 32 | TypingIndicator: animated dots shown when the other party is typing |
| `mobile/src/components/common/ErrorFallback.tsx` | 32 | ErrorFallback: shown by ErrorBoundary when an unhandled error occurs |
| `mobile/src/components/common/LanguageSelector.tsx` | 37 | LanguageSelector: dropdown to switch app language (fr / en) |
| `mobile/src/components/common/LoadingOverlay.tsx` | 72 | définit `LoadingOverlay` |
| `mobile/src/components/common/OfflineIndicator.tsx` | 14 | OfflineIndicator: small badge shown in the header when offline |
| `mobile/src/components/common/PressableScale.tsx` | 37 | définit `PressableScale` |
| `mobile/src/components/common/Shimmer.tsx` | 53 | définit `Shimmer` |
| `mobile/src/components/common/ThemeToggle.tsx` | 24 | ThemeToggle: switch between light and dark theme |
| `mobile/src/components/common/ToastProvider.tsx` | 29 | ToastProvider: renders floating toast notifications from uiStore queue |
| `mobile/src/components/dashboard/ChartCard.tsx` | 22 | ChartCard: wrapper card for chart components (revenue, occupancy) |
| `mobile/src/components/dashboard/MetricCard.tsx` | 25 | MetricCard: single numeric metric with optional sparkline |
| `mobile/src/components/dashboard/StatsCard.tsx` | 30 | StatsCard: revenue / occupancy stats summary card |
| `mobile/src/components/form/FormError.tsx` | 14 | FormError: standalone error message block for form-level errors |
| `mobile/src/components/form/FormInput.tsx` | 60 | définit `FormInput` |
| `mobile/src/components/form/FormWrapper.tsx` | 20 | FormWrapper: scroll container for multi-field forms with keyboard avoidance |
| `mobile/src/components/form/ImageUploader.tsx` | 115 | ImageUploader: grid picker for multiple property photos using expo-image-picker |
| `mobile/src/components/form/PhoneInput.tsx` | 34 | PhoneInput: phone number input with country code prefix |
| `mobile/src/components/layout/FilterBar.tsx` | 37 | FilterBar: horizontal scrollable filter chip row for search/list screens |
| `mobile/src/components/layout/Footer.tsx` | 15 | Footer: bottom navigation bar with tab buttons |
| `mobile/src/components/layout/Header.tsx` | 56 | définit `Header` |
| `mobile/src/components/layout/SafeAreaWrapper.tsx` | 17 | SafeAreaWrapper: thin wrapper around SafeAreaView that applies theme background |
| `mobile/src/components/layout/SearchBar.tsx` | 80 | définit `SearchBar` |
| `mobile/src/components/layout/SortBar.tsx` | 34 | SortBar: sort order selector row |
| `mobile/src/components/layout/TabBar.tsx` | 36 | TabBar: custom bottom tab bar component |
| `mobile/src/components/modals/ConfirmationModal.tsx` | 42 | ConfirmationModal: yes/no dialog for destructive actions |
| `mobile/src/components/modals/ErrorModal.tsx` | 33 | ErrorModal: displays API or app errors in a modal dialog |
| `mobile/src/components/modals/FilterBottomSheet.tsx` | 38 | FilterBottomSheet: bottom sheet with search/filter controls |
| `mobile/src/components/modals/LoadingModal.tsx` | 25 | LoadingModal: blocking modal with spinner for long operations |
| `mobile/src/components/modals/SortBottomSheet.tsx` | 40 | SortBottomSheet: bottom sheet for selecting sort order |
| `mobile/src/components/modals/SuccessModal.tsx` | 43 | SuccessModal: success confirmation overlay with animation |
| `mobile/src/components/navigation/BackButton.tsx` | 18 | BackButton: left-arrow button for navigation headers |
| `mobile/src/components/navigation/DrawerButton.tsx` | 19 | DrawerButton: hamburger button to open the navigation drawer |
| `mobile/src/components/navigation/NavigationHeader.tsx` | 27 | NavigationHeader: custom header bar with title and optional left/right actions |
| `mobile/src/components/navigation/TabButton.tsx` | 31 | TabButton: single tab bar item with icon and label |
| `mobile/src/components/property/AmenityIcon.tsx` | 21 | AmenityIcon: icon + label chip for a single amenity |
| `mobile/src/components/property/HorizontalPropertyList.tsx` | 43 | HorizontalPropertyList: horizontally scrolling property card row for Home screen |
| `mobile/src/components/property/PropertyFeaturesList.tsx` | 25 | PropertyFeaturesList: grid of property feature chips (beds, baths, area, etc.) |
| `mobile/src/components/property/PropertyHostCard.tsx` | 36 | PropertyHostCard: host profile snippet shown on property detail |
| `mobile/src/components/property/PropertyMap.tsx` | 25 | PropertyMap: static map view using Geoapify static map API |
| `mobile/src/components/property/PropertyReviewsList.tsx` | 25 | PropertyReviewsList: aperçu (3 avis max) destiné à une page déjà défilante |
| `mobile/src/components/property/PropertyRulesList.tsx` | 21 | PropertyRulesList: house rules shown on property detail |
| `mobile/src/components/property/VirtualTourButton.tsx` | 67 | VirtualTourButton — CTA that launches the 3D panorama viewer. |
| `mobile/src/components/referral/ReferralCodeCard.tsx` | 33 | ReferralCodeCard: displays the user's referral code with copy button |
| `mobile/src/components/referral/ShareReferralButton.tsx` | 26 | ShareReferralButton: opens native share sheet with referral link |
| `mobile/src/components/review/ReviewCard.tsx` | 63 | définit `ReviewCard` |
| `mobile/src/components/review/ReviewForm.tsx` | 43 | ReviewForm: star rating + comment textarea for submitting a review |
| `mobile/src/components/review/ReviewResponse.tsx` | 24 | ReviewResponse: professional's reply shown under a review |
| `mobile/src/components/review/ReviewStars.tsx` | 24 | ReviewStars: static star display for quick rating visualization |
| `mobile/src/components/search/MiniCalendar.tsx` | 240 | Calendrier visuel pour sélectionner une plage de dates (arrivée → départ). |
| `mobile/src/components/skeleton/ChatSkeleton.tsx` | 30 | ChatSkeleton: placeholder bubbles while chat messages load |
| `mobile/src/components/skeleton/DetailSkeleton.tsx` | 27 | DetailSkeleton: skeleton layout for property/booking detail screens |
| `mobile/src/components/skeleton/ListSkeleton.tsx` | 12 | ListSkeleton: stacked row skeletons for list screens |
| `mobile/src/components/skeleton/PropertyCardSkeleton.tsx` | 76 | définit `PropertyCardSkeleton` |
| `mobile/src/components/subscription/InvoiceCard.tsx` | 39 | InvoiceCard: invoice list item with download button |
| `mobile/src/components/subscription/SubscriptionStatusBadge.tsx` | 31 | SubscriptionStatusBadge: badge coloré indiquant la formule d'abonnement |
| `mobile/src/components/ui/Avatar.tsx` | 47 | User avatar with image or initials fallback |
| `mobile/src/components/ui/Badge.tsx` | 22 | Status badge with color variants |
| `mobile/src/components/ui/Card.tsx` | 39 | Base card container — premium layered shadow, clean border |
| `mobile/src/components/ui/Chip.tsx` | 32 | Selectable chip for filters and tags |
| `mobile/src/components/ui/Divider.tsx` | 17 | Divider: thin horizontal line for visual separation |
| `mobile/src/components/ui/EmptyState.tsx` | 31 | Empty state with icon, title, and optional CTA |
| `mobile/src/components/ui/ErrorBoundary.tsx` | 35 | React error boundary — catches rendering errors and shows a fallback UI |
| `mobile/src/components/ui/Icon.tsx` | 30 | Icon: thin wrapper around @expo/vector-icons Ionicons |
| `mobile/src/components/ui/Input.tsx` | 92 | Text input — animated focus glow, modern premium style, error feedback |
| `mobile/src/components/ui/Loader.tsx` | 20 | Loader — full-screen spinner shown during auth state resolution |
| `mobile/src/components/ui/Modal.tsx` | 26 | Generic modal wrapper with backdrop |
| `mobile/src/components/ui/RatingStars.tsx` | 53 | Star rating display (read-only or interactive) |
| `mobile/src/components/ui/Skeleton.tsx` | 46 | Skeleton shimmer — animated loading placeholder with shimmer wave |
| `mobile/src/components/ui/TabBarIcon.tsx` | 13 | TabBarIcon: icon component for bottom tab navigator tabs |
| `mobile/src/components/ui/Toast.tsx` | 23 | Toast notification component |
| `mobile/src/screens/common/KycStatusScreenBase.tsx` | 210 | Écran Statut KYC partagé — affiche l'état de vérification et permet la (re)soumission |
| `mobile/src/screens/common/LegalScreen.tsx` | 91 | LegalScreen: affiche le centre légal (https://legal.primeo.ci) dans une WebView. |
| `mobile/src/screens/common/NotFoundScreen.tsx` | 25 | NotFoundScreen: 404 fallback screen |
| `mobile/src/screens/common/OnboardingScreen.tsx` | 245 | définit `OnboardingScreen` |
| `mobile/src/screens/common/SettingsScreen.tsx` | 28 | SettingsScreen: app settings (language, notifications, theme) |
| `mobile/src/services/api/interceptors.ts` | 4 | Axios interceptors — JWT attachment and 401 refresh handled in client.ts |
| `mobile/src/services/notifications/localNotifications.ts` | 34 | localNotifications: schedule and cancel local notifications via expo-notifications |
| `mobile/src/services/offline/cache.ts` | 32 | cache: AsyncStorage-backed offline data cache for properties and bookings |
| `mobile/src/services/utils/currencyConverter.ts` | 15 | currencyConverter: converts amounts between XOF and other currencies |
| `mobile/src/services/utils/formatters.ts` | 23 | formatters: date, price, and string formatting utilities |
| `mobile/src/services/utils/geo.ts` | 22 | geo: geolocation utilities (distance calculation, coordinate helpers) |
| `mobile/src/services/utils/permissions.ts` | 27 | permissions: request and check device permissions |
| `mobile/src/services/utils/validators.ts` | 27 | validators: form field validation helpers |
| `mobile/src/screens/client/Favorites/FavoritesList.tsx` | 34 | FavoritesList: scrollable list of favorited properties |
| `mobile/src/screens/client/Home/CategoryCard.tsx` | 25 | CategoryCard: tappable category grid item on the Home screen |
| `mobile/src/screens/client/MyBookings/BookingCard.tsx` | 28 | BookingCard (MyBookings): compact booking row for the MyBookings list |
| `mobile/src/screens/client/Search/SearchBar.tsx` | 30 | SearchBar (Search screen): local search bar with debounced query |
| `mobile/src/services/api/endpoints/payouts.ts` | 7 | Payouts API — historique et synthèse des reversements du professionnel |
| `mobile/src/screens/client/PropertyDetail/components/BookingFilterCard.tsx` | 272 | BookingFilterCard — carte de réservation en tête de fiche détail. |
| `mobile/src/screens/client/PropertyDetail/components/PriceAndCTA.tsx` | 69 | définit `PriceAndCTA` |
| `mobile/src/screens/client/PropertyDetail/components/VirtualTourButton.tsx` | 34 | VirtualTourButton (PropertyDetail screen): launches the 3D viewer. |
| `mobile/src/screens/client/PropertyDetail/sections/PricingSection.tsx` | 19 | PricingSection: property detail section component |
| `mobile/src/screens/client/PropertyDetail/sections/ReviewsSection.tsx` | 188 | définit `ReviewsSection` |


## 3. Fichiers vides (0 octet) — placeholders jamais remplis

| Fichier | Rôle actuel | Impact |
|---|---|---|
| `docs/api/admin.md`, `auth.md`, `bookings.md`, `payments.md`, `properties.md`, `openapi.yaml` | Documentation API prévue, jamais écrite | Aucun (non référencés) |
| `docs/architecture/api-design.md`, `database-schema.md`, `security.md` | Idem | Aucun |
| `docs/deployment/monitoring.md`, `supabase.md`, `upstash.md` | Idem | Aucun |
| `docs/guides/contributing.md`, `docs/guides/testing.md`, `docs/changelog.md` | Doublons vides de `CONTRIBUTING.md` / `CHANGELOG.md` | Aucun |
| `scripts/deploy-admin.sh`, `deploy-backend.sh`, `deploy-mobile.sh`, `generate-env.sh` | Scripts de déploiement vides (le déploiement se fait par Render/GitHub Actions) | Aucun (non appelés) |
| `mobile/assets/fonts/Inter.ttf` | Police vide, jamais chargée | Aucun |
| `mobile/assets/models/default-3d-model.glb` | Modèle 3D vide, jamais chargé | Aucun |
| `mobile/.prettierrc` | Config Prettier vide (la config racine s'applique) | Aucun |
| `Primeo/assets/images/hero.jpg`, `legal-site/assets/images/hero.jpg` | Images vides, non référencées | Aucun |

Après suppression, `docs/api/` ne contiendrait plus que `exports.md` (conservé).

## 4. Doublons et anciennes versions

| Élément | Rôle | Raison | Impact |
|---|---|---|---|
| `backend/src/modules/boosts/jobs/boost-expiration.job.ts` | Ancienne tâche d'expiration des boosts | Doublon : c'est `backend/src/jobs/boost-expiration.job.ts` qui est lancé | Aucun |
| `backend/src/jobs/invoice-generator.job.ts`, `backend/src/modules/subscriptions/jobs/invoice-generator.job.ts`, `.../subscription-cron.job.ts` | Anciennes tâches d'abonnement/factures | Remplacées par `jobs/subscription.job.ts` (seul enregistré) | Aucun |
| `backend/src/modules/messaging/messaging.socket.ts` | Ancien serveur temps réel | Remplacé par `socket.server.ts` (utilisé par `main.ts`) | Aucun |
| `backend/src/config/sentry.config.ts` | Ancienne config Sentry | Remplacée par `src/instrument.ts` | Aucun |
| `legal-site/assets/images/logo.png` | Ancien logo du site légal | Non référencé (le site utilise le logo Cloudinary) | Aucun |
| `Logo primeo.png` (racine) | Ancienne variante du logo | Non référencée, différente du logo officiel | Aucun |

## 5. Dossiers inutiles

| Dossier | Contenu | Raison | Impact |
|---|---|---|---|
| `infra/` | un README annonçant de futurs fichiers Terraform/Kubernetes | Vide de contenu réel ; l'infra est gérée sur Render/Supabase | Aucun |
| `packages/shared-types/` (7 fichiers) | Paquet de types partagés `@primeo/shared-types` | Importé par aucun projet (chaque projet a ses propres types) | Retirer aussi la ligne `packages/*` de `pnpm-workspace.yaml` → `pnpm install` à relancer (lockfile mis à jour) |

## 6. Site vitrine — fichiers que plus aucune page ne charge

| Fichier | Rôle | Raison | Impact |
|---|---|---|---|
| `Primeo/assets/js/produits.js` | Ancien script de la page Produits (lit un `data/produits.json` inexistant) | La page Produits ne le charge pas | Aucun |
| `Primeo/assets/js/legal.js` | Ancien script de pages légales internes | Aucune page ne le charge | Aucun |
| `Primeo/data/a-propos.json`, `faq.json`, `jobs.json` | Anciennes données statiques | Les pages lisent désormais l'API | Aucun |
| `Primeo/assets/img/og/og-default.png`, `og-documentation.png`, `og-tarification.png` | Images de partage non utilisées (aucune page ne les cite) | Inutilisées | Aucun (le script `generate-og-images.js` les recrée si besoin) |
| `Primeo/assets/img/app/accueil-annonces.jpg`, `hotels.jpg` | Captures d'app non affichées | Inutilisées | Aucun |
| `Primeo/assets/img/stores/*.png` | Badges stores en PNG | Le site utilise les versions SVG | Aucun |

## 7. Dépendances npm jamais importées

| Projet | Paquet | Raison | Impact |
|---|---|---|---|
| backend | `nodemailer`, `@types/nodemailer` | Les e-mails passent par l'API Brevo | Aucun |
| admin | `@tiptap/extension-link`, `otpauth`, `qrcode`, `@types/qrcode`, `@testing-library/user-event`, `prettier` | Aucun import (la 2FA est gérée par Supabase) | Aucun |
| mobile | `i18next`, `react-i18next`, `expo-localization` | Seulement utilisés par `src/i18n/` et `SettingsScreen` (orphelins, section 1) | Aucun |
| mobile | `expo-camera`, `expo-media-library` | Seulement utilisés par `services/utils/permissions.ts` (orphelin) | Aucun ; **un rebuild EAS** suivra de toute façon |

Conservés volontairement : `expo-font`, `expo-build-properties` (plugins Expo dans `app.config.js`), `three`, `@react-three/fiber`, `expo-gl`, `react-dom`, `@babel/core`, `ts-jest`, `@react-native/jest-preset`, `@testing-library/jest-native`, `@expo/ngrok`, `jest-environment-jsdom` (outils de build/test ou visite 3D web).

**Conservé après vérification :** `@types/express-serve-static-core` (backend) — signalé comme inutilisé par l'analyse, mais nécessaire à la génération des types des routers Express (sans lui, 37 erreurs de compilation). Il a été remis.

Également conservés : les favicons 16/48/512 px, `backend/prisma/seed-video-demo.ts`, `Primeo/data/produits.json`, et tous les éléments de la section « faux positifs » du rapport (configs d'outils, tests, scripts manuels, remplaçants web).

## 8. Imports et variables inutilisés (dans des fichiers conservés)

Retirés automatiquement (correctif TypeScript « supprimer l'identifiant inutilisé ») puis contrôlés par la compilation stricte `--noUnusedLocals` (0 restant) :

- **admin (20)** : imports `useMemo`, `useMutation`, `CardHeader/CardTitle/CardContent`, icônes `MessageSquare/AlertTriangle`, `Button` (Modal), `stripAll`, types `PlatformUser/AdminBooking/AdminDispute` ; variables mortes `levelVariant` (logs), mutation `suspend` jamais déclenchée (fiche annonce), onglet `DataPacksTab` jamais affiché (page Produits).
- **mobile (101)** : principalement les constantes `HEADER_BG/HEADER_BUTTON_BG/HEADER_SUBTLE` importées sans usage (~25 écrans), `Image`, `FlatList`, `Animated`, `View`, `Text`… ; fonctions mortes `sortProps` (catégorie) et `AppTopBar` + ses styles (accueil, bandeau jamais affiché) ; `useNavigation()`/`useProTheme()` appelés sans usage dans 7 écrans pro.
- **backend** : aucun.
