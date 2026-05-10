package com.expoplatformshowcase;

import android.content.Intent;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.card.MaterialCardView;
import com.google.android.material.tabs.TabLayout;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private RecyclerView recyclerView;
    private PackageAdapter adapter;
    private BottomNavigationView bottomNav;
    private TextView headerTitle;
    private TextView headerSubtitle;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        headerTitle = findViewById(R.id.header_title);
        headerSubtitle = findViewById(R.id.header_subtitle);
        recyclerView = findViewById(R.id.recycler_view);
        bottomNav = findViewById(R.id.bottom_navigation);

        recyclerView.setLayoutManager(new GridLayoutManager(this, 2));

        // Show packages by default
        showPackages();

        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_packages) {
                showPackages();
                return true;
            } else if (id == R.id.nav_apps) {
                startActivity(new Intent(this, AppsActivity.class));
                return false;
            } else if (id == R.id.nav_architecture) {
                startActivity(new Intent(this, ArchitectureActivity.class));
                return false;
            }
            return false;
        });

        // Stats cards
        setupStatsCards();
    }

    private void setupStatsCards() {
        TextView packagesCount = findViewById(R.id.stat_packages);
        TextView appsCount = findViewById(R.id.stat_apps);
        TextView screensCount = findViewById(R.id.stat_screens);

        packagesCount.setText("100+");
        appsCount.setText("14");
        screensCount.setText("90+");
    }

    private void showPackages() {
        headerTitle.setText("Expo Platform");
        headerSubtitle.setText("Explore 100+ packages powering cross-platform development");
        List<PackageItem> packages = ExpoData.getAllPackages();
        adapter = new PackageAdapter(packages, item -> {
            Intent intent = new Intent(this, PackageDetailActivity.class);
            intent.putExtra("package_name", item.name);
            intent.putExtra("package_description", item.description);
            intent.putExtra("package_category", item.category);
            intent.putExtra("package_color", item.color);
            startActivity(intent);
        });
        recyclerView.setAdapter(adapter);
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.main_menu, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == R.id.action_architecture) {
            startActivity(new Intent(this, ArchitectureActivity.class));
            return true;
        }
        return super.onOptionsItemSelected(item);
    }
}
