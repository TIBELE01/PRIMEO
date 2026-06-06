import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import type { AuthScreenProps } from '../../../navigation/types';
import { Step1AccountType } from './Step1AccountType';
import { Step2PersonalInfo } from './Step2PersonalInfo';
import { Step3ProfessionalInfo } from './Step3ProfessionalInfo';
import { Step4KycDocuments } from './Step4KycDocuments';
import { Step5Validation } from './Step5Validation';

export type RegistrationData = {
  accountType: 'client' | 'professional_hebergement' | 'professional_hotel' | 'professional_immobilier' | 'restaurateur' | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  businessAddress: string;
  rccm: string;
  taxNumber: string;
  kycDocuments: Array<{ key: string; uri: string; name: string }>;
  acceptedTerms: boolean;
  referralCode?: string;
};

const initialData: RegistrationData = {
  accountType: null,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  businessName: '',
  businessAddress: '',
  rccm: '',
  taxNumber: '',
  kycDocuments: [],
  acceptedTerms: false,
  referralCode: '',
};

type Props = AuthScreenProps<'Register'>;

export function RegisterScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  // When role='client' is passed (from LoginScreen), skip account type selection.
  const isPresetClient = route?.params?.role === 'client';
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RegistrationData>({
    ...initialData,
    accountType: isPresetClient ? 'client' : null,
  });

  const isPro = data.accountType !== null && data.accountType !== 'client';
  const totalSteps = isPresetClient ? 2 : (isPro ? 5 : 3);

  const updateData = (patch: Partial<RegistrationData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const goNext = () => setStep((s) => s + 1);
  const goBack = () => {
    if (step === 1) navigation.goBack();
    else setStep((s) => s - 1);
  };

  const stepProps = { data, onUpdate: updateData, onNext: goNext, onBack: goBack, currentStep: step, totalSteps };

  const renderStep = () => {
    if (isPresetClient) {
      switch (step) {
        case 1: return <Step2PersonalInfo {...stepProps} />;
        case 2: return <Step5Validation {...stepProps} navigation={navigation} />;
        default: return null;
      }
    }
    switch (step) {
      case 1: return <Step1AccountType {...stepProps} />;
      case 2: return <Step2PersonalInfo {...stepProps} />;
      case 3: return isPro
        ? <Step3ProfessionalInfo {...stepProps} />
        : <Step5Validation {...stepProps} navigation={navigation} />;
      case 4: return <Step4KycDocuments {...stepProps} />;
      case 5: return <Step5Validation {...stepProps} navigation={navigation} />;
      default: return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {renderStep()}
    </View>
  );
}

export default RegisterScreen;
