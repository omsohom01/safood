import React from 'react';
import { View, Text, TextInput, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const inputContainerStyle: ViewStyle = {
    borderWidth: 1,
    borderColor: error ? '#ef4444' : '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    ...inputStyle,
  };

  const labelTextStyle: TextStyle = {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    ...labelStyle,
  };

  const errorTextStyle: TextStyle = {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  };

  const inputTextStyle: TextStyle = {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: leftIcon ? 12 : 0,
    marginRight: rightIcon ? 12 : 0,
  };

  return (
    <View style={containerStyle}>
      {label && <Text style={labelTextStyle}>{label}</Text>}
      
      <View style={inputContainerStyle}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color="#6b7280"
          />
        )}
        
        <TextInput
          style={inputTextStyle}
          placeholderTextColor="#9ca3af"
          {...textInputProps}
        />
        
        {rightIcon && (
          <Ionicons
            name={rightIcon}
            size={20}
            color="#6b7280"
            onPress={onRightIconPress}
          />
        )}
      </View>
      
      {error && <Text style={errorTextStyle}>{error}</Text>}
    </View>
  );
};
