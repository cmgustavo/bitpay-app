import {Effect} from '../index';
import {SumSubApi} from '../../api/sumsub';
import {launchSumSubSdk} from '../../lib/sumsub';
import {LogActions} from '../log';
import {SumSubActions} from './index';
import {SumSubKycStatus} from './sumsub.reducer';
import {showBottomNotificationModal} from '../app/app.actions';
import {CustomErrorMessage} from '../../navigation/wallet/components/ErrorMessages';

// Maps the backend KYC status to the app's SumSubKycStatus. Unknown in-flight
// review states fall back to Pending — a safe default (never verified/rejected).
export const mapBackendKycStatus = (status?: string): SumSubKycStatus => {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'FinallyRejected';
    case 'requiresAction':
      return 'Incomplete';
    case 'notStarted':
    case undefined:
      return null;
    default:
      return 'Pending';
  }
};

// Fetches the authoritative KYC status and stores it, so the status survives app
// restarts and reflects reviews completed outside the app. No-op when logged out.
export const startGetKycStatus =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    const {APP, BITPAY_ID} = getState();
    const network = APP.network;
    const user = BITPAY_ID.user[network];
    const apiToken = BITPAY_ID.apiToken[network];

    if (!user || !apiToken) {
      return;
    }

    try {
      const {status} = await SumSubApi.fetchKycStatus(apiToken);
      const mapped = mapBackendKycStatus(status);
      console.log(`[SumSub] kycStatus: "${status}" → "${mapped}"`);
      dispatch(SumSubActions.setKycStatus(network, mapped));
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(LogActions.error(`[SumSub] Failed to fetch KYC status: ${msg}`));
    }
  };

export const startKycVerification =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    const {APP, BITPAY_ID} = getState();
    const network = APP.network;
    const user = BITPAY_ID.user[network];
    const apiToken = BITPAY_ID.apiToken[network];

    if (!user || !apiToken) {
      dispatch(
        LogActions.error('[SumSub] Cannot start KYC — user not logged in'),
      );
      return;
    }

    const getAccessToken = (): Promise<string | null> =>
      SumSubApi.fetchAccessToken(apiToken);

    try {
      const accessToken = await getAccessToken();

      // Null token → user not eligible (no shopper / tier 1 / already verified).
      // Not an error; just don't launch the SDK.
      if (!accessToken) {
        dispatch(
          LogActions.info(
            '[SumSub] No access token returned — KYC not available for this user.',
          ),
        );
        return;
      }

      // onTokenExpired must resolve to a string; coerce a null refresh to ''.
      const onTokenExpired = async (): Promise<string> =>
        (await getAccessToken()) || '';

      const locale = (APP.defaultLanguage || 'en').split('-')[0];

      const result = await launchSumSubSdk(accessToken, onTokenExpired, locale);

      dispatch(
        LogActions.debug(`[SumSub] SDK closed — status: ${result.status}`),
      );

      if (result.status === 'Failed') {
        const errMsg =
          result.errorMsg || 'The verification process encountered an error.';
        dispatch(
          LogActions.error(
            `[SumSub] SDK failed — errorType: ${result.errorType}, errorMsg: ${result.errorMsg}`,
          ),
        );
        dispatch(showBottomNotificationModal(CustomErrorMessage({errMsg})));
        return;
      }

      const verificationStatuses: string[] = [
        'Initial',
        'Incomplete',
        'Pending',
        'Approved',
        'TemporarilyDeclined',
        'FinallyRejected',
      ];
      if (result.status && verificationStatuses.includes(result.status)) {
        dispatch(SumSubActions.setKycStatus(network, result.status as any));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(LogActions.error(`[SumSub] SDK error: ${msg}`));
    }
  };
