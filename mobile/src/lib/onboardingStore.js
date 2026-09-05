/**
 * First-launch onboarding flag (device local, AsyncStorage).
 * Onboarding is shown once and can always be skipped.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'alsabbat.onboarding.v1';

export const hasSeenOnboarding = async () => {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'done';
  } catch (e) {
    return false;
  }
};

export const markOnboardingSeen = async () => {
  try {
    await AsyncStorage.setItem(KEY, 'done');
  } catch (e) {
    /* ignore — onboarding will simply show again */
  }
};

export const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    /* ignore */
  }
};

export default { hasSeenOnboarding, markOnboardingSeen, resetOnboarding };
