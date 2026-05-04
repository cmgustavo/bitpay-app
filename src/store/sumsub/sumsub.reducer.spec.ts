/**
 * Tests for sumsub.reducer.ts and sumsub.actions.ts
 */

import {Network} from '../../constants';
import {sumSubReducer, SumSubState} from './sumsub.reducer';
import {setKycStatus, resetKycStatus} from './sumsub.actions';
import {SumSubActionTypes} from './sumsub.types';

const emptyKycStatus = {
  [Network.mainnet]: null,
  [Network.testnet]: null,
  [Network.regtest]: null,
};

describe('sumsub action creators', () => {
  it('setKycStatus builds a SET_KYC_STATUS action', () => {
    expect(setKycStatus(Network.mainnet, 'Approved')).toEqual({
      type: SumSubActionTypes.SET_KYC_STATUS,
      payload: {network: Network.mainnet, status: 'Approved'},
    });
  });

  it('resetKycStatus builds a RESET_KYC_STATUS action', () => {
    expect(resetKycStatus(Network.testnet)).toEqual({
      type: SumSubActionTypes.RESET_KYC_STATUS,
      payload: {network: Network.testnet},
    });
  });
});

describe('sumSubReducer', () => {
  it('returns the initial state for an unknown action', () => {
    const state = sumSubReducer(undefined, {type: 'UNKNOWN'} as any);
    expect(state.kycStatus).toEqual(emptyKycStatus);
  });

  it('SET_KYC_STATUS stores the status for the given network', () => {
    const state = sumSubReducer(
      undefined,
      setKycStatus(Network.mainnet, 'Pending'),
    );
    expect(state.kycStatus[Network.mainnet]).toBe('Pending');
  });

  it('SET_KYC_STATUS does not affect other networks', () => {
    const seeded: SumSubState = {
      kycStatus: {...emptyKycStatus, [Network.testnet]: 'Approved'},
    };
    const state = sumSubReducer(
      seeded,
      setKycStatus(Network.mainnet, 'FinallyRejected'),
    );
    expect(state.kycStatus[Network.mainnet]).toBe('FinallyRejected');
    expect(state.kycStatus[Network.testnet]).toBe('Approved');
  });

  it('RESET_KYC_STATUS clears only the given network', () => {
    const seeded: SumSubState = {
      kycStatus: {
        ...emptyKycStatus,
        [Network.mainnet]: 'Approved',
        [Network.testnet]: 'Pending',
      },
    };
    const state = sumSubReducer(seeded, resetKycStatus(Network.mainnet));
    expect(state.kycStatus[Network.mainnet]).toBeNull();
    expect(state.kycStatus[Network.testnet]).toBe('Pending');
  });

  it('rehydrates a missing kycStatus map before applying an action', () => {
    // Simulates a persisted state shape from before kycStatus existed.
    const legacy = {} as SumSubState;
    const state = sumSubReducer(
      legacy,
      setKycStatus(Network.mainnet, 'Initial'),
    );
    expect(state.kycStatus[Network.mainnet]).toBe('Initial');
    expect(state.kycStatus[Network.testnet]).toBeNull();
  });

  it('does not mutate the previous state', () => {
    const prev = sumSubReducer(undefined, {type: '@@INIT'} as any);
    const next = sumSubReducer(prev, setKycStatus(Network.mainnet, 'Approved'));
    expect(next).not.toBe(prev);
    expect(prev.kycStatus[Network.mainnet]).toBeNull();
  });
});
