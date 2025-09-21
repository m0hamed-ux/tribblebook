## Clerk configuration for production builds

This app uses `@clerk/clerk-expo`. In production APK/IPA builds you must provide a publishable key at build time.

Two supported ways:

1. Environment variable (recommended)

- Set `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in your environment or via EAS secrets.

```
eas secret:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value <your_publishable_key>
```

2. expo config `extra`

- Add the key to `app.json` under `expo.extra.clerkPublishableKey`.

```
{
   "expo": {
      "extra": {
         "clerkPublishableKey": "pk_live_..."
      }
   }
}
```

The root layout reads the key from `process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` first and falls back to `expo.extra.clerkPublishableKey`.

# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

## Push notifications for messages

- The app registers for Expo push notifications and stores the device token via `POST /user/save-token` on the backend.
- When a message is sent, the app now calls `POST /messages/send-notification` with body `{ userId, senderFullname, message }` to trigger a push notification to the recipient.

Configuration:

- Set `EXPO_PUBLIC_API_URL` in your Expo config or environment so the app can reach your backend. It defaults to `https://tribblebook-backend.onrender.com` if not provided.

Example (EAS secret):

```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://your-backend.example.com
```

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
