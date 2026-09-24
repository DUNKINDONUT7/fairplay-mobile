import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MobileShell, type MobileDashboard } from '@/components/layout/MobileShell';
import { isSupabaseConfigured, supabase } from '@/config/supabase';
import { fetchMobileData, subscribeToFairplayRealtime } from '@/services/fairplayApi';
import { fetchOwnProfile, type ProfileRow } from '@/services/profileService';
import type { EventRow } from '@/types/organizer';
import { ThemeProvider, useAppTheme } from '@/contexts/ThemeContext';

type MobileAuthUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

function AppContent() {
  const { colors, colorScheme } = useAppTheme();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<MobileDashboard>('dashboard');
  const [detectedLink, setDetectedLink] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<MobileAuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const applyDetectedLink = (url: string) => {
    setDetectedLink(url);
  };

  const handleSignIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error: 'Supabase auth is not configured yet.',
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Sign in failed. Please try again.',
      };
    }

    setAuthUser((data?.user ?? null) as MobileAuthUser | null);

    return {
      success: true,
      message: 'Welcome back to FairPlay.',
    };
  };

  const handleSignUp = async ({
    fullName,
    email,
    password,
  }: {
    fullName: string;
    email: string;
    password: string;
  }) => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error: 'Supabase auth is not configured yet.',
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim() || email.trim(),
          role: 'organizer',
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Sign up failed. Please try again.',
      };
    }

    if (data?.user) {
      setAuthUser(data.user as MobileAuthUser);
    }

    if (data?.session) {
      return {
        success: true,
        message: 'Your FairPlay account is ready.',
      };
    }

    return {
      success: true,
      message: 'Account created. Please check your email to confirm your account before signing in.',
    };
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setAuthUser(null);
    setProfile(null);
    setSelectedDashboard('dashboard');
    setDetectedLink(null);
  };

  useEffect(() => {
    let isMounted = true;
    let unsubscribeRealtime: (() => void) | undefined;

    async function load() {
      try {
        const data = await fetchMobileData();
        if (!isMounted) return;
        setEvents(data.events || []);
      } catch (error) {
        console.warn('Mobile fetch failed:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();
    unsubscribeRealtime = subscribeToFairplayRealtime(() => {
      load();
    });

    return () => {
      isMounted = false;
      unsubscribeRealtime?.();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthReady(true);
      return;
    }

    let isMounted = true;

    async function initAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;
      setAuthUser((session?.user ?? null) as MobileAuthUser | null);
      setAuthReady(true);
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setAuthUser((session?.user ?? null) as MobileAuthUser | null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authUser?.id) {
      setProfile(null);
      return;
    }

    let isMounted = true;

    fetchOwnProfile(authUser.id)
      .then((row) => {
        if (isMounted) setProfile(row);
      })
      .catch(() => {
        if (isMounted) setProfile(null);
      });

    return () => {
      isMounted = false;
    };
  }, [authUser?.id]);

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      if (!event?.url) return;
      applyDetectedLink(event.url);
    };

    Linking.getInitialURL().then((url) => {
      if (!url) return;
      applyDetectedLink(url);
    });

    const subscription = Linking.addEventListener('url', handleUrl);

    return () => {
      subscription?.remove?.();
    };
  }, []);

  if (loading || !authReady) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Connecting to FairPlay...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <MobileShell
        events={events}
        selectedDashboard={selectedDashboard}
        onSelectDashboard={setSelectedDashboard}
        detectedUrl={detectedLink}
        user={authUser}
        profile={profile}
        authConfigured={isSupabaseConfigured}
        onLinkDetected={applyDetectedLink}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onSignOut={handleSignOut}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '700',
  },
});
