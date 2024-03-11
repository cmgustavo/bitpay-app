import React, {useEffect, useRef} from 'react';
import {
  isAcceptedUrl,
  useAppDispatch,
  useAppSelector,
} from '../../../utils/hooks';
import BaseModal from '../base/BaseModal';
import {dismissInAppMessage} from '../../../store/app/app.actions';
import haptic from '../../haptic-feedback/haptic';
import WebView, {WebViewMessageEvent} from 'react-native-webview';
import Braze from 'react-native-appboy-sdk';
import {LogActions} from '../../../store/log';
import {incomingData} from '../../../store/scan/scan.effects';
import {sleep} from '../../../utils/helper-methods';
import {navigationRef} from '../../../Root';
import {HEIGHT, WIDTH} from '../../styled/Containers';
import {Linking, StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    padding: 0,
  },
  webview: {
    backgroundColor: 'transparent',
  },
});

const InAppMessage: React.FC = () => {
  const dispatch = useAppDispatch();
  const isVisible = useAppSelector(({APP}) => APP.showInAppMessage);
  const appWasInit = useAppSelector(({APP}) => APP.appWasInit);
  const inAppMessageData = useAppSelector(({APP}) => APP.inAppMessageData);
  const [inAppHtml, setInAppHtml] = React.useState<any>('');
  const webviewRef = useRef<WebView>(null);

  useEffect(() => {
    if (inAppMessageData) {
      setInAppHtml(JSON.parse(inAppMessageData).message);
      Braze.logInAppMessageImpression(JSON.parse(inAppMessageData));
    }
  }, [inAppMessageData]);

  const onBackdropPress = () => {
    haptic('impactLight');
    dispatch(dismissInAppMessage());
  };

  const goToUrl = async (url: string) => {
    await dispatch(dismissInAppMessage());
    await sleep(100);
    navigationRef.navigate('Tabs', {screen: 'Home'});
    dispatch(incomingData(url));
  };

  const openExternalLink = (req: any) => {
    if (isAcceptedUrl(req.url)) {
      goToUrl(req.url);
      return false;
    } else if (req.url.includes('http')) {
      Linking.openURL(req.url);
      return false;
    } else {
      return true;
    }
  };

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const {buttonId, index} = JSON.parse(e.nativeEvent.data);
      LogActions.debug(`InAppMessage onClick event... ${buttonId}`);
      if (inAppMessageData) {
        Braze.logInAppMessageButtonClicked(JSON.parse(inAppMessageData), index);
      }
      onBackdropPress();
    } catch (err) {
      LogActions.error(`onInAppMessage Error: ${err}`);
    }
  };

  const injectedJavaScript = `
    document.querySelectorAll('[data-button-id]').forEach(function (node, index) {
      node.addEventListener('click', function () {
        const data = JSON.stringify({buttonId: node.dataset.buttonId, index: index});
        window.ReactNativeWebView.postMessage(data);
      });
    });
  `;

  return (
    <BaseModal
      id={'inAppMessage'}
      deviceHeight={HEIGHT}
      deviceWidth={WIDTH}
      isVisible={appWasInit && isVisible}
      backdropOpacity={0.5}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      style={styles.modal}
      onBackdropPress={onBackdropPress}>
      <WebView
        ref={webviewRef}
        style={styles.webview}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={openExternalLink}
        injectedJavaScript={injectedJavaScript}
        originWhitelist={['*']}
        automaticallyAdjustContentInsets
        mixedContentMode={'always'}
        javaScriptEnabled={true}
        source={{html: inAppHtml || ''}}
        allowsBackForwardNavigationGestures
      />
    </BaseModal>
  );
};

export default InAppMessage;
