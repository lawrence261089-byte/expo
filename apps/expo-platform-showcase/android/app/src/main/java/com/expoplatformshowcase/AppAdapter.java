package com.expoplatformshowcase;

import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.cardview.widget.CardView;
import androidx.recyclerview.widget.RecyclerView;

import java.util.List;

public class AppAdapter extends RecyclerView.Adapter<AppAdapter.ViewHolder> {

    private final List<AppItem> items;

    public AppAdapter(List<AppItem> items) {
        this.items = items;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_app, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        AppItem item = items.get(position);
        holder.bind(item);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        private final View colorBar;
        private final TextView nameText;
        private final TextView descText;
        private final TextView typeBadge;

        ViewHolder(View itemView) {
            super(itemView);
            colorBar = itemView.findViewById(R.id.app_color_bar);
            nameText = itemView.findViewById(R.id.app_name);
            descText = itemView.findViewById(R.id.app_desc);
            typeBadge = itemView.findViewById(R.id.app_type_badge);
        }

        void bind(AppItem item) {
            nameText.setText(item.name);
            descText.setText(item.description);
            typeBadge.setText(item.type);
            colorBar.setBackgroundColor(item.color);
            typeBadge.setBackgroundColor(item.color);
        }
    }
}
