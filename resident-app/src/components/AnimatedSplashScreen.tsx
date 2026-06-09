import React, { useEffect, useState, useRef } from 'react';
import { Animated, View, StyleSheet, Text, Image } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function AnimatedSplashScreen({ children }: { children: React.ReactNode }) {
  const [isAppReady, setIsAppReady] = useState(false);
  const [isSplashAnimationComplete, setAnimationComplete] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hideAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        setIsAppReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync().then(() => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              tension: 20,
              friction: 7,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(800),
          Animated.timing(hideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          })
        ]).start(() => setAnimationComplete(true));
      });
    }
  }, [isAppReady, fadeAnim, hideAnim, scaleAnim]);

  return (
    <View style={{ flex: 1 }}>
      {isAppReady && children}
      {!isSplashAnimationComplete && (
        <Animated.View 
          style={[
            styles.container,
            StyleSheet.absoluteFillObject,
            { opacity: hideAnim }
          ]}
        >
          <Animated.View 
            style={[
              styles.logoContainer, 
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
            ]}
          >
            <Image 
              source={require('../../assets/sindh-logo.png')} 
              style={styles.image} 
              resizeMode="contain" 
            />
            <Text style={styles.title}>HumAwaaz</Text>
            <Text style={styles.subtitle}>Empowering Citizens</Text>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff', // Clean white background to match native splash
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  logoContainer: {
    alignItems: 'center',
  },
  image: {
    width: 160,
    height: 160,
    marginBottom: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#022c22', // Dark green text on white bg
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#10b981', // Brand green
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  }
});
