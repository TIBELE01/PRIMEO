// Role-based tab navigator — adapts tabs and icons to the authenticated user's role
import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeProvider';
import { AdminStack }       from './AdminStack';
import {
  ResidenceStack,
  HotelStack,
  ImmobilierStack,
  RestaurantStack,
} from './ProNavigator';
import PendingValidationScreen from '../screens/auth/PendingValidationScreen';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sc = (C: React.ComponentType<any>) => C as React.ComponentType<{}>;

// ── Client screens ────────────────────────────────────────────────────────────
import { HomeScreen }           from '../screens/client/Home/HomeScreen';
import { SearchScreen }         from '../screens/client/Search/SearchScreen';
import { MyBookingsScreen }     from '../screens/client/MyBookings/MyBookingsScreen';
import { BookingDetailScreen }  from '../screens/client/MyBookings/BookingDetailScreen';
import { ConversationsScreen }  from '../screens/client/Messaging/ConversationsScreen';
import { ProfileScreen }        from '../screens/client/Profile/ProfileScreen';
import { PropertyDetailScreen } from '../screens/client/PropertyDetail/PropertyDetailScreen';
import { BookingScreen }        from '../screens/client/Booking/BookingScreen';
import { GeniusPayWebViewScreen } from '../screens/client/Booking/GeniusPayWebView';
import { BookingConfirmationScreen } from '../screens/client/Booking/BookingConfirmationScreen';
import { ChatScreen }           from '../screens/client/Messaging/ChatScreen';
import { FavoritesScreen }      from '../screens/client/Favorites/FavoritesScreen';
import { ReferralScreen }       from '../screens/client/Referral/ReferralScreen';
import { VirtualTourScreen }    from '../screens/client/VirtualTour/VirtualTourScreen';
import EditProfileScreen        from '../screens/client/Profile/EditProfileScreen';
import ChangePasswordScreen     from '../screens/client/Profile/ChangePasswordScreen';
import TwoFactorSetupScreen     from '../screens/client/Profile/TwoFactorSetupScreen';
import LegalLinksScreen         from '../screens/client/Profile/LegalLinksScreen';
import { WriteReviewScreen }    from '../screens/client/Reviews/WriteReviewScreen';
import { MyReviewsScreen }         from '../screens/client/Reviews/MyReviewsScreen';
import { ReceivedRatingsScreen }    from '../screens/client/Reviews/ReceivedRatingsScreen';
import { DisputeListScreen }        from '../screens/client/Disputes/DisputeListScreen';
import { DisputeDetailScreen }      from '../screens/client/Disputes/DisputeDetailScreen';
import { NewDisputeScreen }         from '../screens/client/Disputes/NewDisputeScreen';
import { SectorScreen }             from '../screens/client/Sector/SectorScreen';
import { CategoryScreen }           from '../screens/client/Category/CategoryScreen';
import SupportChatbotScreen         from '../screens/common/SupportScreen';
import SupportTicketsScreen         from '../screens/common/SupportTicketsScreen';
import SupportTicketDetailScreen    from '../screens/common/SupportTicketDetailScreen';
import RestaurantOrderCartScreen    from '../screens/client/Restaurant/RestaurantOrderCartScreen';
import RestaurantOrderTrackingScreen from '../screens/client/Restaurant/RestaurantOrderTrackingScreen';
import MyRestaurantOrdersScreen     from '../screens/client/Restaurant/MyRestaurantOrdersScreen';

// ── Professional placeholder (all pro stacks share the same screen pool) ──────
import { View, Text, StyleSheet } from 'react-native';

const Placeholder = (label: string) => function Screen() {
  return (
    <View style={ph.container}>
      <Text style={ph.label}>{label}</Text>
    </View>
  );
};

const ph = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  label:     { fontSize: 15, color: '#6B7280' },
});

const ProDashboard   = Placeholder('Tableau de bord');
const ProProperties  = Placeholder('Mes annonces');
const ProBookings    = Placeholder('Réservations');
const ProMessages    = Placeholder('Messages');
const ProSettings    = Placeholder('Paramètres');

// ── Shared tab bar options factory ────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(focused: boolean, name: IoniconsName, outlineName: IoniconsName) {
  return (color: string, size: number) => (
    <Ionicons name={focused ? name : outlineName} size={size} color={color} />
  );
}

// ── Stack builders ────────────────────────────────────────────────────────────

const S = createNativeStackNavigator;

/** Home tab: browse + category pages + property detail + booking */
function HomeTabStack() {
  const Stack = S();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"                  component={HomeScreen} />
      {/* 4 category pages — one per sector card on the home screen */}
      <Stack.Screen name="ResidencesCategory"    component={CategoryScreen} initialParams={{ category: 'residence' }} />
      <Stack.Screen name="HotelsCategory"        component={CategoryScreen} initialParams={{ category: 'hotel' }} />
      <Stack.Screen name="ImmobilierCategory"    component={CategoryScreen} initialParams={{ category: 'immobilier' }} />
      <Stack.Screen name="RestaurantsCategory"   component={CategoryScreen} initialParams={{ category: 'restaurant' }} />
      {/* Legacy sector screen kept for backward compatibility */}
      <Stack.Screen name="SectorScreen"          component={SectorScreen} />
      <Stack.Screen name="PropertyDetail"          component={PropertyDetailScreen} />
      <Stack.Screen name="VirtualTour"             component={sc(VirtualTourScreen)} />
      <Stack.Screen name="Booking"                 component={sc(BookingScreen)} options={{ headerShown: false }} />
      <Stack.Screen name="GeniusPayWebView"        component={sc(GeniusPayWebViewScreen)} />
      <Stack.Screen name="BookingConfirmation"     component={sc(BookingConfirmationScreen)} />
      <Stack.Screen name="RestaurantOrderCart"     component={sc(RestaurantOrderCartScreen)} options={{ headerShown: false }} />
      <Stack.Screen name="RestaurantOrderTracking" component={sc(RestaurantOrderTrackingScreen)} options={{ headerShown: false }} />
      <Stack.Screen name="MyRestaurantOrders"      component={sc(MyRestaurantOrdersScreen)} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

/** Search tab */
function SearchTabStack() {
  const Stack = S();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Search"              component={SearchScreen} />
      <Stack.Screen name="PropertyDetail"          component={PropertyDetailScreen} />
      <Stack.Screen name="VirtualTour"             component={sc(VirtualTourScreen)} />
      <Stack.Screen name="Booking"                 component={sc(BookingScreen)} options={{ headerShown: false }} />
      <Stack.Screen name="GeniusPayWebView"        component={sc(GeniusPayWebViewScreen)} />
      <Stack.Screen name="BookingConfirmation"     component={sc(BookingConfirmationScreen)} />
      <Stack.Screen name="RestaurantOrderCart"     component={sc(RestaurantOrderCartScreen)} options={{ headerShown: false }} />
      <Stack.Screen name="RestaurantOrderTracking" component={sc(RestaurantOrderTrackingScreen)} options={{ headerShown: false }} />
      <Stack.Screen name="MyRestaurantOrders"      component={sc(MyRestaurantOrdersScreen)} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

/** Bookings tab */
function BookingsTabStack() {
  const Stack = S();
  return (
    <Stack.Navigator>
      <Stack.Screen name="MyBookings"    component={MyBookingsScreen} options={{ title: 'Mes réservations' }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Détail réservation' }} />
      <Stack.Screen name="WriteReview"   component={sc(WriteReviewScreen)} options={{ title: 'Laisser un avis' }} />
      <Stack.Screen name="Chat"          component={sc(ChatScreen)} options={{ headerShown: false }} />
      <Stack.Screen name="NewDispute"    component={sc(NewDisputeScreen)} options={{ title: 'Signaler un problème' }} />
      <Stack.Screen name="DisputeList"   component={sc(DisputeListScreen)} options={{ headerShown: false }} />
      <Stack.Screen name="DisputeDetail" component={sc(DisputeDetailScreen)} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

/** Messages tab */
function MessagesTabStack() {
  const Stack = S();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Conversations" component={sc(ConversationsScreen)} />
      <Stack.Screen name="Chat"          component={sc(ChatScreen)} />
    </Stack.Navigator>
  );
}

/** Favorites tab — liste des favoris + accès à la fiche détail et au tunnel de réservation */
function FavoritesTabStack() {
  const Stack = S();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Favorites"               component={sc(FavoritesScreen)} />
      <Stack.Screen name="PropertyDetail"          component={PropertyDetailScreen} />
      <Stack.Screen name="VirtualTour"             component={sc(VirtualTourScreen)} />
      <Stack.Screen name="Booking"                 component={sc(BookingScreen)} options={{ headerShown: false }} />
      <Stack.Screen name="GeniusPayWebView"        component={sc(GeniusPayWebViewScreen)} />
      <Stack.Screen name="BookingConfirmation"     component={sc(BookingConfirmationScreen)} />
      <Stack.Screen name="RestaurantOrderCart"     component={sc(RestaurantOrderCartScreen)} options={{ headerShown: false }} />
      <Stack.Screen name="RestaurantOrderTracking" component={sc(RestaurantOrderTrackingScreen)} options={{ headerShown: false }} />
      <Stack.Screen name="MyRestaurantOrders"      component={sc(MyRestaurantOrdersScreen)} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

/** Profile tab */
function ProfileTabStack() {
  const Stack = S();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile"          component={sc(ProfileScreen)} />
      <Stack.Screen name="EditProfile"      component={EditProfileScreen} options={{ headerShown: true, title: 'Modifier mon profil' }} />
      <Stack.Screen name="ChangePassword"   component={ChangePasswordScreen} options={{ headerShown: true, title: 'Mot de passe' }} />
      <Stack.Screen name="TwoFactorSetup"   component={TwoFactorSetupScreen} options={{ headerShown: true, title: 'Authentification 2FA' }} />
      <Stack.Screen name="LegalLinks"       component={LegalLinksScreen} options={{ headerShown: true, title: 'Informations légales' }} />
      <Stack.Screen name="Referral"          component={sc(ReferralScreen)} />
      <Stack.Screen name="MyReviews"         component={sc(MyReviewsScreen)} options={{ headerShown: true, title: 'Mes avis' }} />
      <Stack.Screen name="ReceivedRatings"   component={sc(ReceivedRatingsScreen)} options={{ headerShown: false }} />
      <Stack.Screen name="DisputeList"          component={sc(DisputeListScreen)} options={{ headerShown: false }} />
      <Stack.Screen name="DisputeDetail"        component={sc(DisputeDetailScreen)} options={{ headerShown: false }} />
      <Stack.Screen name="SupportChatbot"       component={SupportChatbotScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SupportTickets"       component={SupportTicketsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SupportTicketDetail"  component={SupportTicketDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

/** Simple one-screen pro tab */
function ProStack(Screen: React.ComponentType, title: string) {
  return function ProTabStack() {
    const Stack = S();
    return (
      <Stack.Navigator>
        <Stack.Screen name="Screen" component={Screen} options={{ title }} />
      </Stack.Navigator>
    );
  };
}

// ── Client tab navigator ──────────────────────────────────────────────────────

const ClientTab = createBottomTabNavigator();

function ClientTabs() {
  const { theme } = useTheme();

  return (
    <ClientTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor:  theme.colors.border,
          height: Platform.OS === 'ios' ? 84 : 60,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <ClientTab.Screen
        name="Accueil"
        component={HomeTabStack}
        options={{
          tabBarAccessibilityLabel: 'Accueil',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(focused, 'home', 'home-outline')(color, size),
        }}
      />
      <ClientTab.Screen
        name="Rechercher"
        component={SearchTabStack}
        options={{
          tabBarAccessibilityLabel: 'Rechercher',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(focused, 'search', 'search-outline')(color, size),
        }}
      />
      <ClientTab.Screen
        name="Réservations"
        component={BookingsTabStack}
        options={{
          tabBarAccessibilityLabel: 'Mes réservations',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(focused, 'calendar', 'calendar-outline')(color, size),
        }}
      />
      <ClientTab.Screen
        name="Messages"
        component={MessagesTabStack}
        options={{
          tabBarAccessibilityLabel: 'Messages',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(focused, 'chatbubbles', 'chatbubbles-outline')(color, size),
        }}
      />
      <ClientTab.Screen
        name="Favoris"
        component={FavoritesTabStack}
        options={{
          tabBarAccessibilityLabel: 'Mes favoris',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(focused, 'heart', 'heart-outline')(color, size),
        }}
      />
      <ClientTab.Screen
        name="Profil"
        component={ProfileTabStack}
        options={{
          tabBarAccessibilityLabel: 'Mon profil',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(focused, 'person', 'person-outline')(color, size),
        }}
      />
    </ClientTab.Navigator>
  );
}

// ── Professional tab navigator (shared between all pro roles) ─────────────────

const ProTab = createBottomTabNavigator();

function ProfessionalTabs() {
  const { theme } = useTheme();

  return (
    <ProTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor:  theme.colors.border,
          height: Platform.OS === 'ios' ? 84 : 60,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <ProTab.Screen
        name="Tableau de bord"
        component={ProStack(ProDashboard, 'Tableau de bord')}
        options={{
          tabBarAccessibilityLabel: 'Tableau de bord',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(focused, 'bar-chart', 'bar-chart-outline')(color, size),
        }}
      />
      <ProTab.Screen
        name="Annonces"
        component={ProStack(ProProperties, 'Mes annonces')}
        options={{
          tabBarAccessibilityLabel: 'Mes annonces',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(focused, 'business', 'business-outline')(color, size),
        }}
      />
      <ProTab.Screen
        name="Réservations"
        component={ProStack(ProBookings, 'Réservations')}
        options={{
          tabBarAccessibilityLabel: 'Réservations',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(focused, 'calendar', 'calendar-outline')(color, size),
        }}
      />
      <ProTab.Screen
        name="Messages"
        component={ProStack(ProMessages, 'Messages')}
        options={{
          tabBarAccessibilityLabel: 'Messages',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(focused, 'chatbubbles', 'chatbubbles-outline')(color, size),
        }}
      />
      <ProTab.Screen
        name="Paramètres"
        component={ProStack(ProSettings, 'Paramètres')}
        options={{
          tabBarAccessibilityLabel: 'Paramètres',
          tabBarIcon: ({ color, size, focused }) =>
            tabIcon(focused, 'settings', 'settings-outline')(color, size),
        }}
      />
    </ProTab.Navigator>
  );
}

// ── Root role router ──────────────────────────────────────────────────────────

export function MainTabs() {
  const user   = useAuthStore((s) => s.user);
  const role   = user?.role ?? 'client';
  const status = user?.status;

  // Compte pro en attente de validation admin — affiche l'écran de blocage
  const isPendingPro = status === 'pending' && role !== 'client' && role !== 'admin';
  if (isPendingPro) return <PendingValidationScreen />;

  if (role === 'admin') return <AdminStack />;

  if (role === 'professional_hebergement') return <ResidenceStack />;
  if (role === 'professional_hotel')       return <HotelStack />;
  if (role === 'professional_immobilier')  return <ImmobilierStack />;
  if (role === 'restaurateur')             return <RestaurantStack />;

  return <ClientTabs />;
}
