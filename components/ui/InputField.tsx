import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Text, TextInput, TextInputProps, TextStyle, View, ViewStyle, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: ViewStyle;
  labelStyle?: TextStyle;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  labelStyle,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.parallel([
      Animated.timing(focusAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(labelAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!textInputProps.value) {
      Animated.parallel([
        Animated.timing(focusAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(labelAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };
  const inputContainerStyle: ViewStyle = {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: isFocused ? '#22c55e' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isFocused ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: isFocused ? 6 : 3,
    borderWidth: 2,
    ...inputStyle,
  };

  const labelTextStyle: TextStyle = {
    fontSize: 15,
    fontWeight: '600',
    color: isFocused ? '#22c55e' : error ? '#ef4444' : '#374151',
    marginBottom: 10,
    ...labelStyle,
  };

  const errorTextStyle: TextStyle = {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 6,
    fontWeight: '500',
  };

  const inputTextStyle: TextStyle = {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: leftIcon ? 12 : 0,
    marginRight: rightIcon ? 12 : 0,
    fontWeight: '500',
  };

  const getBorderColor = () => {
    if (error) return '#ef4444';
    if (isFocused) return '#22c55e';
    return '#e2e8f0';
  };

  return (
    <View style={containerStyle}>
      {label && (
        <Animated.Text style={[
          labelTextStyle, 
          {
            transform: [{
              scale: labelAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.02]
              })
            }]
          }
        ]}>
          {label}
        </Animated.Text>
      )}
      
      <Animated.View style={[
        inputContainerStyle,
        {
          borderColor: focusAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [getBorderColor(), '#22c55e']
          })
        }
      ]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={22}
            color={isFocused ? '#22c55e' : '#6b7280'}
          />
        )}
        
        <TextInput
          style={[inputTextStyle, { outlineWidth: 0, outlineColor: 'transparent' }]}
          placeholderTextColor="#94a3b8"
          underlineColorAndroid="transparent"
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...textInputProps}
        />
        
        {rightIcon && (
          <Ionicons
            name={rightIcon}
            size={22}
            color={isFocused ? '#22c55e' : '#6b7280'}
            onPress={onRightIconPress}
          />
        )}
      </Animated.View>
      
      {error && (
        <Animated.Text style={[
          errorTextStyle,
          {
            opacity: focusAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.8]
            })
          }
        ]}>
          {error}
        </Animated.Text>
      )}
    </View>
  );
};
