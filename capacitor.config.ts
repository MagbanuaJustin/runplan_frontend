import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Choose a permanent unique ID before adding Android.
  // Changing this later changes the installed app's identity.
  appId: 'app.runplan.mobile',
  appName: 'RunPlan',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config