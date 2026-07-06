import React from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, Feather } from '@expo/vector-icons';

import ForYouScreen from './src/screens/ForYouScreen';
import TrendingScreen from './src/screens/TrendingScreen';
import SearchScreen from './src/screens/SearchScreen';
import BeatDetailsScreen from './src/screens/BeatDetailsScreen';
import { colors } from './src/theme/theme';
import { DarkTheme } from '@react-navigation/native';

// Set web body background to match app theme to eliminate white padding at screen edges
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.body.style.backgroundColor = '#070510';
  document.body.style.margin = '0';
  document.body.style.padding = '0';
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, color, focused }) {
  if (label === 'ForYou') {
    return <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={18} color={color} />;
  }
  if (label === 'Trending') {
    return <Feather name="trending-up" size={18} color={color} />;
  }
  if (label === 'Search') {
    return <Feather name="search" size={18} color={color} />;
  }
  return null;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, focused }) => <TabIcon label={route.name} color={color} focused={focused} />,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1.5,
          height: 58,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.5,
          marginTop: 2,
        },
        tabBarItemStyle: {
          height: 48,
        },
      })}
    >
      <Tab.Screen name="ForYou" component={ForYouScreen} options={{ title: 'For You' }} />
      <Tab.Screen name="Trending" component={TrendingScreen} options={{ title: 'Trending' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
    </Tab.Navigator>
  );
}

const navTheme = {
  ...DarkTheme,
  colors: {
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

export default function App() {
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.accent,
          headerShadowVisible: false,
          headerBackTitle: '',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BeatDetails"
          component={BeatDetailsScreen}
          options={{
            title: '',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.accent,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
