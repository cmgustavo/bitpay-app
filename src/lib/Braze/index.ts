import Braze from '@braze/react-native-sdk';
import axios from 'axios';
import {BRAZE_MERGE_AND_DELETE_API_KEY, BRAZE_REST_API_ENDPOINT} from '@env';

const nonCustomAttributes = [
  'country',
  'dateOfBirth',
  'email',
  'firstName',
  'gender',
  'homeCity',
  'language',
  'lastName',
  'phoneNumber',
] as const;

const setUserAttributes = (attributes: BrazeUserAttributes) => {
  const {
    country,
    dateOfBirth,
    email,
    firstName,
    gender,
    homeCity,
    language,
    lastName,
    phoneNumber,
    ...customAttributes
  } = attributes;

  if (typeof country !== 'undefined') {
    Braze.setCountry(country);
  }

  if (typeof dateOfBirth !== 'undefined') {
    const asDate = new Date(dateOfBirth);
    const year = asDate.getFullYear();
    const month = (asDate.getMonth() + 1) as Braze.MonthsAsNumber;
    const day = asDate.getDate();

    Braze.setDateOfBirth(year, month, day);
  }

  if (typeof email !== 'undefined') {
    Braze.setEmail(email);
  }

  if (typeof firstName !== 'undefined') {
    Braze.setFirstName(firstName);
  }

  if (typeof gender !== 'undefined') {
    const supportedGenders = ['m', 'f', 'n', 'o', 'p', 'u'];
    const isSupported = supportedGenders.indexOf(gender) > -1;

    if (isSupported) {
      Braze.setGender(gender as Braze.GenderTypes[keyof Braze.GenderTypes]);
    }
  }

  if (typeof homeCity !== 'undefined') {
    Braze.setHomeCity(homeCity);
  }

  if (typeof language !== 'undefined') {
    Braze.setLanguage(language);
  }

  if (typeof lastName !== 'undefined') {
    Braze.setLastName(lastName);
  }

  if (typeof phoneNumber !== 'undefined') {
    Braze.setPhoneNumber(phoneNumber);
  }

  Object.entries(customAttributes).forEach(([k, v]) => {
    const isValidCustomAttribute = nonCustomAttributes.indexOf(k as any) < 0;

    if (isValidCustomAttribute) {
      Braze.setCustomUserAttribute(k, v);
    }
  });
};

const mergeUsers = async (
  user_to_merge: string,
  user_to_keep: string,
): Promise<any> => {
  const url = 'https://' + BRAZE_REST_API_ENDPOINT + '/users/merge';
  const body = {
    merge_updates: [
      {
        identifier_to_merge: {
          external_id: user_to_merge,
        },
        identifier_to_keep: {
          external_id: user_to_keep,
        },
      },
    ],
  };
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + BRAZE_MERGE_AND_DELETE_API_KEY,
  };
  try {
    const {data} = await axios.post(url, body, {headers});
    return data;
  } catch (error: any) {
    throw error.response.data;
  }
};

const deleteUser = async (eid: string): Promise<any> => {
  const url = 'https://' + BRAZE_REST_API_ENDPOINT + '/users/delete';
  const body = {
    external_ids: [eid],
  };
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + BRAZE_MERGE_AND_DELETE_API_KEY,
  };
  try {
    const {data} = await axios.post(url, body, {headers});
    return data;
  } catch (error: any) {
    throw error.response.data;
  }
};

export type BrazeUserAttributes = {
  [K in (typeof nonCustomAttributes)[number]]?: string;
} & Record<string, any>;

export const BrazeWrapper = (() => {
  let lastSeenIdentity: {
    userId?: string;
    attributes?: BrazeUserAttributes;
  } = {};
  let mergingUser = false;

  return {
    init() {
      return Promise.resolve();
    },

    identify(
      userId: string | undefined,
      attributes?: BrazeUserAttributes | undefined,
    ) {
      if (mergingUser) {
        return;
      }
      if (!lastSeenIdentity) {
        lastSeenIdentity = {};
      }

      if (
        lastSeenIdentity.userId &&
        lastSeenIdentity.userId === userId &&
        lastSeenIdentity.attributes &&
        lastSeenIdentity.attributes === attributes
      ) {
        return;
      }

      if (userId) {
        Braze.changeUser(userId);
      }

      if (attributes) {
        setUserAttributes(attributes);
      }

      lastSeenIdentity = {
        userId,
        attributes,
      };
    },

    startMergingUser() {
      mergingUser = true;
    },

    endMergingUser() {
      mergingUser = false;
    },

    merge(userToMerge: string, userToKeep: string) {
      return mergeUsers(userToMerge, userToKeep);
    },

    delete(eid: string) {
      return deleteUser(eid);
    },

    screen(name: string, properties: Record<string, any> = {}) {
      const screenName = `Viewed ${name} Screen`;

      if (!mergingUser) {
        Braze.logCustomEvent(screenName, properties);
      }
    },

    track(eventName: string, properties: Record<string, any> = {}) {
      if (!mergingUser) {
        Braze.logCustomEvent(eventName, properties);
      }
    },
  };
})();

export default BrazeWrapper;
