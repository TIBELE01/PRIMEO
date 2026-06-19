// Shared professional navigator factory.
//
// Builds a bottom-tab navigator (per CONTEXTE.md §5.3 / §8.2) for each
// professional role. Tabs: Tableau de bord, Propriétés/Menu, Réservations,
// Messages, Paramètres. The "Paramètres" tab hosts ProSettingsScreen which
// contains the logout button — so logout is always reachable.
//
// Each tab is a full stack registering the role's entire screen set with a
// different initialRouteName. This guarantees every existing
// navigation.navigate('X') call resolves within the active tab without having
// to touch any screen component.
import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// ─── Screens (hébergement / hôtel / immobilier) ──────────────────────────────
import DashboardScreen            from '../screens/pro/Dashboard/DashboardScreen';
import PropertiesListScreen       from '../screens/pro/Properties/PropertiesListScreen';
import AddPropertyScreen          from '../screens/pro/Properties/AddPropertyScreen';
import PropertyManagementScreen   from '../screens/pro/Properties/PropertyManagementScreen';
import Scene3dEditorScreen        from '../screens/pro/Properties/Scene3dEditorScreen';
import PropertyCalendarScreen     from '../screens/pro/Calendar/PropertyCalendarScreen';
import IcalFeedsScreen            from '../screens/pro/Calendar/IcalFeedsScreen';
import BookingsScreen            from '../screens/pro/Bookings/BookingsScreen';
import BookingDetailScreen       from '../screens/pro/Bookings/BookingDetailScreen';
import RateClientScreen          from '../screens/pro/Bookings/RateClientScreen';
import SubscriptionsScreen       from '../screens/pro/Subscriptions/SubscriptionsScreen';
import BoostsScreen              from '../screens/pro/Boosts/BoostsScreen';
import PayoutsScreen             from '../screens/pro/Payouts/PayoutsScreen';
import ExtraSlotsScreen          from '../screens/pro/Subscriptions/ExtraSlotsScreen';
import AnalyticsScreen           from '../screens/pro/Analytics/AnalyticsScreen';
import { ExportsScreen }         from '../screens/pro/Exports/ExportsScreen';
import ProReceivedReviewsScreen  from '../screens/pro/Reviews/ProReceivedReviewsScreen';
import AccessManagementScreen    from '../screens/pro/Collaborators/AccessManagementScreen';
import NotificationsScreen       from '../screens/pro/Notifications/NotificationsScreen';
import SupportChatbotScreen      from '../screens/common/SupportScreen';
import SupportTicketsScreen      from '../screens/common/SupportTicketsScreen';
import SupportTicketDetailScreen from '../screens/common/SupportTicketDetailScreen';
import ProSettingsScreen         from '../screens/common/ProSettingsScreen';

// ─── Écrans de gestion de profil (partagés avec le client) ───────────────────
import EditProfileScreen          from '../screens/client/Profile/EditProfileScreen';
import ChangePasswordScreen       from '../screens/client/Profile/ChangePasswordScreen';
import TwoFactorSetupScreen       from '../screens/client/Profile/TwoFactorSetupScreen';
import LegalLinksScreen           from '../screens/client/Profile/LegalLinksScreen';

// ─── Restaurant screens ──────────────────────────────────────────────────────
import RestaurantDashboardScreen from '../screens/pro/Restaurant/RestaurantDashboardScreen';
import RestaurantBookingsScreen  from '../screens/pro/Restaurant/RestaurantBookingsScreen';
import MenuManagementScreen      from '../screens/pro/Restaurant/MenuManagementScreen';
import SpecialMenusScreen        from '../screens/pro/Restaurant/SpecialMenusScreen';
import TimeSlotsScreen           from '../screens/pro/Restaurant/TimeSlotsScreen';
import PromotionsScreen          from '../screens/pro/Restaurant/PromotionsScreen';
import FoodOrdersScreen          from '../screens/pro/Restaurant/FoodOrdersScreen';

// ─── Messaging (shared with client) ──────────────────────────────────────────
import { ConversationsScreen } from '../screens/client/Messaging/ConversationsScreen';
import { ChatScreen }          from '../screens/client/Messaging/ChatScreen';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComp = React.ComponentType<any>;
const sc = (C: AnyComp) => C as React.ComponentType<Record<string, never>>;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface ScreenDef {
  name: string;
  component: AnyComp;
  title?: string;
  headerShown?: boolean;
}

interface TabDef {
  name: string;       // tab route name (unique per role)
  label: string;      // tab bar label
  icon: IoniconsName;
  iconOutline: IoniconsName;
  initialRoute: string; // screen the tab opens on
}

/**
 * Build a role navigator: a bottom-tab navigator whose tabs each render the
 * full screen set with a distinct initial route.
 * themeColor drives the active tab color (blue/green/red per role).
 */
function buildRoleNavigator(screens: ScreenDef[], tabs: TabDef[], themeColor = '#1056E0') {
  const RoleTab = createBottomTabNavigator();

  // Each tab gets its OWN navigator instance so that when React Navigation
  // keeps multiple tabs mounted simultaneously (after lazy first-visit), each
  // <Stack.Navigator> operates on an independent navigation context.
  // Sharing a single instance across tabs corrupts the navigator state when
  // two <Stack.Navigator> components try to use the same context concurrently.
  const stackComponents: Record<string, AnyComp> = {};
  for (const tab of tabs) {
    const TabStack = createNativeStackNavigator();
    const initialRoute = tab.initialRoute;
    stackComponents[tab.name] = function TabStackComponent() {
      return (
        <TabStack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: { backgroundColor: '#808080' },
            headerTintColor: '#111111',
            headerTitleAlign: 'center' as const,
            headerTitleStyle: { fontWeight: '800' as const, fontSize: 20, color: '#111111' },
            headerShadowVisible: true,
          }}
        >
          {screens.map((s) => (
            <TabStack.Screen
              key={s.name}
              name={s.name}
              component={s.component}
              options={{ title: s.title ?? s.name, headerShown: s.headerShown ?? true }}
            />
          ))}
        </TabStack.Navigator>
      );
    };
  }

  return function RoleTabs() {
    return (
      <RoleTab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: themeColor,
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            height: Platform.OS === 'ios' ? 84 : 64,
            paddingBottom: Platform.OS === 'ios' ? 28 : 8,
            paddingTop: 8,
            borderTopColor: '#E5E7EB',
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        {tabs.map((tab) => (
          <RoleTab.Screen
            key={tab.name}
            name={tab.name}
            component={stackComponents[tab.name]}
            options={{
              tabBarLabel: tab.label,
              tabBarAccessibilityLabel: tab.label,
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons name={focused ? tab.icon : tab.iconOutline} size={size} color={color} />
              ),
            }}
          />
        ))}
      </RoleTab.Navigator>
    );
  };
}

// ─── Common screen set for hébergement / hôtel / immobilier ───────────────────

function lodgingScreens(labels: {
  properties: string; addProperty: string; editProperty: string;
  bookings: string; bookingDetail: string;
}): ScreenDef[] {
  return [
    { name: 'Dashboard',            component: DashboardScreen,             title: 'Tableau de bord',    headerShown: false },
    { name: 'PropertiesList',       component: PropertiesListScreen,        title: labels.properties },
    { name: 'AddProperty',          component: AddPropertyScreen,           title: labels.addProperty },
    { name: 'PropertyManagement',   component: PropertyManagementScreen,    title: 'Gérer l\'annonce' },
    { name: 'Scene3dEditor',        component: Scene3dEditorScreen,         title: 'Visite 3D', headerShown: false },
    { name: 'EditProperty',         component: AddPropertyScreen,           title: labels.editProperty },
    { name: 'PropertyCalendar',     component: PropertyCalendarScreen,      title: 'Calendrier' },
    { name: 'IcalFeeds',            component: IcalFeedsScreen,             title: 'Import iCal', headerShown: false },
    { name: 'Bookings',            component: BookingsScreen,            title: labels.bookings,    headerShown: false },
    { name: 'BookingDetail',       component: BookingDetailScreen,       title: labels.bookingDetail },
    { name: 'RateClient',          component: RateClientScreen,          title: 'Noter le client' },
    { name: 'Subscriptions',       component: SubscriptionsScreen,       title: 'Abonnements' },
    { name: 'ExtraSlots',          component: ExtraSlotsScreen,          title: 'Publications suppl.', headerShown: false },
    { name: 'Boosts',              component: BoostsScreen,              title: 'Boosts' },
    { name: 'Payouts',             component: PayoutsScreen,             title: 'Reversements',     headerShown: false },
    { name: 'Analytics',           component: AnalyticsScreen,           title: 'Statistiques',     headerShown: false },
    { name: 'DataExports',         component: ExportsScreen,             title: 'Exporter mes données', headerShown: false },
    { name: 'ReceivedReviews',     component: ProReceivedReviewsScreen,  title: 'Avis reçus' },
    { name: 'CollaboratorsAccess', component: AccessManagementScreen,    headerShown: false },
    { name: 'Notifications',       component: NotificationsScreen,       headerShown: false },
    { name: 'Conversations',       component: sc(ConversationsScreen),   title: 'Messages',         headerShown: false },
    { name: 'Messages',            component: sc(ConversationsScreen),   title: 'Messages',         headerShown: false },
    { name: 'Chat',                component: sc(ChatScreen),            headerShown: false },
    { name: 'Settings',            component: ProSettingsScreen,         title: 'Paramètres',       headerShown: false },
    { name: 'EditProfile',         component: sc(EditProfileScreen),     title: 'Modifier mon profil', headerShown: false },
    { name: 'ChangePassword',      component: sc(ChangePasswordScreen),  title: 'Mot de passe',        headerShown: false },
    { name: 'TwoFactorSetup',      component: sc(TwoFactorSetupScreen),  title: 'Authentification 2FA', headerShown: false },
    { name: 'LegalLinks',          component: sc(LegalLinksScreen),      title: 'Informations légales', headerShown: false },
    { name: 'SupportChatbot',      component: SupportChatbotScreen,      headerShown: false },
    { name: 'SupportTickets',      component: SupportTicketsScreen,      headerShown: false },
    { name: 'SupportTicketDetail', component: SupportTicketDetailScreen, headerShown: false },
  ];
}

const lodgingTabs = (propertiesLabel: string): TabDef[] => [
  { name: 'TabDashboard',  label: 'Accueil',      icon: 'grid',          iconOutline: 'grid-outline',          initialRoute: 'Dashboard' },
  { name: 'TabProperties', label: propertiesLabel, icon: 'business',     iconOutline: 'business-outline',      initialRoute: 'PropertiesList' },
  { name: 'TabBookings',   label: 'Réservations', icon: 'calendar',      iconOutline: 'calendar-outline',      initialRoute: 'Bookings' },
  { name: 'TabAnalytics',  label: 'Statistiques', icon: 'bar-chart',     iconOutline: 'bar-chart-outline',     initialRoute: 'Analytics' },
  { name: 'TabMessages',   label: 'Messages',     icon: 'chatbubbles',   iconOutline: 'chatbubbles-outline',   initialRoute: 'Conversations' },
  { name: 'TabSettings',   label: 'Paramètres',   icon: 'settings',      iconOutline: 'settings-outline',      initialRoute: 'Settings' },
];

// ─── Role navigators (blue for hébergement/hôtel, green for immobilier, red for restaurant) ──

export const ResidenceStack = buildRoleNavigator(
  lodgingScreens({
    properties: 'Mes propriétés', addProperty: 'Ajouter une propriété', editProperty: 'Modifier la propriété',
    bookings: 'Réservations', bookingDetail: 'Détail réservation',
  }),
  lodgingTabs('Propriétés'),
  '#1056E0',
);

export const HotelStack = buildRoleNavigator(
  lodgingScreens({
    properties: 'Mes établissements', addProperty: 'Ajouter un établissement', editProperty: "Modifier l'établissement",
    bookings: 'Réservations', bookingDetail: 'Détail réservation',
  }),
  lodgingTabs('Établissements'),
  '#1056E0',
);

export const ImmobilierStack = buildRoleNavigator(
  lodgingScreens({
    properties: 'Mes biens', addProperty: 'Ajouter un bien', editProperty: 'Modifier le bien',
    bookings: 'Demandes de location', bookingDetail: 'Détail demande',
  }),
  lodgingTabs('Mes biens'),
  '#16A34A',
);

// ─── Restaurant ────────────────────────────────────────────────────────────────

const restaurantScreens: ScreenDef[] = [
  { name: 'Dashboard',           component: RestaurantDashboardScreen, title: 'Tableau de bord', headerShown: false },
  { name: 'AddProperty',         component: AddPropertyScreen,         title: 'Créer mon restaurant' },
  { name: 'EditProperty',        component: AddPropertyScreen,         title: 'Modifier mon restaurant' },
  { name: 'PropertyManagement',  component: PropertyManagementScreen,  title: 'Mon établissement' },
  { name: 'Scene3dEditor',       component: Scene3dEditorScreen,       title: 'Visite 3D', headerShown: false },
  { name: 'IcalFeeds',           component: IcalFeedsScreen,           title: 'Import iCal', headerShown: false },
  { name: 'MenuManagement',      component: MenuManagementScreen,      title: 'Menu',            headerShown: false },
  { name: 'AddMenuItem',         component: MenuManagementScreen,      title: 'Ajouter un plat' },
  { name: 'SpecialMenus',        component: SpecialMenusScreen,        title: 'Menus spéciaux',  headerShown: false },
  { name: 'TimeSlots',           component: TimeSlotsScreen,           title: 'Créneaux',        headerShown: false },
  { name: 'Promotions',          component: PromotionsScreen,          title: 'Promotions',      headerShown: false },
  { name: 'Bookings',            component: RestaurantBookingsScreen,  title: 'Réservations',    headerShown: false },
  { name: 'BookingDetail',       component: BookingDetailScreen,       title: 'Détail réservation' },
  { name: 'RateClient',          component: RateClientScreen,          title: 'Évaluer le client' },
  { name: 'Analytics',           component: AnalyticsScreen,           title: 'Statistiques',    headerShown: false },
  { name: 'Boosts',              component: BoostsScreen,              title: 'Boosts' },
  { name: 'ReceivedReviews',     component: ProReceivedReviewsScreen,  title: 'Avis reçus' },
  { name: 'DataExports',         component: ExportsScreen,             title: 'Exporter mes données', headerShown: false },
  { name: 'Subscriptions',       component: SubscriptionsScreen,       title: 'Abonnement' },
  { name: 'ExtraSlots',          component: ExtraSlotsScreen,          title: 'Publications suppl.', headerShown: false },
  { name: 'CollaboratorsAccess', component: AccessManagementScreen,    headerShown: false },
  { name: 'Notifications',       component: NotificationsScreen,       headerShown: false },
  { name: 'Conversations',       component: sc(ConversationsScreen),   title: 'Messages',        headerShown: false },
  { name: 'Messages',            component: sc(ConversationsScreen),   title: 'Messages',        headerShown: false },
  { name: 'Chat',                component: sc(ChatScreen),            headerShown: false },
  { name: 'Settings',            component: ProSettingsScreen,         title: 'Paramètres',      headerShown: false },
  { name: 'EditProfile',         component: sc(EditProfileScreen),     title: 'Modifier mon profil', headerShown: false },
  { name: 'ChangePassword',      component: sc(ChangePasswordScreen),  title: 'Mot de passe',        headerShown: false },
  { name: 'TwoFactorSetup',      component: sc(TwoFactorSetupScreen),  title: 'Authentification 2FA', headerShown: false },
  { name: 'LegalLinks',          component: sc(LegalLinksScreen),      title: 'Informations légales', headerShown: false },
  { name: 'SupportChatbot',      component: SupportChatbotScreen,      headerShown: false },
  { name: 'SupportTickets',      component: SupportTicketsScreen,      headerShown: false },
  { name: 'SupportTicketDetail', component: SupportTicketDetailScreen, headerShown: false },
  { name: 'FoodOrders',          component: FoodOrdersScreen,          title: 'Commandes',          headerShown: false },
  { name: 'FoodOrderDetail',     component: FoodOrdersScreen,          title: 'Détail commande',    headerShown: false },
];

const restaurantTabs: TabDef[] = [
  { name: 'TabDashboard', label: 'Accueil',      icon: 'grid',           iconOutline: 'grid-outline',           initialRoute: 'Dashboard' },
  { name: 'TabMenu',      label: 'Menu',         icon: 'restaurant',     iconOutline: 'restaurant-outline',     initialRoute: 'MenuManagement' },
  { name: 'TabBookings',  label: 'Réservations', icon: 'calendar',       iconOutline: 'calendar-outline',       initialRoute: 'Bookings' },
  { name: 'TabOrders',    label: 'Commandes',    icon: 'receipt',        iconOutline: 'receipt-outline',        initialRoute: 'FoodOrders' },
  { name: 'TabMessages',  label: 'Messages',     icon: 'chatbubbles',    iconOutline: 'chatbubbles-outline',    initialRoute: 'Conversations' },
  { name: 'TabSettings',  label: 'Paramètres',   icon: 'settings',       iconOutline: 'settings-outline',       initialRoute: 'Settings' },
];

export const RestaurantStack = buildRoleNavigator(restaurantScreens, restaurantTabs, '#DC2626');
