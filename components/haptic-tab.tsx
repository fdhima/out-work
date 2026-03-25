import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Animated } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (ev: any) => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(scale, {
      toValue: 0.8,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
    props.onPressIn?.(ev);
  };

  const handlePressOut = (ev: any) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
    props.onPressOut?.(ev);
  };

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <PlatformPressable
        {...props}
        style={[props.style, { flex: 1 }]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      />
    </Animated.View>
  );
}
