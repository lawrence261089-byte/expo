package com.expoplatformshowcase;

import android.graphics.Color;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.LinearLayout;
import android.view.View;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

public class PackageDetailActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_package_detail);

        String name = getIntent().getStringExtra("package_name");
        String description = getIntent().getStringExtra("package_description");
        String category = getIntent().getStringExtra("package_category");
        int color = getIntent().getIntExtra("package_color", 0xFF4F46E5);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setTitle(name);
        }
        toolbar.setNavigationOnClickListener(v -> finish());

        View headerBg = findViewById(R.id.header_bg);
        headerBg.setBackgroundColor(color);

        TextView nameText = findViewById(R.id.detail_name);
        TextView descText = findViewById(R.id.detail_description);
        TextView categoryText = findViewById(R.id.detail_category);
        TextView installText = findViewById(R.id.detail_install);
        TextView usageText = findViewById(R.id.detail_usage);

        nameText.setText(name);
        descText.setText(description);
        categoryText.setText("Category: " + category);
        categoryText.setTextColor(color);

        installText.setText("npx expo install " + name);
        usageText.setText(getUsageExample(name));
    }

    private String getUsageExample(String packageName) {
        switch (packageName) {
            case "expo-camera":
                return "import { CameraView, useCameraPermissions } from 'expo-camera';\n\n" +
                       "export default function App() {\n" +
                       "  const [permission, requestPermission] = useCameraPermissions();\n" +
                       "  return <CameraView style={styles.camera} facing=\"back\" />;\n" +
                       "}";
            case "expo-location":
                return "import * as Location from 'expo-location';\n\n" +
                       "const { status } = await Location.requestForegroundPermissionsAsync();\n" +
                       "const location = await Location.getCurrentPositionAsync({});";
            case "expo-notifications":
                return "import * as Notifications from 'expo-notifications';\n\n" +
                       "const token = await Notifications.getExpoPushTokenAsync();\n" +
                       "await Notifications.scheduleNotificationAsync({\n" +
                       "  content: { title: 'Hello!', body: 'World' },\n" +
                       "  trigger: { seconds: 2 },\n" +
                       "});";
            case "expo-router":
                return "// app/_layout.tsx\n" +
                       "import { Stack } from 'expo-router';\n\n" +
                       "export default function Layout() {\n" +
                       "  return <Stack />;\n" +
                       "}\n\n" +
                       "// app/index.tsx — maps to '/' route\n" +
                       "export default function Home() {\n" +
                       "  return <Text>Home Screen</Text>;\n" +
                       "}";
            case "expo-sqlite":
                return "import * as SQLite from 'expo-sqlite';\n\n" +
                       "const db = await SQLite.openDatabaseAsync('mydb.db');\n" +
                       "await db.execAsync('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)');\n" +
                       "const rows = await db.getAllAsync('SELECT * FROM users');";
            case "expo-updates":
                return "import * as Updates from 'expo-updates';\n\n" +
                       "const update = await Updates.checkForUpdateAsync();\n" +
                       "if (update.isAvailable) {\n" +
                       "  await Updates.fetchUpdateAsync();\n" +
                       "  await Updates.reloadAsync();\n" +
                       "}";
            default:
                return "import * as Module from '" + packageName + "';\n\n" +
                       "// See the official Expo documentation at:\n" +
                       "// https://docs.expo.dev/versions/latest/sdk/" +
                       packageName.replace("expo-", "") + "/";
        }
    }
}
