import Constants, { ExecutionEnvironment } from 'expo-constants';
import React from 'react';
import TabNavigatorClassic from './TabNavigatorClassic';
import TabNavigatorNative from './TabNavigatorNative';

// The native (Liquid Glass) tab bar relies on react-native-bottom-tabs' native
// view (RNCTabView), which isn't present in Expo Go. Fall back to the JS tab bar
// there; dev/EAS builds get the native one. The native component only errors when
// rendered, so we must never render TabNavigatorNative inside Expo Go.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function TabNavigator() {
  return isExpoGo ? <TabNavigatorClassic /> : <TabNavigatorNative />;
}
