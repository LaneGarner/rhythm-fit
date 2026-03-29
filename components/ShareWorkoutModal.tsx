import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../theme/ThemeContext';
import { Activity } from '../types/activity';
import { isActivityComplete } from '../utils/supersetUtils';
import ShareWorkoutCard from './ShareWorkoutCard';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface ShareWorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  activities: Activity[];
  date: string;
}

export default function ShareWorkoutModal({
  visible,
  onClose,
  activities,
  date,
}: ShareWorkoutModalProps) {
  const { colors } = useTheme();
  const { insets } = useResponsiveLayout();
  const [includeDetails, setIncludeDetails] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const cardRef = useRef<View>(null);

  const screenWidth = Dimensions.get('window').width;
  const previewScale = Math.min((screenWidth - 48) / 390, 1);

  const completedCount = activities.filter(isActivityComplete).length;
  const totalCount = activities.length;

  const handleShare = async () => {
    if (!cardRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
      });
      onClose();
    } catch {
      // User cancelled share sheet or capture failed
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close share modal"
        />
        <View
          style={{
            backgroundColor: colors.modalBackground,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: Math.max(insets.bottom, 24),
            maxHeight: '90%',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text
                style={{
                  color: colors.primary.main,
                  fontSize: 17,
                  fontWeight: '600',
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <Text
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 17,
                fontWeight: '600',
                color: colors.text,
              }}
            >
              Share Workout
            </Text>
            {/* Spacer to balance Cancel button */}
            <View style={{ width: 60 }} />
          </View>

          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: 8,
            }}
          >
            {/* Card preview */}
            <View
              style={{
                alignItems: 'center',
                marginBottom: 20,
              }}
              accessibilityLabel={`Share card preview. ${completedCount} of ${totalCount} activities on ${date}.`}
              accessibilityHint="This is a preview of the image that will be shared."
            >
              <View
                style={{
                  width: 390 * previewScale,
                  height: undefined,
                  overflow: 'hidden',
                  borderRadius: 20 * previewScale,
                  shadowColor: '#000',
                  shadowOpacity: 0.12,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 8,
                }}
              >
                <View
                  style={{
                    transform: [{ scale: previewScale }],
                    transformOrigin: 'top left',
                    width: 390,
                  }}
                >
                  <View ref={cardRef} collapsable={false}>
                    <ShareWorkoutCard
                      activities={activities}
                      date={date}
                      includeDetails={includeDetails}
                    />
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Toggle + Share button */}
          <View style={{ paddingHorizontal: 24 }}>
            {/* Toggle row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '500',
                    color: colors.text,
                  }}
                >
                  Include set details
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  Shows weight, reps, and time for each set
                </Text>
              </View>
              <Switch
                value={includeDetails}
                onValueChange={setIncludeDetails}
                disabled={isCapturing}
                accessibilityRole="switch"
                accessibilityLabel="Include set details"
                style={{ opacity: isCapturing ? 0.5 : 1 }}
              />
            </View>

            {/* Share button */}
            <TouchableOpacity
              onPress={handleShare}
              disabled={isCapturing}
              accessibilityRole="button"
              accessibilityLabel={
                isCapturing ? 'Preparing image' : 'Share workout'
              }
              accessibilityState={{ busy: isCapturing }}
              style={{
                height: 50,
                borderRadius: 14,
                backgroundColor: colors.primary.main,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 12,
                opacity: isCapturing ? 0.75 : 1,
              }}
            >
              {isCapturing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 17,
                    fontWeight: '600',
                  }}
                >
                  Share
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
