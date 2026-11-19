import React from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { HEADER_BG, HEADER_FG } from '../../theme/header';
import { BrandStackHeader } from './BrandStackHeader';

/** Options des en-têtes natifs (react-navigation) : en-tête Primeo personnalisé (dégradé, coins arrondis). */
export const NATIVE_HEADER_OPTIONS: NativeStackNavigationOptions = {
  header: (props) => <BrandStackHeader {...props} />,
  headerStyle: { backgroundColor: HEADER_BG },
  headerTintColor: HEADER_FG,
  headerTitleAlign: 'center',
  headerShadowVisible: false,
};
