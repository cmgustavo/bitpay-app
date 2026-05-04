/**
 * Tests for sumsub.effects.ts
 */

import configureTestStore from '@test/store';
import {Network} from '../../constants';
import {
  startKycVerification,
  startGetKycStatus,
  mapBackendKycStatus,
} from './sumsub.effects';
import {SumSubApi} from '../../api/sumsub';
import {launchSumSubSdk} from '../../lib/sumsub';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../managers/LogManager', () => ({
  logManager: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../api/sumsub', () => ({
  SumSubApi: {
    fetchAccessToken: jest.fn(),
    fetchKycStatus: jest.fn(),
  },
}));

jest.mock('../../lib/sumsub', () => ({
  launchSumSubSdk: jest.fn(),
}));

const mockFetchAccessToken = SumSubApi.fetchAccessToken as jest.Mock;
const mockFetchKycStatus = SumSubApi.fetchKycStatus as jest.Mock;
const mockLaunchSumSubSdk = launchSumSubSdk as jest.Mock;

// ---------------------------------------------------------------------------
// Helper: build a store seeded with a logged-in user
// ---------------------------------------------------------------------------
const EID = 'user-eid-123';
const API_TOKEN = 'api-token-xyz';
const ACCESS_TOKEN = 'sumsub-access-token';

const makeLoggedInStore = () =>
  configureTestStore({
    APP: {network: Network.mainnet},
    BITPAY_ID: {
      user: {[Network.mainnet]: {eid: EID}},
      apiToken: {[Network.mainnet]: API_TOKEN},
    },
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchAccessToken.mockResolvedValue(ACCESS_TOKEN);
  mockLaunchSumSubSdk.mockResolvedValue({success: true, status: 'Approved'});
});

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------
describe('startKycVerification — auth guard', () => {
  it('returns early without launching the SDK when there is no user', async () => {
    const store = configureTestStore({
      APP: {network: Network.mainnet},
      BITPAY_ID: {user: {}, apiToken: {[Network.mainnet]: API_TOKEN}},
    });

    await store.dispatch(startKycVerification());

    expect(mockFetchAccessToken).not.toHaveBeenCalled();
    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
    expect(store.getState().SUMSUB.kycStatus[Network.mainnet]).toBeNull();
  });

  it('returns early without launching the SDK when there is no apiToken', async () => {
    const store = configureTestStore({
      APP: {network: Network.mainnet},
      BITPAY_ID: {user: {[Network.mainnet]: {eid: EID}}, apiToken: {}},
    });

    await store.dispatch(startKycVerification());

    expect(mockFetchAccessToken).not.toHaveBeenCalled();
    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------
describe('startKycVerification — happy path', () => {
  it('fetches an access token for the current network/user and launches the SDK', async () => {
    const store = makeLoggedInStore();

    await store.dispatch(startKycVerification());

    expect(mockFetchAccessToken).toHaveBeenCalledWith(API_TOKEN);
    expect(mockLaunchSumSubSdk).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      expect.any(Function),
      'en',
    );
  });

  it('launches the SDK with the app language from APP.defaultLanguage', async () => {
    const store = configureTestStore({
      APP: {network: Network.mainnet, defaultLanguage: 'es'},
      BITPAY_ID: {
        user: {[Network.mainnet]: {eid: EID}},
        apiToken: {[Network.mainnet]: API_TOKEN},
      },
    });

    await store.dispatch(startKycVerification());

    expect(mockLaunchSumSubSdk).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      expect.any(Function),
      'es',
    );
  });

  it('persists the returned verification status into SUMSUB.kycStatus', async () => {
    const store = makeLoggedInStore();
    mockLaunchSumSubSdk.mockResolvedValue({success: true, status: 'Pending'});

    await store.dispatch(startKycVerification());

    expect(store.getState().SUMSUB.kycStatus[Network.mainnet]).toBe('Pending');
  });

  it('passes a token-refresh callback that re-fetches the access token', async () => {
    const store = makeLoggedInStore();

    await store.dispatch(startKycVerification());

    // The 2nd arg to launchSumSubSdk is the onTokenExpired callback.
    const onTokenExpired = mockLaunchSumSubSdk.mock.calls[0][1];
    mockFetchAccessToken.mockClear();
    const refreshed = await onTokenExpired();

    expect(refreshed).toBe(ACCESS_TOKEN);
    expect(mockFetchAccessToken).toHaveBeenCalledWith(API_TOKEN);
  });
});

// ---------------------------------------------------------------------------
// Failure / edge cases
// ---------------------------------------------------------------------------
describe('startKycVerification — failure handling', () => {
  it('shows an error modal and does not persist a status when the SDK returns "Failed"', async () => {
    const store = makeLoggedInStore();
    mockLaunchSumSubSdk.mockResolvedValue({
      success: false,
      status: 'Failed',
      errorType: 'NetworkError',
      errorMsg: 'boom',
    });

    await store.dispatch(startKycVerification());

    expect(store.getState().APP.showBottomNotificationModal).toBe(true);
    expect(store.getState().SUMSUB.kycStatus[Network.mainnet]).toBeNull();
  });

  it('ignores statuses that are not recognized verification statuses', async () => {
    const store = makeLoggedInStore();
    mockLaunchSumSubSdk.mockResolvedValue({
      success: true,
      status: 'SomethingUnknown',
    });

    await store.dispatch(startKycVerification());

    expect(store.getState().SUMSUB.kycStatus[Network.mainnet]).toBeNull();
  });

  it('resolves (does not reject) when the SDK throws', async () => {
    const store = makeLoggedInStore();
    mockLaunchSumSubSdk.mockRejectedValue(new Error('SDK exploded'));

    await expect(
      store.dispatch(startKycVerification()),
    ).resolves.toBeUndefined();
    expect(store.getState().SUMSUB.kycStatus[Network.mainnet]).toBeNull();
  });

  it('does not launch the SDK when the token is null (user not eligible)', async () => {
    const store = makeLoggedInStore();
    mockFetchAccessToken.mockResolvedValue(null);

    await store.dispatch(startKycVerification());

    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
    expect(store.getState().SUMSUB.kycStatus[Network.mainnet]).toBeNull();
    expect(store.getState().APP.showBottomNotificationModal).not.toBe(true);
  });

  it('resolves when fetching the access token fails', async () => {
    const store = makeLoggedInStore();
    mockFetchAccessToken.mockRejectedValue(new Error('token endpoint down'));

    await expect(
      store.dispatch(startKycVerification()),
    ).resolves.toBeUndefined();
    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
    expect(store.getState().SUMSUB.kycStatus[Network.mainnet]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mapBackendKycStatus
// ---------------------------------------------------------------------------
describe('mapBackendKycStatus', () => {
  it('maps confirmed backend statuses to the app vocabulary', () => {
    expect(mapBackendKycStatus('approved')).toBe('Approved');
    expect(mapBackendKycStatus('rejected')).toBe('FinallyRejected');
    expect(mapBackendKycStatus('requiresAction')).toBe('Incomplete');
    expect(mapBackendKycStatus('notStarted')).toBeNull();
    expect(mapBackendKycStatus(undefined)).toBeNull();
  });

  it('falls back to Pending for any in-flight/unknown review state', () => {
    expect(mapBackendKycStatus('pendingReview')).toBe('Pending');
    expect(mapBackendKycStatus('inProgress')).toBe('Pending');
    expect(mapBackendKycStatus('somethingNew')).toBe('Pending');
  });
});

// ---------------------------------------------------------------------------
// startGetKycStatus
// ---------------------------------------------------------------------------
describe('startGetKycStatus', () => {
  it('fetches and stores the mapped backend status', async () => {
    const store = makeLoggedInStore();
    mockFetchKycStatus.mockResolvedValue({path: 'sumsub', status: 'approved'});

    await store.dispatch(startGetKycStatus());

    expect(mockFetchKycStatus).toHaveBeenCalledWith(API_TOKEN);
    expect(store.getState().SUMSUB.kycStatus[Network.mainnet]).toBe('Approved');
  });

  it('does nothing when there is no logged-in user', async () => {
    const store = configureTestStore({
      APP: {network: Network.mainnet},
      BITPAY_ID: {user: {}, apiToken: {[Network.mainnet]: API_TOKEN}},
    });

    await store.dispatch(startGetKycStatus());

    expect(mockFetchKycStatus).not.toHaveBeenCalled();
  });

  it('resolves without throwing when the status request fails', async () => {
    const store = makeLoggedInStore();
    mockFetchKycStatus.mockRejectedValue(new Error('status endpoint down'));

    await expect(store.dispatch(startGetKycStatus())).resolves.toBeUndefined();
    expect(store.getState().SUMSUB.kycStatus[Network.mainnet]).toBeNull();
  });
});
