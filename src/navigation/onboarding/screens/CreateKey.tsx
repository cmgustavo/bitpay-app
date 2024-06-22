import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useLayoutEffect, useRef} from 'react';
import {ScrollView} from 'react-native';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import styled from 'styled-components/native';
import {OnboardingImage} from '../components/Containers';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  ActionContainer,
  CtaContainer,
  HeaderRightContainer,
  ImageContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingGroupParamList, OnboardingScreens} from '../OnboardingGroup';
import {useTranslation} from 'react-i18next';
import {
  useAppDispatch,
  useAppSelector,
  useRequestTrackingPermissionHandler,
} from '../../../utils/hooks';
import {AppActions} from '../../../store/app';

const CreateKeyContainer = styled.SafeAreaView`
  flex: 1;
  align-items: stretch;
`;
const KeyImage = {
  light: (
    <OnboardingImage
      style={{width: 212, height: 247}}
      source={require('../../../../assets/img/onboarding/light/create-wallet.png')}
    />
  ),
  dark: (
    <OnboardingImage
      style={{width: 189, height: 247}}
      source={require('../../../../assets/img/onboarding/dark/create-wallet.png')}
    />
  ),
};

const CreateOrImportKey = ({
  navigation,
}: NativeStackScreenProps<
  OnboardingGroupParamList,
  OnboardingScreens.CREATE_KEY
>) => {
  const {t} = useTranslation();
  const themeType = useThemeType();
  const dispatch = useAppDispatch();
  const isImportLedgerModalVisible = useAppSelector(
    ({APP}) => APP.isImportLedgerModalVisible,
  );
  const {keys} = useAppSelector(({WALLET}) => WALLET);

  useAndroidBackHandler(() => true);

  const askForTrackingThenNavigate = useRequestTrackingPermissionHandler();

  const onSkipPressRef = useRef(() => {
    haptic('impactLight');
    askForTrackingThenNavigate(() => {
      navigation.navigate('TermsOfUse', {context: 'TOUOnly'});
    });
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft: () => null,
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            accessibilityLabel="skip-button"
            buttonType={'pill'}
            onPress={onSkipPressRef.current}>
            {t('Skip')}
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation, t]);

  useEffect(() => {
    if (!isImportLedgerModalVisible && Object.values(keys).length > 0) {
      navigation.navigate('TermsOfUse');
    }
  }, [isImportLedgerModalVisible]);
  return (
    <CreateKeyContainer accessibilityLabel="create-key-view">
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
        }}>
        <ImageContainer>{KeyImage[themeType]}</ImageContainer>
        <TitleContainer>
          <TextAlign align={'center'}>
            <H3>{t('Create a key or import an existing key')}</H3>
          </TextAlign>
        </TitleContainer>
        <TextContainer>
          <TextAlign align={'center'}>
            <Paragraph>
              {t(
                "Store your assets safely and securely with BitPay's non-custodial app. Reminder: you own your keys, so be sure to have a pen and paper handy to write down your 12 words.",
              )}
            </Paragraph>
          </TextAlign>
        </TextContainer>
        <CtaContainer accessibilityLabel="cta-container">
          <ActionContainer>
            <Button
              accessibilityLabel="create-a-key-button"
              buttonStyle={'primary'}
              onPress={() => {
                askForTrackingThenNavigate(() =>
                  navigation.navigate('CurrencySelection', {
                    context: 'onboarding',
                  }),
                );
              }}>
              {t('Create a Key')}
            </Button>
          </ActionContainer>
          <ActionContainer>
            <Button
              accessibilityLabel="i-already-have-a-key-button"
              buttonStyle={'secondary'}
              onPress={() => {
                askForTrackingThenNavigate(() =>
                  navigation.navigate('Import', {
                    context: 'onboarding',
                  }),
                );
              }}>
              {t('I already have a Key')}
            </Button>
          </ActionContainer>
          {/*<ActionContainer>*/}
          {/*  <Button*/}
          {/*    buttonStyle={'secondary'}*/}
          {/*    onPress={() => {*/}
          {/*      dispatch(AppActions.importLedgerModalToggled(true));*/}
          {/*    }}>*/}
          {/*    {t('Connect your Ledger Nano X')}*/}
          {/*  </Button>*/}
          {/*</ActionContainer>*/}
        </CtaContainer>
      </ScrollView>
    </CreateKeyContainer>
  );
};

export default CreateOrImportKey;
