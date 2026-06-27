// Role-based tab navigator — adapts tabs and icons to the authenticated user's role
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import RestaurantMenuScreen         from '../screens/client/Restaurant/RestaurantMenuScreen';
import DishDetailScreen             from '../screens/client/Restaurant/DishDetailScreen';
import DishOrderScreen              from '../screens/client/Restaurant/DishOrderScreen';
import TableReservationScreen       from '../screens/client/Restaurant/TableReservationScreen';
import RestaurantOrderCartScreen    from '../screens/client/Restaurant/RestaurantOrderCartScreen';
import RestaurantOrderTrackingScreen from '../screens/client/Restaurant/RestaurantOrderTrackingScreen';
import MyRestaurantOrdersScreen     from '../screens/client/Restaurant/MyRestaurantOrdersScreen';

// ── Shared tab bar options factory ────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(focused: boolean, name: IoniconsName, outlineName: IoniconsName) {
  return (color: string, size: number) => (
    <Ionicons name={focused ? name : outlineName} size={size} color={color} />
  );
}

// ── Stack builders ────────────────────────────────────────────────────────────
// Each tab gets its own stable navigator instance created at module level.
// Creating navigators inside component functions causes a new instance on every
// render, which breaks React Navigation's internal state tracking.

const HomeStack     = createNativeStackNavigator();
const SearchStack   = createNativeStackNavigator();
const BookingsStack = createNativeStackNavigator();
const MessagesStack = createNativeStackNavigator();
const FavoritesStack = createNativeStackNavigator();
const ProfileStack  = createNativeStackNavigator();

const GREY_HEADER = {
  headerStyle: { backgroundColor: '#808080' },
  headerTintColor: '#111111',
  headerTitleAlign: 'center' as const,
  headerTitleStyle: { fontWeight: '800' as const, fontSize: 20, color: '#111111' },
  headerShadowVisible: true,
};

/** Home tab: browse + category pages + property detail + booking */
function HomeTabStack() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home"                  component={HomeScreen} />
      {/* 4 category pages — one per sector card on the home screen */}
      <HomeStack.Screen name="ResidencesCategory"    component={CategoryScreen} initialParams={{ category: 'residence' }} />
      <HomeStack.Screen name="HotelsCategory"        component={CategoryScreen} initialParams={{ category: 'hotel' }} />
      <HomeStack.Screen name="ImmobilierCategory"    component={CategoryScreen} initialParams={{ category: 'immobilier' }} />
      <HomeStack.Screen name="RestaurantsCategory"   component={CategoryScreen} initialParams={{ category: 'restaurant' }} />
      <HomeStack.Screen name="RestaurantMenu"        component={sc(RestaurantMenuScreen)} options={{ headerShown: false }} />
      <HomeStack.Screen name="DishDetail"            component={sc(DishDetailScreen)} options={{ headerShown: false }} />
      <HomeStack.Screen name="DishOrder"             component={sc(DishOrderScreen)} options={{ headerShown: false }} />
      <HomeStack.Screen name="TableReservation"      component={sc(TableReservationScreen)} options={{ headerShown: false }} />
      {/* Legacy sector screen kept for backward compatibility */}
      <HomeStack.Screen name="SectorScreen"          component={SectorScreen} />
      <HomeStack.Screen name="PropertyDetail"          component={PropertyDetailScreen} />
      <HomeStack.Screen name="VirtualTour"             component={sc(VirtualTourScreen)} />
      <HomeStack.Screen name="Booking"                 component={sc(BookingScreen)} options={{ headerShown: false }} />
      <HomeStack.Screen name="GeniusPayWebView"        component={sc(GeniusPayWebViewScreen)} />
      <HomeStack.Screen name="BookingConfirmation"     component={sc(BookingConfirmationScreen)} />
      <HomeStack.Screen name="RestaurantOrderCart"     component={sc(RestaurantOrderCartScreen)} options={{ headerShown: false }} />
      <HomeStack.Screen name="RestaurantOrderTracking" component={sc(RestaurantOrderTrackingScreen)} options={{ headerShown: false }} />
      <HomeStack.Screen name="MyRestaurantOrders"      component={sc(MyRestaurantOrdersScreen)} options={{ headerShown: false }} />
    </HomeStack.Navigator>
  );
}

/** Search tab */
function SearchTabStack() {
  return (
    <SearchStack.Navigator screenOptions={{ headerShown: false }}>
      <SearchStack.Screen name="Search"              component={SearchScreen} />
      <SearchStack.Screen name="RestaurantMenu"        component={sc(RestaurantMenuScreen)} options={{ headerShown: false }} />
      <SearchStack.Screen name="DishDetail"            component={sc(DishDetailScreen)} options={{ headerShown: false }} />
      <SearchStack.Screen name="DishOrder"             component={sc(DishOrderScreen)} options={{ headerShown: false }} />
      <SearchStack.Screen name="TableReservation"      component={sc(TableReservationScreen)} options={{ headerShown: false }} />
      <SearchStack.Screen name="PropertyDetail"          component={PropertyDetailScreen} />
      <SearchStack.Screen name="VirtualTour"             component={sc(VirtualTourScreen)} />
      <SearchStack.Screen name="Booking"                 component={sc(BookingScreen)} options={{ headerShown: false }} />
      <SearchStack.Screen name="GeniusPayWebView"        component={sc(GeniusPayWebViewScreen)} />
      <SearchStack.Screen name="BookingConfirmation"     component={sc(BookingConfirmationScreen)} />
      <SearchStack.Screen name="RestaurantOrderCart"     component={sc(RestaurantOrderCartScreen)} options={{ headerShown: false }} />
      <SearchStack.Screen name="RestaurantOrderTracking" component={sc(RestaurantOrderTrackingScreen)} options={{ headerShown: false }} />
      <SearchStack.Screen name="MyRestaurantOrders"      component={sc(MyRestaurantOrdersScreen)} options={{ headerShown: false }} />
    </SearchStack.Navigator>
  );
}

/** Bookings tab */
function BookingsTabStack() {
  return (
    <BookingsStack.Navigator screenOptions={{ headerShown: false }}>
      <BookingsStack.Screen name="MyBookings"    component={MyBookingsScreen} />
      <BookingsStack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <BookingsStack.Screen name="WriteReview"   component={sc(WriteReviewScreen)} options={{ headerShown: true, title: 'Laisser un avis', ...GREY_HEADER }} />
      <BookingsStack.Screen name="Chat"          component={sc(ChatScreen)} />
      <BookingsStack.Screen name="NewDispute"    component={sc(NewDisputeScreen)} options={{ headerShown: true, title: 'Signaler un problème', ...GREY_HEADER }} />
      <BookingsStack.Screen name="DisputeList"   component={sc(DisputeListScreen)} />
      <BookingsStack.Screen name="DisputeDetail" component={sc(DisputeDetailScreen)} />
    </BookingsStack.Navigator>
  );
}

/** Messages tab */
function MessagesTabStack() {
  return (
    <MessagesStack.Navigator screenOptions={{ headerShown: false }}>
      <MessagesStack.Screen name="Conversations" component={sc(ConversationsScreen)} />
      <MessagesStack.Screen name="Chat"          component={sc(ChatScreen)} />
    </MessagesStack.Navigator>
  );
}

/** Favorites tab — liste des favoris + accès à la fiche détail et au tunnel de réservation */
function FavoritesTabStack() {
  return (
    <FavoritesStack.Navigator screenOptions={{ headerShown: false }}>
      <FavoritesStack.Screen name="Favorites"               component={sc(FavoritesScreen)} />
      <FavoritesStack.Screen name="RestaurantMenu"          component={sc(RestaurantMenuScreen)} options={{ headerShown: false }} />
      <FavoritesStack.Screen name="DishDetail"              component={sc(DishDetailScreen)} options={{ headerShown: false }} />
      <FavoritesStack.Screen name="DishOrder"               component={sc(DishOrderScreen)} options={{ headerShown: false }} />
      <FavoritesStack.Screen name="TableReservation"        component={sc(TableReservationScreen)} options={{ headerShown: false }} />
      <FavoritesStack.Screen name="PropertyDetail"          component={PropertyDetailScreen} />
      <FavoritesStack.Screen name="VirtualTour"             component={sc(VirtualTourScreen)} />
      <FavoritesStack.Screen name="Booking"                 component={sc(BookingScreen)} options={{ headerShown: false }} />
      <FavoritesStack.Screen name="GeniusPayWebView"        component={sc(GeniusPayWebViewScreen)} />
      <FavoritesStack.Screen name="BookingConfirmation"     component={sc(BookingConfirmationScreen)} />
      <FavoritesStack.Screen name="RestaurantOrderCart"     component={sc(RestaurantOrderCartScreen)} options={{ headerShown: false }} />
      <FavoritesStack.Screen name="RestaurantOrderTracking" component={sc(RestaurantOrderTrackingScreen)} options={{ headerShown: false }} />
      <FavoritesStack.Screen name="MyRestaurantOrders"      component={sc(MyRestaurantOrdersScreen)} options={{ headerShown: false }} />
    </FavoritesStack.Navigator>
  );
}

/** Profile tab */
function ProfileTabStack() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false, ...GREY_HEADER }}>
      <ProfileStack.Screen name="Profile"          component={sc(ProfileScreen)} />
      <ProfileStack.Screen name="EditProfile"      component={EditProfileScreen} options={{ headerShown: true, title: 'Modifier mon profil' }} />
      <ProfileStack.Screen name="ChangePassword"   component={ChangePasswordScreen} options={{ headerShown: true, title: 'Mot de passe' }} />
      <ProfileStack.Screen name="TwoFactorSetup"   component={TwoFactorSetupScreen} options={{ headerShown: true, title: 'Authentification 2FA' }} />
      <ProfileStack.Screen name="LegalLinks"       component={LegalLinksScreen} options={{ headerShown: true, title: 'Informations légales' }} />
      <ProfileStack.Screen name="Referral"          component={sc(ReferralScreen)} />
      <ProfileStack.Screen name="MyReviews"         component={sc(MyReviewsScreen)} options={{ headerShown: true, title: 'Mes avis' }} />
      <ProfileStack.Screen name="ReceivedRatings"   component={sc(ReceivedRatingsScreen)} options={{ headerShown: true, title: 'Évaluations reçues', ...GREY_HEADER }} />
      <ProfileStack.Screen name="DisputeList"          component={sc(DisputeListScreen)} options={{ headerShown: false }} />
      <ProfileStack.Screen name="DisputeDetail"        component={sc(DisputeDetailScreen)} options={{ headerShown: false }} />
      <ProfileStack.Screen name="SupportChatbot"       component={SupportChatbotScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="SupportTickets"       component={SupportTicketsScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="SupportTicketDetail"  component={SupportTicketDetailScreen} options={{ headerShown: false }} />
    </ProfileStack.Navigator>
  );
}

// ── Client tab navigator ──────────────────────────────────────────────────────

const ClientTab = createBottomTabNavigator();

function ClientTabs() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(8, insets.bottom);

  return (
    <ClientTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor:  theme.colors.border,
          height: 48 + safeBottom,
          paddingBottom: safeBottom,
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
