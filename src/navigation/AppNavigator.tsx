import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LandingScreen from '../screens/LandingScreen';
import SubmitScreen from '../screens/SubmitScreen';
import SwipeScreen from '../screens/SwipeScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, emoji, focused }: { label: string; emoji: string; focused: boolean }) {
  return (
    <View style={tabStyles.iconWrap}>
      <Text style={tabStyles.emoji}>{emoji}</Text>
      <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>{label}</Text>
    </View>
  );
}

// Bottom tabs shown during voting phase
function VotingTabs({ route }: any) {
  const { categoryId, categoryName } = route.params ?? {};

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.bar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Vote"
        component={SwipeScreen}
        initialParams={{ categoryId, categoryName }}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Vote" emoji="👆" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        initialParams={{ categoryId, categoryName }}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Ranks" emoji="🏆" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0a0a0a', shadowOpacity: 0 },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          cardStyle: { backgroundColor: '#0a0a0a' },
        }}
      >
        <Stack.Screen
          name="Landing"
          component={LandingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Submit"
          component={SubmitScreen}
          options={({ route }: any) => ({
            title: 'Submit Entry',
            headerBackTitle: 'Back',
          })}
        />
        {/* Tabs screen — entered when voting opens */}
        <Stack.Screen
          name="Tabs"
          component={VotingTabs}
          options={({ route }: any) => ({
            title: (route.params as any)?.categoryName ?? 'Voting',
            headerBackTitle: 'Back',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: '#111',
    borderTopColor: '#1e1e1e',
    height: 80,
    paddingBottom: 10,
  },
  iconWrap: {
    alignItems: 'center',
    paddingTop: 8,
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: 11,
    color: '#555',
    marginTop: 4,
    fontWeight: '600',
  },
  labelActive: {
    color: '#6C63FF',
  },
});
