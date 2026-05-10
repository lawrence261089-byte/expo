package com.expoplatformshowcase;

import android.graphics.Color;
import java.util.ArrayList;
import java.util.List;

public class ExpoData {

    // Category colors
    static final int COLOR_CORE = 0xFF4F46E5;        // Indigo
    static final int COLOR_MEDIA = 0xFF7C3AED;       // Purple
    static final int COLOR_SENSORS = 0xFF059669;     // Emerald
    static final int COLOR_UI = 0xFFDB2777;          // Pink
    static final int COLOR_NETWORK = 0xFF2563EB;     // Blue
    static final int COLOR_STORAGE = 0xFFD97706;     // Amber
    static final int COLOR_DEVICE = 0xFF0891B2;      // Cyan
    static final int COLOR_AUTH = 0xFFDC2626;        // Red
    static final int COLOR_TOOLS = 0xFF65A30D;       // Lime
    static final int COLOR_NAVIGATION = 0xFFF59E0B;  // Yellow

    public static List<PackageItem> getAllPackages() {
        List<PackageItem> packages = new ArrayList<>();

        // Core / Foundation
        packages.add(new PackageItem("expo", "The core Expo SDK — the foundation of every Expo app", "Core", COLOR_CORE));
        packages.add(new PackageItem("expo-modules-core", "Core infrastructure for native Expo modules (JSI, Swift/Kotlin APIs)", "Core", COLOR_CORE));
        packages.add(new PackageItem("expo-router", "File-based routing for React Native & web apps", "Core", COLOR_CORE));
        packages.add(new PackageItem("expo-updates", "OTA (over-the-air) update delivery for production apps", "Core", COLOR_CORE));
        packages.add(new PackageItem("expo-constants", "System constants: app version, device info, manifest data", "Core", COLOR_CORE));
        packages.add(new PackageItem("expo-linking", "Deep linking & URL handling across platforms", "Core", COLOR_CORE));
        packages.add(new PackageItem("expo-splash-screen", "Control the native splash screen with fade animations", "Core", COLOR_CORE));
        packages.add(new PackageItem("expo-status-bar", "Control the status bar style and visibility", "Core", COLOR_CORE));
        packages.add(new PackageItem("expo-font", "Load custom fonts at runtime", "Core", COLOR_CORE));
        packages.add(new PackageItem("expo-asset", "Manage and load static assets (images, fonts, etc.)", "Core", COLOR_CORE));
        packages.add(new PackageItem("babel-preset-expo", "Babel preset for Expo projects with JSX & TypeScript support", "Core", COLOR_CORE));
        packages.add(new PackageItem("expo-module-scripts", "Build scripts and tooling for Expo module development", "Core", COLOR_CORE));

        // Media
        packages.add(new PackageItem("expo-camera", "Full-featured camera with photo/video capture", "Media", COLOR_MEDIA));
        packages.add(new PackageItem("expo-image", "High-performance image component with caching & transitions", "Media", COLOR_MEDIA));
        packages.add(new PackageItem("expo-video", "Video playback with full controls and streaming support", "Media", COLOR_MEDIA));
        packages.add(new PackageItem("expo-audio", "Audio recording and playback", "Media", COLOR_MEDIA));
        packages.add(new PackageItem("expo-image-picker", "Pick images and videos from the device library", "Media", COLOR_MEDIA));
        packages.add(new PackageItem("expo-image-manipulator", "Crop, resize, rotate, and flip images", "Media", COLOR_MEDIA));
        packages.add(new PackageItem("expo-media-library", "Access and manage the device photo/video library", "Media", COLOR_MEDIA));
        packages.add(new PackageItem("expo-video-thumbnails", "Generate thumbnail images from video files", "Media", COLOR_MEDIA));
        packages.add(new PackageItem("expo-live-photo", "Display Apple Live Photos on iOS", "Media", COLOR_MEDIA));
        packages.add(new PackageItem("expo-gl", "OpenGL ES rendering context for 3D graphics", "Media", COLOR_MEDIA));

        // Sensors & Hardware
        packages.add(new PackageItem("expo-sensors", "Accelerometer, gyroscope, magnetometer, barometer", "Sensors", COLOR_SENSORS));
        packages.add(new PackageItem("expo-location", "GPS location, geocoding, and geofencing", "Sensors", COLOR_SENSORS));
        packages.add(new PackageItem("expo-battery", "Battery level, charging state, and power mode", "Sensors", COLOR_SENSORS));
        packages.add(new PackageItem("expo-brightness", "Screen brightness control", "Sensors", COLOR_SENSORS));
        packages.add(new PackageItem("expo-haptics", "Haptic feedback (vibration patterns)", "Sensors", COLOR_SENSORS));
        packages.add(new PackageItem("expo-device", "Device model, OS version, and hardware info", "Sensors", COLOR_SENSORS));
        packages.add(new PackageItem("expo-cellular", "Cellular network carrier and connection info", "Sensors", COLOR_SENSORS));
        packages.add(new PackageItem("expo-network", "Network connectivity and IP address info", "Sensors", COLOR_SENSORS));
        packages.add(new PackageItem("expo-screen-orientation", "Lock or detect screen orientation changes", "Sensors", COLOR_SENSORS));
        packages.add(new PackageItem("expo-keep-awake", "Prevent the screen from sleeping", "Sensors", COLOR_SENSORS));

        // UI Components
        packages.add(new PackageItem("expo-blur", "Native blur view for iOS and Android", "UI", COLOR_UI));
        packages.add(new PackageItem("expo-linear-gradient", "Smooth linear gradient backgrounds", "UI", COLOR_UI));
        packages.add(new PackageItem("expo-symbols", "SF Symbols support for iOS", "UI", COLOR_UI));
        packages.add(new PackageItem("expo-checkbox", "Native checkbox component", "UI", COLOR_UI));
        packages.add(new PackageItem("expo-ui", "New Expo UI component library (SwiftUI/Jetpack Compose)", "UI", COLOR_UI));
        packages.add(new PackageItem("expo-navigation-bar", "Android navigation bar customization", "UI", COLOR_UI));
        packages.add(new PackageItem("expo-system-ui", "System UI appearance (background color, etc.)", "UI", COLOR_UI));
        packages.add(new PackageItem("expo-glass-effect", "Glass morphism effect for UI elements", "UI", COLOR_UI));
        packages.add(new PackageItem("expo-mesh-gradient", "Animated mesh gradient backgrounds (iOS 18+)", "UI", COLOR_UI));
        packages.add(new PackageItem("html-elements", "HTML-like elements for React Native", "UI", COLOR_UI));

        // Storage & Data
        packages.add(new PackageItem("expo-file-system", "Read/write files, download, and manage directories", "Storage", COLOR_STORAGE));
        packages.add(new PackageItem("expo-sqlite", "Full SQLite database with async API", "Storage", COLOR_STORAGE));
        packages.add(new PackageItem("expo-secure-store", "Encrypted key-value storage (Keychain/Keystore)", "Storage", COLOR_STORAGE));
        packages.add(new PackageItem("expo-document-picker", "Pick documents from the device or cloud", "Storage", COLOR_STORAGE));
        packages.add(new PackageItem("expo-clipboard", "Read and write to the system clipboard", "Storage", COLOR_STORAGE));
        packages.add(new PackageItem("expo-blob", "Binary large object (Blob) support", "Storage", COLOR_STORAGE));

        // Network & Communication
        packages.add(new PackageItem("expo-notifications", "Push notifications with rich content and actions", "Network", COLOR_NETWORK));
        packages.add(new PackageItem("expo-web-browser", "Open URLs in an in-app browser (SFSafariViewController/CCT)", "Network", COLOR_NETWORK));
        packages.add(new PackageItem("expo-mail-composer", "Compose and send emails natively", "Network", COLOR_NETWORK));
        packages.add(new PackageItem("expo-sms", "Send SMS messages", "Network", COLOR_NETWORK));
        packages.add(new PackageItem("expo-sharing", "Share files and content via the native share sheet", "Network", COLOR_NETWORK));
        packages.add(new PackageItem("expo-print", "Print documents and web content", "Network", COLOR_NETWORK));

        // Authentication & Security
        packages.add(new PackageItem("expo-auth-session", "OAuth 2.0 and OpenID Connect authentication flows", "Auth", COLOR_AUTH));
        packages.add(new PackageItem("expo-local-authentication", "Biometric auth (Face ID, Touch ID, fingerprint)", "Auth", COLOR_AUTH));
        packages.add(new PackageItem("expo-apple-authentication", "Sign in with Apple", "Auth", COLOR_AUTH));
        packages.add(new PackageItem("expo-crypto", "Cryptographic hashing (SHA-256, MD5, etc.)", "Auth", COLOR_AUTH));
        packages.add(new PackageItem("expo-tracking-transparency", "iOS App Tracking Transparency (ATT) prompt", "Auth", COLOR_AUTH));
        packages.add(new PackageItem("expo-app-integrity", "App integrity verification (Play Integrity / DeviceCheck)", "Auth", COLOR_AUTH));

        // Device Features
        packages.add(new PackageItem("expo-contacts", "Read and write device contacts", "Device", COLOR_DEVICE));
        packages.add(new PackageItem("expo-calendar", "Access and manage calendar events", "Device", COLOR_DEVICE));
        packages.add(new PackageItem("expo-localization", "Locale, timezone, and language detection", "Device", COLOR_DEVICE));
        packages.add(new PackageItem("expo-speech", "Text-to-speech synthesis", "Device", COLOR_DEVICE));
        packages.add(new PackageItem("expo-intent-launcher", "Launch Android intents and system settings", "Device", COLOR_DEVICE));
        packages.add(new PackageItem("expo-store-review", "Prompt users to rate the app in the store", "Device", COLOR_DEVICE));
        packages.add(new PackageItem("expo-screen-capture", "Prevent or detect screen capture/recording", "Device", COLOR_DEVICE));
        packages.add(new PackageItem("expo-maps", "Native maps integration (Apple Maps / Google Maps)", "Device", COLOR_DEVICE));

        // Background & Tasks
        packages.add(new PackageItem("expo-background-fetch", "Periodic background data fetching", "Tasks", COLOR_TOOLS));
        packages.add(new PackageItem("expo-background-task", "Background task scheduling and execution", "Tasks", COLOR_TOOLS));
        packages.add(new PackageItem("expo-task-manager", "Register and manage background tasks", "Tasks", COLOR_TOOLS));

        // Dev Tools
        packages.add(new PackageItem("expo-dev-client", "Custom development client with dev menu", "Dev Tools", COLOR_TOOLS));
        packages.add(new PackageItem("expo-dev-menu", "In-app developer menu for debugging", "Dev Tools", COLOR_TOOLS));
        packages.add(new PackageItem("expo-dev-launcher", "Launch different builds from the dev launcher", "Dev Tools", COLOR_TOOLS));
        packages.add(new PackageItem("expo-doctor", "Diagnose and fix common Expo project issues", "Dev Tools", COLOR_TOOLS));
        packages.add(new PackageItem("create-expo", "CLI to scaffold new Expo projects", "Dev Tools", COLOR_TOOLS));
        packages.add(new PackageItem("create-expo-module", "CLI to scaffold new Expo native modules", "Dev Tools", COLOR_TOOLS));
        packages.add(new PackageItem("jest-expo", "Jest preset for testing Expo apps", "Dev Tools", COLOR_TOOLS));
        packages.add(new PackageItem("expo-modules-autolinking", "Auto-link native Expo modules in iOS/Android builds", "Dev Tools", COLOR_TOOLS));
        packages.add(new PackageItem("expo-build-properties", "Configure native build properties via app.json", "Dev Tools", COLOR_TOOLS));
        packages.add(new PackageItem("install-expo-modules", "Migrate existing React Native apps to Expo modules", "Dev Tools", COLOR_TOOLS));

        // Observability
        packages.add(new PackageItem("expo-observe", "Performance monitoring and app metrics", "Observability", COLOR_NAVIGATION));
        packages.add(new PackageItem("expo-insights", "Analytics and usage insights", "Observability", COLOR_NAVIGATION));
        packages.add(new PackageItem("expo-updates-interface", "Interface for custom update providers", "Observability", COLOR_NAVIGATION));

        return packages;
    }

    public static List<AppItem> getAllApps() {
        List<AppItem> apps = new ArrayList<>();
        apps.add(new AppItem("bare-expo", "The main Expo showcase app — runs native-component-list and test-suite with bare React Native", "Showcase", 0xFF4F46E5));
        apps.add(new AppItem("native-component-list", "Interactive demo of every Expo component and API (90+ screens)", "Demo", 0xFF7C3AED));
        apps.add(new AppItem("expo-go", "The Expo Go client app for scanning QR codes and running projects instantly", "Client", 0xFF2563EB));
        apps.add(new AppItem("test-suite", "Automated test suite for all Expo modules", "Testing", 0xFF059669));
        apps.add(new AppItem("sandbox", "Minimal sandbox for quick experiments", "Dev", 0xFFD97706));
        apps.add(new AppItem("minimal-tester", "Minimal app for testing individual modules", "Testing", 0xFF0891B2));
        apps.add(new AppItem("notification-tester", "Test push notifications end-to-end", "Testing", 0xFFDC2626));
        apps.add(new AppItem("router-e2e", "End-to-end tests for expo-router", "Testing", 0xFF65A30D));
        apps.add(new AppItem("brownfield-tester", "Test Expo modules in a brownfield (existing native) app", "Integration", 0xFFF59E0B));
        apps.add(new AppItem("observe-tester", "Test expo-observe performance monitoring", "Testing", 0xFF0891B2));
        apps.add(new AppItem("thappa", "Internal Expo team app", "Internal", 0xFF6B7280));
        apps.add(new AppItem("eas-expo-go", "EAS-specific Expo Go build", "Client", 0xFF2563EB));
        apps.add(new AppItem("expo-workflow-testing", "Test Expo workflow configurations", "Testing", 0xFF059669));
        apps.add(new AppItem("jest-expo-mock-generator", "Generate mocks for jest-expo", "Dev", 0xFF65A30D));
        return apps;
    }

    public static List<ArchLayer> getArchitectureLayers() {
        List<ArchLayer> layers = new ArrayList<>();

        layers.add(new ArchLayer(
            "JavaScript / TypeScript Layer",
            "Your app code written in React & TypeScript. Uses Expo SDK APIs, expo-router for navigation, and React Native components.",
            new String[]{"React 19", "TypeScript", "expo-router", "React Navigation", "Reanimated 4"},
            0xFF4F46E5
        ));

        layers.add(new ArchLayer(
            "Expo SDK Layer",
            "100+ pre-built modules providing access to device hardware and OS features via a unified JavaScript API.",
            new String[]{"expo-camera", "expo-location", "expo-notifications", "expo-sqlite", "expo-updates"},
            0xFF7C3AED
        ));

        layers.add(new ArchLayer(
            "Expo Modules Core",
            "The bridge between JS and native code. Provides Swift (iOS) and Kotlin (Android) APIs for writing native modules with minimal boilerplate.",
            new String[]{"JSI (C++)", "Swift API", "Kotlin API", "Codegen", "Autolinking"},
            0xFFDB2777
        ));

        layers.add(new ArchLayer(
            "React Native Layer",
            "The cross-platform runtime. Hermes JS engine, Fabric renderer (new architecture), and the native bridge.",
            new String[]{"Hermes Engine", "Fabric Renderer", "TurboModules", "JSI Bridge", "Metro Bundler"},
            0xFF2563EB
        ));

        layers.add(new ArchLayer(
            "Native Platform Layer",
            "The underlying operating system APIs and hardware accessed through the layers above.",
            new String[]{"Android SDK (Java/Kotlin)", "iOS SDK (Swift/ObjC)", "NDK (C/C++)", "JNI"},
            0xFF059669
        ));

        layers.add(new ArchLayer(
            "Build & Tooling Layer",
            "EAS (Expo Application Services) for cloud builds, OTA updates, and CI/CD. Local tools for development.",
            new String[]{"EAS Build", "EAS Update", "EAS Submit", "expo-doctor", "Expo CLI"},
            0xFFD97706
        ));

        return layers;
    }
}
