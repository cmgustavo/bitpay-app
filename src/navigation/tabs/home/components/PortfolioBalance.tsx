import React from 'react';
import styled from 'styled-components/native';
import {BaseText, H2} from '../../../../components/styled/Text';
import {Black, LuckySevens, SlateDark, White} from '../../../../styles/colors';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import {
  calculatePercentageDifference,
  formatFiatAmount,
} from '../../../../utils/helper-methods';
import InfoSvg from '../../../../../assets/img/info.svg';
import {useAppSelector} from '../../../../utils/hooks';
import Percentage from '../../../../components/percentage/Percentage';
import {COINBASE_ENV} from '../../../../api/coinbase/coinbase.constants';
import {useTranslation} from 'react-i18next';

const PortfolioContainer = styled.View`
  justify-content: center;
  align-items: center;
`;

const PortfolioBalanceHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const PortfolioBalanceTitle = styled(BaseText)`
  margin-right: 5px;
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const PortfolioBalanceText = styled(BaseText)`
  font-weight: bold;
  font-size: 31px;
  color: ${({theme}) => theme.colors.text};
`;

const PercentageText = styled(BaseText)`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? LuckySevens : Black)};
`;

const PercentageContainer = styled.View`
  flex-direction: row;
`;

const PortfolioBalance = () => {
  const {t} = useTranslation();
  const coinbaseBalance =
    useAppSelector(({COINBASE}) => COINBASE.balance[COINBASE_ENV]) || 0.0;
  const portfolioBalance = useSelector(
    ({WALLET}: RootState) => WALLET.portfolioBalance,
  );

  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);

  const totalBalance: number = portfolioBalance.current + coinbaseBalance;

  const percentageDifference = calculatePercentageDifference(
    portfolioBalance.current,
    portfolioBalance.lastDay,
  );

  return (
    <PortfolioContainer>
      <PortfolioBalanceHeader>
        <PortfolioBalanceTitle>{t('Portfolio Balance')}</PortfolioBalanceTitle>
        <InfoSvg width={12} height={12} />
      </PortfolioBalanceHeader>
      {!hideAllBalances ? (
        <>
          <PortfolioBalanceText>
            {formatFiatAmount(totalBalance, defaultAltCurrency.isoCode, {
              currencyDisplay: 'symbol',
            })}
          </PortfolioBalanceText>
          {percentageDifference ? (
            <PercentageContainer>
              <Percentage percentageDifference={percentageDifference} />
              <PercentageText> {t('Last Day')}</PercentageText>
            </PercentageContainer>
          ) : null}
        </>
      ) : (
        <H2>****</H2>
      )}
    </PortfolioContainer>
  );
};

export default PortfolioBalance;
