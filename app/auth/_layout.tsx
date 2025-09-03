import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack 
      screenOptions={{
        headerShown: false,  // Hide all navigation headers
      }} 
    />
  );
}
