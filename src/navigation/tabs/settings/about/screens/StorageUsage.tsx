import React, {useMemo, useState} from 'react';
import styled from 'styled-components/native';
import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import {forEach} from 'lodash';
import {SettingsComponent} from '../../SettingsRoot';
import {
  Hr,
  ScreenGutter,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import Button from '../../../../../components/button/Button';
import {useTranslation} from 'react-i18next';
import {LogActions} from '../../../../../store/log';
import {Black, Feather, LightBlack, White} from '../../../../../styles/colors';
import {useAppSelector} from '../../../../../utils/hooks';
import {APP_NETWORK} from '../../../../../constants/config';

const HeaderTitle = styled(Setting)`
  margin-top: 20px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Feather)};
  padding: 0 ${ScreenGutter};
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const StorageContainer = styled.ScrollView`
  flex: 1;
`;

const storagePath =
  Platform.OS === 'ios' ? RNFS.MainBundlePath : RNFS.DocumentDirectoryPath;

const StorageUsage: React.VFC = () => {
  const {t} = useTranslation();

  const [walletsCount, setWalletsCount] = useState<number>(0);
  const [giftCount, setGiftCount] = useState<number>(0);
  const [contactCount, setContactCount] = useState<number>(0);
  const [customTokenCount, setCustomTokenCount] = useState<number>(0);

  const [appSize, setAppSize] = useState<string>('');
  const [deviceFreeStorage, setDeviceFreeStorage] = useState<string>('');
  const [deviceTotalStorage, setDeviceTotalStorage] = useState<string>('');
  const [giftCardtStorage, setGiftCardStorage] = useState<string>('');
  const [walletStorage, setWalletStorage] = useState<string>('');
  const [customTokenStorage, setCustomTokenStorage] = useState<string>('');
  const [contactStorage, setContactStorage] = useState<string>('');

  const [tokenCacheSize, setTokenCacheSize] = useState<string>('');
  const [customTokenCacheSize, setCustomTokenCacheSize] = useState<string>('');
  const [ratesCacheSize, setRatesCacheSize] = useState<string>('');

  const giftCards = useAppSelector(({SHOP}) => SHOP.giftCards[APP_NETWORK]);
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const customTokens = useAppSelector(({WALLET}) => WALLET.customTokenData);
  const contacts = useAppSelector(({CONTACT}) => CONTACT.list);

  const tokenCache = useAppSelector(({WALLET}) => {
    return {
      ...WALLET.tokenData,
      ...WALLET.tokenOptions,
      ...WALLET.tokenOptionsByAddress,
    };
  });

  const customTokenCache = useAppSelector(({WALLET}) => {
    return {
      ...WALLET.customTokenData,
      ...WALLET.customTokenOptions,
      ...WALLET.customTokenOptionsByAddress,
    };
  });

  const ratesCache = useAppSelector(({RATE}) => {
    return {
      ...RATE.rates,
      ...RATE.priceHistory,
      ...RATE.ratesByDateRange,
    };
  });

  const formatBytes = (bytes: number, decimals = 2): string => {
    if (!+bytes) {
      return '0 Bytes';
    }

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const getSize = async (filePath: string, data: string): Promise<number> => {
    try {
      await RNFS.writeFile(filePath, data);
      const file = await RNFS.stat(filePath);
      await RNFS.unlink(filePath); // Delete
      return Promise.resolve(file.size);
    } catch (err) {
      return Promise.reject(err);
    }
  };

  useMemo(async () => {
    try {
      // App Data Storage
      const resultStorage = await RNFS.readDir(storagePath);
      let _appSize: number = 0;
      forEach(resultStorage, data => {
        _appSize = _appSize + data.size;
      });
      setAppSize(formatBytes(_appSize));

      // Device Storage
      const resultDeviceStorage = await RNFS.getFSInfo();
      if (resultDeviceStorage) {
        setDeviceFreeStorage(formatBytes(resultDeviceStorage.freeSpace));
        setDeviceTotalStorage(formatBytes(resultDeviceStorage.totalSpace));
      }

      // Data counter
      const wallets = Object.values(keys).map(k => {
        const {wallets} = k;
        return wallets.length;
      });
      const walletsCount = wallets.reduce((a, b) => a + b, 0);
      setWalletsCount(walletsCount);
      setGiftCount(giftCards.length);
      setContactCount(contacts.length);
      const _customTokenCount = Object.values(customTokens).length;
      setCustomTokenCount(_customTokenCount);

      // Specific Data Storage
      const _walletStorageSize = await getSize(
        RNFS.TemporaryDirectoryPath + '/wallets.txt',
        JSON.stringify(keys),
      );
      setWalletStorage(formatBytes(_walletStorageSize));

      const _giftCardStorageSize = await getSize(
        RNFS.TemporaryDirectoryPath + '/gift-cards.txt',
        JSON.stringify(giftCards),
      );
      setGiftCardStorage(formatBytes(_giftCardStorageSize));

      const _customTokenStorageSize = await getSize(
        RNFS.TemporaryDirectoryPath + '/custom-tokens.txt',
        JSON.stringify(customTokens),
      );
      setCustomTokenStorage(formatBytes(_customTokenStorageSize));

      const _contactStorageSize = await getSize(
        RNFS.TemporaryDirectoryPath + '/contacts.txt',
        JSON.stringify(contacts),
      );
      setContactStorage(formatBytes(_contactStorageSize));

      // Cache
      const _tokenSize = await getSize(
        RNFS.TemporaryDirectoryPath + '/tokens.txt',
        JSON.stringify(tokenCache),
      );
      setTokenCacheSize(formatBytes(_tokenSize));
      const _customTokenSize = await getSize(
        RNFS.TemporaryDirectoryPath + '/custom-tokens.txt',
        JSON.stringify(customTokenCache),
      );
      setCustomTokenCacheSize(formatBytes(_customTokenSize));
      const _ratesSize = await getSize(
        RNFS.TemporaryDirectoryPath + '/rates.txt',
        JSON.stringify(ratesCache),
      );
      setRatesCacheSize(formatBytes(_ratesSize));
    } catch (err) {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      LogActions.error('[StorageUsage] Error ', errStr);
    }
  }, []);

  return (
    <StorageContainer>
      <HeaderTitle>
        <SettingTitle>{t('Total Size')}</SettingTitle>
      </HeaderTitle>
      <SettingsComponent>
        <Setting>
          <SettingTitle>BitPay</SettingTitle>

          <Button buttonType="pill">{appSize}</Button>
        </Setting>

        <Hr />

        <Setting>
          <SettingTitle>{t('Free Disk Storage')}</SettingTitle>

          <Button buttonType="pill">{deviceFreeStorage}</Button>
        </Setting>

        <Hr />
        <Setting>
          <SettingTitle>{t('Total Disk Storage')}</SettingTitle>

          <Button buttonType="pill">{deviceTotalStorage}</Button>
        </Setting>
      </SettingsComponent>
      <HeaderTitle>
        <SettingTitle>{t('Data')}</SettingTitle>
      </HeaderTitle>
      <SettingsComponent>
        <Setting>
          <SettingTitle>
            {t('Wallets')} ({walletsCount || '0'})
          </SettingTitle>

          <Button buttonType="pill">{walletStorage}</Button>
        </Setting>

        <Hr />
        <Setting>
          <SettingTitle>
            {t('Gift Cards')} ({giftCount || '0'})
          </SettingTitle>

          <Button buttonType="pill">{giftCardtStorage}</Button>
        </Setting>

        <Hr />
        <Setting>
          <SettingTitle>
            {t('Custom Tokens')} ({customTokenCount || '0'})
          </SettingTitle>

          <Button buttonType="pill">{customTokenStorage}</Button>
        </Setting>

        <Hr />
        <Setting>
          <SettingTitle>
            {t('Contacts')} ({contactCount || '0'})
          </SettingTitle>

          <Button buttonType="pill">{contactStorage}</Button>
        </Setting>
      </SettingsComponent>
      <HeaderTitle>
        <SettingTitle>{t('Cached')}</SettingTitle>
      </HeaderTitle>
      <SettingsComponent>
        <Setting>
          <SettingTitle>Rates</SettingTitle>

          <Button buttonType="pill">{ratesCacheSize}</Button>
        </Setting>

        <Hr />

        <Setting>
          <SettingTitle>{t('Tokens')}</SettingTitle>

          <Button buttonType="pill">{tokenCacheSize}</Button>
        </Setting>

        <Hr />
        <Setting>
          <SettingTitle>{t('Custom Tokens')}</SettingTitle>

          <Button buttonType="pill">{customTokenCacheSize}</Button>
        </Setting>
      </SettingsComponent>
    </StorageContainer>
  );
};

export default StorageUsage;
