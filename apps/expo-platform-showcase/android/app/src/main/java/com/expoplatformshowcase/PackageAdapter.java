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

public class PackageAdapter extends RecyclerView.Adapter<PackageAdapter.ViewHolder> {

    public interface OnItemClickListener {
        void onItemClick(PackageItem item);
    }

    private final List<PackageItem> items;
    private final OnItemClickListener listener;

    public PackageAdapter(List<PackageItem> items, OnItemClickListener listener) {
        this.items = items;
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_package, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        PackageItem item = items.get(position);
        holder.bind(item, listener);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        private final CardView card;
        private final TextView nameText;
        private final TextView descText;
        private final TextView categoryBadge;
        private final View colorBar;

        ViewHolder(View itemView) {
            super(itemView);
            card = itemView.findViewById(R.id.card);
            nameText = itemView.findViewById(R.id.package_name);
            descText = itemView.findViewById(R.id.package_desc);
            categoryBadge = itemView.findViewById(R.id.category_badge);
            colorBar = itemView.findViewById(R.id.color_bar);
        }

        void bind(PackageItem item, OnItemClickListener listener) {
            nameText.setText(item.name);
            descText.setText(item.description);
            categoryBadge.setText(item.category);
            colorBar.setBackgroundColor(item.color);
            categoryBadge.setBackgroundColor(item.color);

            itemView.setOnClickListener(v -> listener.onItemClick(item));
        }
    }
}
