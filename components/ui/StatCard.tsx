import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  onPress,
  style,
}) => {
  const cardStyle: ViewStyle = {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...style,
  };

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component style={cardStyle} onPress={onPress} activeOpacity={onPress ? 0.8 : 1}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#111827', marginBottom: 4 }}>
            {value}
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '500' }}>
            {title}
          </Text>
        </View>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={24} color="#ffffff" />
        </View>
      </View>
    </Component>
  );
};
