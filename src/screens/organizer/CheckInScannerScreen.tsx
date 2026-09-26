import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { radius } from '@/theme';
import { parseCheckInQRValue } from '@/services/qrService';
import { checkInRegistration, isCheckedIn } from '@/services/participantService';
import type { RegistrationRow } from '@/types/organizer';

type Feedback = { tone: 'green' | 'amber' | 'red'; text: string };

export function CheckInScannerScreen({
  registrations,
  onClose,
  onCheckedIn,
}: {
  registrations: RegistrationRow[];
  onClose: () => void;
  onCheckedIn: () => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const handleScanned = async ({ data }: { data: string }) => {
    if (!scanning || busy) return;
    setScanning(false);
    setBusy(true);

    const registrationId = parseCheckInQRValue(data);
    const registration = registrationId != null ? registrations.find((row) => row.id === registrationId) : undefined;

    if (!registration) {
      setBusy(false);
      setFeedback({ tone: 'red', text: 'This QR code is not a valid check-in pass for this event.' });
      return;
    }

    if (isCheckedIn(registration)) {
      setBusy(false);
      setFeedback({ tone: 'amber', text: `${registration.participant_name} is already checked in.` });
      return;
    }

    const result = await checkInRegistration(registration);
    setBusy(false);

    if (result.success) {
      setFeedback({ tone: 'green', text: `${registration.participant_name} checked in successfully.` });
      onCheckedIn();
    } else {
      setFeedback({ tone: 'red', text: result.error || 'Unable to check in this participant.' });
    }
  };

  const resumeScanning = () => {
    setFeedback(null);
    setScanning(true);
  };

  if (!permission) {
    return <View style={[styles.shell, { backgroundColor: colors.bg }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.shell, styles.centered, { backgroundColor: colors.bg, paddingTop: insets.top + 24 }]}>
        <Feather name="camera-off" size={28} color={colors.textMuted} />
        <Text style={[styles.permissionText, { color: colors.textPrimary }]}>
          Camera access is needed to scan participant check-in QR codes.
        </Text>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: colors.blue }]}
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Grant camera access"
        >
          <Text style={styles.primaryButtonText}>Grant camera access</Text>
        </Pressable>
        <Pressable onPress={onClose} style={{ marginTop: 14 }} accessibilityRole="button" accessibilityLabel="Cancel">
          <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanning ? handleScanned : undefined}
      />

      <View style={[styles.topOverlay, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close scanner">
          <Feather name="x" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.topOverlayText}>Scan participant check-in QR</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.scanFrameWrap} pointerEvents="none">
        <View style={styles.scanFrame} />
      </View>

      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 20 }]}>
        {feedback ? (
          <View
            style={[
              styles.feedbackCard,
              { backgroundColor: feedback.tone === 'green' ? colors.green : feedback.tone === 'amber' ? colors.amber : colors.red },
            ]}
          >
            <Text style={styles.feedbackText}>{feedback.text}</Text>
            <Pressable
              style={styles.feedbackButton}
              onPress={resumeScanning}
              accessibilityRole="button"
              accessibilityLabel="Scan next participant"
            >
              <Text style={styles.feedbackButtonText}>Scan next</Text>
            </Pressable>
          </View>
        ) : busy ? (
          <View style={[styles.feedbackCard, { backgroundColor: 'rgba(15, 23, 42, 0.85)' }]}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : (
          <Text style={styles.hintText}>Point the camera at a participant's check-in QR code.</Text>
        )}
      </View>
    </View>
  );
}

const FRAME_SIZE = 240;

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  primaryButton: {
    borderRadius: radius.md,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  scanFrameWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderRadius: radius.xl,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  feedbackCard: {
    width: '100%',
    borderRadius: radius.lg,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  feedbackText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  feedbackButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
