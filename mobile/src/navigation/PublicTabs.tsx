import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AuthStackParamList } from './types';

import { PublicHomeScreen } from '../screens/public/PublicHomeScreen';
import { SearchScreen }     from '../screens/client/Search/SearchScreen';
import { PropertyDetailScreen } from '../screens/client/PropertyDetail/PropertyDetailScreen';

import { WelcomeScreen }         from '../screens/auth/WelcomeScreen';
import { LoginScreen }           from '../screens/auth/LoginScreen';
import { RegisterScreen }        from '../screens/auth/RegisterScreen';
import { ProRegisterScreen }     from '../screens/auth/ProRegisterScreen';
import { ForgotPasswordScreen }  from '../screens/auth/ForgotPasswordScreen';
import { OtpVerificationScreen } from '../screens/auth/OtpVerificationScreen';
import { TwoFactorScreen }       from '../screens/auth/TwoFactorScreen';
import { ResetPasswordScreen }   from '../screens/auth/ResetPasswordScreen';

const Tab        = createBottomTabNavigator();
const AuthStack  = createNativeStackNavigator<AuthStackParamList>();
const SearchNav  = createNativeStackNavigator();

function SearchStack() {
  return (
    <SearchNav.Navigator screenOptions={{ headerShown: false }}>
      <SearchNav.Screen name="Search"         component={SearchScreen} />
      <SearchNav.Screen name="PropertyDetail" component={PropertyDetailScreen} />
    </SearchNav.Navigator>
  );
}

function ConnexionStack() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome"         component={WelcomeScreen} />
      <AuthStack.Screen name="Login"           component={LoginScreen} />
      <AuthStack.Screen name="Register"        component={RegisterScreen} />
      <AuthStack.Screen name="ProRegister"     component={ProRegisterScreen} />
      <AuthStack.Screen name="ForgotPassword"  component={ForgotPasswordScreen} />
      <AuthStack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <AuthStack.Screen name="TwoFactor"       component={TwoFactorScreen} />
      <AuthStack.Screen name="ResetPassword"   component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function tabIcon(name: string, outlineName: string) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={(focused ? name : outlineName) as any} size={size} color={color} />
  );
}

export function PublicTabs() {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(8, insets.bottom);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   '#D67309',
        tabBarInactiveTintColor: '#9AA6B8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#F1F5F9',
          height: 48 + safeBottom,
          paddingBottom: safeBottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Accueil"
        component={PublicHomeScreen}
        options={{ tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tab.Screen
        name="Recherche"
        component={SearchStack}
        options={{ tabBarIcon: tabIcon('search', 'search-outline') }}
      />
      <Tab.Screen
        name="Connexion"
        component={ConnexionStack}
        options={{ tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tab.Navigator>
  );
}
