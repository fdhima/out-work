import {
  BaseAnimationBuilder,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import type { EntryAnimationsValues, AnimationConfigFunction } from 'react-native-reanimated'

/**
 * Custom screen transition: slides in from the right while fading in.
 * Duration: 300ms, curve: ease-in-out.
 *
 * Usage on a screen root view:
 *   <Animated.View entering={SlideFromRightFade} style={StyleSheet.absoluteFill}>
 *     ...screen content
 *   </Animated.View>
 *
 * Or with an overridden duration:
 *   <Animated.View entering={SlideFromRightFade.duration(500)}>
 */
export class SlideFromRightFade extends BaseAnimationBuilder {
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    const instance = new SlideFromRightFade()
    instance.duration(300)
    return instance as InstanceType<T>
  }

  build(): AnimationConfigFunction<EntryAnimationsValues> {
    const durationMs = this.getDuration()

    return (values: EntryAnimationsValues) => {
      'worklet'
      const timingConfig = {
        duration: durationMs,
        easing: Easing.inOut(Easing.ease),
      }
      return {
        initialValues: {
          opacity: 0,
          originX: values.targetOriginX + values.windowWidth,
        },
        animations: {
          opacity: withTiming(1, timingConfig),
          originX: withTiming(values.targetOriginX, timingConfig),
        },
      }
    }
  }
}
