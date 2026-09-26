import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { QRScannerShell, qrScannerFooterStyles as styles } from '@/components/common/QRScannerShell';
import { checkInParticipant, findRegistrationByQrToken, isCheckedIn } from '@/services/attendanceService';
import type { AttendanceRow, EventRow, RegistrationRow } from '@/types/organizer';

type Feedback = { tone: 'green' | 'amber' | 'red'; text: string };

export function CheckInScannerScreen({
  event,
  registrations,
  attendanceRows,
  onClose,
  onCheckedIn,
}: {
  event: EventRow;
  registrations: RegistrationRow[];
  attendanceRows: AttendanceRow[];
  onClose: () => void;
  onCheckedIn: () => void;
}) {
  const { colors } = useAppTheme();
  const [scanning, setScanning] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const handleScanned = async ({ data }: { data: string }) => {
    if (!scanning || busy) return;
    setScanning(false);
    setBusy(true);

    const qrToken = data.trim();
    const registration = findRegistrationByQrToken(qrToken, registrations);

    if (!registration) {
      setBusy(false);
      setFeedback({ tone: 'red', text: `Not a valid check-in pass for this event. Scanned: "${qrToken}"` });
      return;
    }

    if (isCheckedIn(registration, attendanceRows)) {
      setBusy(false);
      setFeedback({ tone: 'amber', text: `${registration.participant_name} is already checked in.` });
      return;
    }

    const result = await checkInParticipant({ event, registration, qrToken });
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

  return (
    <QRScannerShell
      title="Scan participant check-in QR"
      scanning={scanning}
      onBarcodeScanned={handleScanned}
      onClose={onClose}
      footer={
        feedback ? (
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
        )
      }
    />
  );
}
