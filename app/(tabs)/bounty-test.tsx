import SafeScreen from '@/components/SafeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

export default function BountyTestScreen() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [resultText, setResultText] = useState<string>('');

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const result = await api.runManualBountyFill();
      setResultText(
        `Created: ${result.createdCount}\nRope: +${result.rope?.createdCount ?? 0} (active ${result.rope?.activeCount ?? 0}/${result.rope?.targetCount ?? 3})\nBoulder: +${result.boulder?.createdCount ?? 0} (active ${result.boulder?.activeCount ?? 0}/${result.boulder?.targetCount ?? 3})`
      );
    } catch (error: any) {
      setResultText(error?.message ?? 'Failed to run bounty fill.');
    } finally {
      setIsRunning(false);
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <SafeScreen className="bg-black items-center justify-center px-6">
        <Text className="text-white font-plus-jakarta-700 text-lg">Admin only</Text>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen className="bg-black px-5 py-6" edges={['top', 'bottom']}>
      <View className="rounded-xl border border-slate-700 bg-slate-900 p-4 gap-4">
        <Text className="text-white font-plus-jakarta-700 text-lg">Bounty Test Controls</Text>
        <Text className="text-slate-300 font-plus-jakarta">
          Manually run the bounty refill endpoint (dev-only).
        </Text>
        <TouchableOpacity
          onPress={handleRun}
          disabled={isRunning}
          className={`rounded-lg py-3 items-center ${isRunning ? 'bg-slate-600' : 'bg-indigo-600'}`}
        >
          {isRunning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-plus-jakarta-700">Run Manual Bounty Fill</Text>
          )}
        </TouchableOpacity>
        {!!resultText && (
          <View className="rounded-lg border border-slate-700 bg-black/40 p-3">
            <Text className="text-slate-100 font-plus-jakarta">{resultText}</Text>
          </View>
        )}
      </View>
    </SafeScreen>
  );
}
