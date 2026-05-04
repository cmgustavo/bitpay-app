import React from 'react';
import {SvgProps} from 'react-native-svg';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {H2, H3, Paragraph} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
import {ScreenGutter} from '../../../components/styled/Containers';
import {
  Caution25,
  Success25,
  Warning25,
  SlateDark,
  NeutralSlate,
  Feather,
  LightBlack,
} from '../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {SumSubEffects} from '../../../store/sumsub';
import {navigationRef, RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';
import IconKycStatusVerified from '../../../../assets/img/kyc_status_verified.svg';
import IconKycStatusPending from '../../../../assets/img/kyc_status_pending.svg';
import IconKycStatusDenied from '../../../../assets/img/kyc_status_denied.svg';
import IconKycGetVerified from '../../../../assets/img/kyc_get_verified.svg';

const Container = styled(SafeAreaView)`
  flex: 1;
`;

const Content = styled.View`
  flex: 1;
  padding: 0 ${ScreenGutter};
`;

const IconStatus = styled.View`
  margin-bottom: 8px;
`;

const Title = styled(H3)`
  text-align: left;
`;

const Body = styled(Paragraph)`
  text-align: left;
  color: ${({theme: {dark}}) => (dark ? NeutralSlate : SlateDark)};
  line-height: 22px;
`;

const ButtonContainer = styled.View`
  position: absolute;
  bottom: 40px;
  left: ${ScreenGutter};
  right: ${ScreenGutter};
`;

const GetVerifiedTitle = styled(H2)`
  text-align: left;
  margin-bottom: 24px;
`;

const IllustrationContainer = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Feather)};
  border-radius: 12px;
  padding: 24px;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
`;

type KycState = 'actionRequired' | 'denied' | 'inReview' | 'success';

type KycStateConfig = {
  icon: React.FC<SvgProps>;
  iconBg: string;
  titleKey: string;
  bodyKey: string;
};

const STATE_CONFIG: Record<KycState, KycStateConfig> = {
  actionRequired: {
    icon: IconKycStatusPending,
    iconBg: Warning25,
    titleKey: 'Action required on your application',
    bodyKey: 'Click the button below to resume your application.',
  },
  denied: {
    icon: IconKycStatusDenied,
    iconBg: Caution25,
    titleKey: 'Application Denied',
    bodyKey:
      'Your account was denied. You will not be able to use BitPay products or services.',
  },
  inReview: {
    icon: IconKycStatusPending,
    iconBg: Warning25,
    titleKey: 'Application in Review',
    bodyKey:
      'Your application is in review, please wait for an email to get your updated status.',
  },
  success: {
    icon: IconKycStatusVerified,
    iconBg: Success25,
    titleKey: 'Application Success',
    bodyKey:
      'Your account was approved! You may now continue to use BitPay products and services.',
  },
};

const goHome = () => {
  navigationRef.navigate(RootStacks.TABS, {screen: TabsScreens.HOME});
};

export const VerifyIdentityScreen: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const network = useAppSelector(({APP}) => APP.network);
  const kycStatus = useAppSelector(({SUMSUB}) => SUMSUB.kycStatus?.[network]);

  const isApproved = kycStatus === 'Approved';

  let state: KycState;
  if (isApproved) {
    state = 'success';
  } else if (kycStatus === 'FinallyRejected') {
    state = 'denied';
  } else if (kycStatus === 'Pending') {
    state = 'inReview';
  } else {
    state = 'actionRequired';
  }

  const {icon: Icon, titleKey, bodyKey} = STATE_CONFIG[state];

  const handleResume = () => {
    dispatch(SumSubEffects.startKycVerification());
  };

  if (state === 'actionRequired') {
    return (
      <Container>
        <Content>
          <GetVerifiedTitle>{t('Get verified')}</GetVerifiedTitle>
          <IllustrationContainer>
            <IconKycGetVerified width={214} height={217} />
          </IllustrationContainer>
          <Body>
            {t(
              "To keep your account secure and compliant, we'll need to collect a few additional pieces of information. These quick steps help protect your funds, enable payments, and meet regulatory requirements.",
            )}
          </Body>
        </Content>

        <ButtonContainer>
          <Button onPress={handleResume}>{t('Verify My Identity')}</Button>
        </ButtonContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Content>
        <IconStatus>{Icon && <Icon />}</IconStatus>
        <Title>{t(titleKey)}</Title>
        <Body>{t(bodyKey)}</Body>
      </Content>

      <ButtonContainer>
        <Button onPress={goHome}>{t('Go Home')}</Button>
      </ButtonContainer>
    </Container>
  );
};

export default VerifyIdentityScreen;
