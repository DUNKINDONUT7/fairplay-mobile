import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { QRScannerShell, qrScannerFooterStyles as styles } from '@/components/common/QRScannerShell';
import { parseParticipantRegistrationQRValue } from '@/services/qrService';
import type { EventRow } from '@/types/organizer';

export function ScanEventQRScreen({
  events,
  onClose,
  onScanned,
}: {
  events: EventRow[];
  onClose: () => void;
  onScanned: (event: EventRow) => void;
}) {
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState('');

  const handleScanned = ({ data }: { data: string }) => {
    if (!scanning) return;

    const eventId = parseParticipantRegistrationQRValue(data);
    const event = eventId != null ? events.find((row) => row.id === eventId) : undefined;

    if (!event) {
      setScanning(false);
      setError('This QR code is not a valid event registration code.');
      return;
    }

    onScanned(event);
  };

  const resumeScanning = () => {
    setError('');
    setScanning(true);
  };

  return (
    <QRScannerShell
      title="Scan an event's registration QR"
      scanning={scanning}
      onBarcodeScanned={handleScanned}
      onClose={onClose}
      footer={
        error ? (
          <View style={[styles.feedbackCard, { backgroundColor: '#DC2626' }]}>
            <Text style={styles.feedbackText}>{error}</Text>
            <Pressable style={styles.feedbackButton} onPress={resumeScanning} accessibilityRole="button" accessibilityLabel="Try scanning again">
              <Text style={styles.feedbackButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.hintText}>Point the camera at an event's registration QR code.</Text>
        )
      }
    />
  );
}
