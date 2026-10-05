import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taskflow.dailytaskmanager',
  appName: 'TaskFlow',
  webDir: 'dist',
  server: {
    // During development: comment this out and use npx cap run android --livereload
    // For APK build: leave commented so the APK uses the bundled dist/
  },
  android: {
    allowMixedContent: true,   // needed for http:// API calls on Android
    backgroundColor: '#f8fafc',
  },
};

export default config;
