import React from 'react';
import { Image, StyleSheet } from 'react-native';

export default function Logo({ size = 36 }) {
  return (
    <Image
      source={require('../../assets/beat22_logo.jpeg')}
      style={[styles.logo, { width: size, height: size, borderRadius: size / 2 }]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
});
