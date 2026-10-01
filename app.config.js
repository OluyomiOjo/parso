// Adds settings to app.json that depend on build-time environment variables.
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!iosClientId) return config;

  // Google's iOS sign-in returns to the app through the reversed client ID.
  const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`;
  return {
    ...config,
    plugins: [...config.plugins, ['@react-native-google-signin/google-signin', { iosUrlScheme }]],
  };
};
