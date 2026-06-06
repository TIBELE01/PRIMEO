// Client navigation stack — all client-facing screens
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ClientStackParamList } from './types';
import { HomeScreen } from '../screens/client/Home/HomeScreen';
import { SearchScreen } from '../screens/client/Search/SearchScreen';
import { PropertyDetailScreen } from '../screens/client/PropertyDetail/PropertyDetailScreen';
import { BookingScreen } from '../screens/client/Booking/BookingScreen';
import { GeniusPayWebViewScreen } from '../screens/client/Booking/GeniusPayWebView';
import { BookingConfirmationScreen } from '../screens/client/Booking/BookingConfirmationScreen';
import { MyBookingsScreen } from '../screens/client/MyBookings/MyBookingsScreen';
import { BookingDetailScreen } from '../screens/client/MyBookings/BookingDetailScreen';
import { ConversationsScreen } from '../screens/client/Messaging/ConversationsScreen';
import { ChatScreen } from '../screens/client/Messaging/ChatScreen';
import { FavoritesScreen } from '../screens/client/Favorites/FavoritesScreen';
import { ReferralScreen } from '../screens/client/Referral/ReferralScreen';
import { WriteReviewScreen } from '../screens/client/Reviews/WriteReviewScreen';
import { MyReviewsScreen } from '../screens/client/Reviews/MyReviewsScreen';
import { ReceivedRatingsScreen } from '../screens/client/Reviews/ReceivedRatingsScreen';
import { DisputeListScreen } from '../screens/client/Disputes/DisputeListScreen';
import { DisputeDetailScreen } from '../screens/client/Disputes/DisputeDetailScreen';
import { NewDisputeScreen } from '../screens/client/Disputes/NewDisputeScreen';
import { ProfileScreen } from '../screens/client/Profile/ProfileScreen';
import EditProfileScreen from '../screens/client/Profile/EditProfileScreen';
import ChangePasswordScreen from '../screens/client/Profile/ChangePasswordScreen';
import TwoFactorSetupScreen from '../screens/client/Profile/TwoFactorSetupScreen';
import LegalLinksScreen from '../screens/client/Profile/LegalLinksScreen';
import { VirtualTourScreen } from '../screens/client/VirtualTour/VirtualTourScreen';
import { SectorScreen } from '../screens/client/Sector/SectorScreen';
import SupportChatbotScreen from '../screens/common/SupportScreen';
import SupportTicketsScreen from '../screens/common/SupportTicketsScreen';
import SupportTicketDetailScreen from '../screens/common/SupportTicketDetailScreen';
import { CategoryScreen } from '../screens/client/Category/CategoryScreen';
import RestaurantOrderCartScreen from '../screens/client/Restaurant/RestaurantOrderCartScreen';
import RestaurantOrderTrackingScreen from '../screens/client/Restaurant/RestaurantOrderTrackingScreen';
import MyRestaurantOrdersScreen from '../screens/client/Restaurant/MyRestaurantOrdersScreen';

const Stack = createNativeStackNavigator<ClientStackParamList>();

export function ClientStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SectorScreen" component={SectorScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ResidencesCategory" component={CategoryScreen} options={{ headerShown: false }} initialParams={{ category: 'residence' }} />
      <Stack.Screen name="HotelsCategory" component={CategoryScreen} options={{ headerShown: false }} initialParams={{ category: 'hotel' }} />
      <Stack.Screen name="ImmobilierCategory" component={CategoryScreen} options={{ headerShown: false }} initialParams={{ category: 'immobilier' }} />
      <Stack.Screen name="RestaurantsCategory" component={CategoryScreen} options={{ headerShown: false }} initialParams={{ category: 'restaurant' }} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="VirtualTour" component={VirtualTourScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Booking" component={BookingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GeniusPayWebView" component={GeniusPayWebViewScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: 'Mes réservations' }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Détail réservation' }} />
      <Stack.Screen name="Conversations" component={ConversationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Referral" component={ReferralScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: 'Laisser un avis' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Modifier mon profil' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Mot de passe' }} />
      <Stack.Screen name="TwoFactorSetup" component={TwoFactorSetupScreen} options={{ title: 'Authentification 2FA' }} />
      <Stack.Screen name="LegalLinks" component={LegalLinksScreen} options={{ title: 'Informations légales' }} />
      <Stack.Screen name="MyReviews" component={MyReviewsScreen} options={{ title: 'Mes avis' }} />
      <Stack.Screen name="ReceivedRatings" component={ReceivedRatingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DisputeList" component={DisputeListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DisputeDetail" component={DisputeDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NewDispute" component={NewDisputeScreen} options={{ title: 'Signaler un problème' }} />
      <Stack.Screen name="SupportChatbot" component={SupportChatbotScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SupportTickets" component={SupportTicketsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SupportTicketDetail" component={SupportTicketDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RestaurantOrderCart" component={RestaurantOrderCartScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RestaurantOrderTracking" component={RestaurantOrderTrackingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MyRestaurantOrders" component={MyRestaurantOrdersScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
