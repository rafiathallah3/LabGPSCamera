# Lab GPS Camera

A GPS camera application for **IFLab**.

## Purpose

Many existing GPS camera applications on the play store are cluttered with intrusive advertisements that disrupt the user experience and slow down the capturing process. **Lab GPS Camera** was developed as a clean, professional, and entirely **ad-free alternative**. 

## Installation

Follow these steps to get the project running locally:

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your machine. We recommend using the latest LTS version.

### 2. Clone the Repository
```bash
git clone https://github.com/rafiathallah3/LabGPSCamera.git
cd LabGPSCamera
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start the Application
```bash
npx expo start
```

### 5. Run on Your Device
- **Physical Device (Recommended)**: Download the **Expo Go** app from the App Store or Play Store. Scan the QR code displayed in your terminal.
- **iOS Simulator**: Press `i` in the terminal (Requires macOS and Xcode).
- **Android Emulator**: Press `a` in the terminal (Requires Android Studio).

## Permissions

The app requires the following permissions to function:
- **Camera**: To take photos.
- **Location**: To retrieve and embed GPS coordinates.
- **Media Library**: To save the watermarked photos to your gallery.