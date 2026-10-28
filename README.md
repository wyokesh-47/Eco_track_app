# EcoTrack

EcoTrack is a campus waste-monitoring preview with a browser version and an Expo mobile app.

## Expo mobile app

The native Expo project is in `mobile/`. It includes Dashboard, Alerts, and Bins screens, plus an add/edit bin form. Its sample data is stored in memory and resets when the app reloads; it does not connect to real sensors or send notifications.

1. Install Node.js LTS and [Expo Go](https://expo.dev/go) on your phone.
2. In a terminal, run:

   ```sh
   cd mobile
   npm install
   npm run start:tunnel
   ```

3. Scan the displayed QR code with Expo Go. Tunnel mode can open the preview without your phone and computer sharing Wi-Fi.

Use `npm start` instead to connect over the same Wi-Fi network. `npm run android` starts the Android development flow; creating a standalone installable app requires an Expo build.

## Browser preview

Open `index.html` in a browser. Bin actions and sample sensor data are front-end only.
