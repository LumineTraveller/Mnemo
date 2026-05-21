import React, { useEffect } from 'react';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  CormorantGaramond_300Light,
  CormorantGaramond_300Light_Italic,
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import {
  EBGaramond_400Regular,
  EBGaramond_400Regular_Italic,
} from '@expo-google-fonts/eb-garamond';
import {
  Lora_400Regular,
  Lora_400Regular_Italic,
} from '@expo-google-fonts/lora';
import {
  LibreBaskerville_400Regular,
  LibreBaskerville_400Regular_Italic,
} from '@expo-google-fonts/libre-baskerville';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { StatusBar } from 'expo-status-bar';

import HomeScreen     from './src/screens/HomeScreen';
import StudyScreen    from './src/screens/StudyScreen';
import ReviewScreen   from './src/screens/ReviewScreen';
import WordListScreen from './src/screens/WordListScreen';
import AddWordScreen  from './src/screens/AddWordScreen';
import EditWordScreen from './src/screens/EditWordScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TabBar         from './src/components/TabBar';
import { ThemeProvider, useTheme } from './src/utils/ThemeContext';
import { colors } from './src/utils/theme';
import { runMigrations } from './src/utils/storage';

const Tab   = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

function getHeaderOpts() {
  return {
    headerStyle:            { backgroundColor: colors.bg2 },
    headerTintColor:        colors.text,
    headerTitleStyle:       { fontWeight: '600', fontSize: 16, color: colors.text },
    headerBackTitleVisible: false,
    contentStyle:           { backgroundColor: colors.bg },
  };
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={props => <TabBar {...props} />}
      screenOptions={{
        swipeEnabled:     true,
        animationEnabled: true,
        // Disable the built-in top indicator/label — we have a custom tab bar
        tabBarShowLabel:  false,
        tabBarStyle:      { display: 'none' }, // hide the default top bar
      }}
    >
      <Tab.Screen
        name="首页"
        component={HomeScreen}
      />
      <Tab.Screen
        name="单词本"
        component={WordListScreen}
      />
      <Tab.Screen
        name="设置"
        component={SettingsScreen}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { themeKey, isDark } = useTheme();
  const headerOpts = getHeaderOpts();

  // 一次性数据迁移：旧格式词 → senses[] 新格式
  useEffect(() => { runMigrations(); }, []);

  return (
    <NavigationContainer key={themeKey}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={headerOpts}>
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Study"
          component={StudyScreen}
          options={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
        />
        <Stack.Screen
          name="Review"
          component={ReviewScreen}
          options={{ title: '复习' }}
        />
        <Stack.Screen
          name="WordList"
          component={WordListScreen}
          options={({ route }) => ({ title: route.params?.groupName || '单词本' })}
        />
        <Stack.Screen
          name="AddWord"
          component={AddWordScreen}
          options={{
            title:           '添加单词',
            presentation:    'modal',
            headerStyle:     { backgroundColor: colors.bg2 },
            headerTintColor: colors.text,
          }}
        />
        <Stack.Screen
          name="EditWord"
          component={EditWordScreen}
          options={{
            title:           '编辑单词',
            presentation:    'modal',
            headerStyle:     { backgroundColor: colors.bg2 },
            headerTintColor: colors.text,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold,
    CormorantGaramond_300Light,
    CormorantGaramond_300Light_Italic,
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    EBGaramond_400Regular,
    EBGaramond_400Regular_Italic,
    Lora_400Regular,
    Lora_400Regular_Italic,
    LibreBaskerville_400Regular,
    LibreBaskerville_400Regular_Italic,
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
