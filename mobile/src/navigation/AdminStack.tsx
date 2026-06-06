// Pile de navigation admin — panneau d'administration PRIMEO
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen         from '../screens/admin/AdminDashboardScreen';
import PropertiesModerationScreen   from '../screens/admin/PropertiesModerationScreen';
import UsersModerationScreen        from '../screens/admin/UsersModerationScreen';
import AdminDisputesScreen          from '../screens/admin/AdminDisputesScreen';
import AdminBookingsScreen          from '../screens/admin/AdminBookingsScreen';

type AdminStackParamList = {
  AdminDashboard:        undefined;
  PropertiesModeration:  undefined;
  UsersModeration:       undefined;
  AdminDisputes:         undefined;
  AdminBookings:         undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard"       component={AdminDashboardScreen} />
      <Stack.Screen name="PropertiesModeration" component={PropertiesModerationScreen} />
      <Stack.Screen name="UsersModeration"      component={UsersModerationScreen} />
      <Stack.Screen name="AdminDisputes"        component={AdminDisputesScreen} />
      <Stack.Screen name="AdminBookings"        component={AdminBookingsScreen} />
    </Stack.Navigator>
  );
}
