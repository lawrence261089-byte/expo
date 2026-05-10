package com.expoplatformshowcase;

import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.List;

public class ArchLayerAdapter extends RecyclerView.Adapter<ArchLayerAdapter.ViewHolder> {

    private final List<ArchLayer> layers;

    public ArchLayerAdapter(List<ArchLayer> layers) {
        this.layers = layers;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_arch_layer, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        ArchLayer layer = layers.get(position);
        holder.bind(layer, position + 1, layers.size());
    }

    @Override
    public int getItemCount() {
        return layers.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        private final View colorStripe;
        private final TextView layerNumber;
        private final TextView titleText;
        private final TextView descText;
        private final LinearLayout techContainer;

        ViewHolder(View itemView) {
            super(itemView);
            colorStripe = itemView.findViewById(R.id.color_stripe);
            layerNumber = itemView.findViewById(R.id.layer_number);
            titleText = itemView.findViewById(R.id.layer_title);
            descText = itemView.findViewById(R.id.layer_desc);
            techContainer = itemView.findViewById(R.id.tech_container);
        }

        void bind(ArchLayer layer, int position, int total) {
            colorStripe.setBackgroundColor(layer.color);
            layerNumber.setText("Layer " + position + " of " + total);
            layerNumber.setTextColor(layer.color);
            titleText.setText(layer.title);
            descText.setText(layer.description);

            techContainer.removeAllViews();
            for (String tech : layer.technologies) {
                TextView chip = new TextView(itemView.getContext());
                chip.setText(tech);
                chip.setTextColor(Color.WHITE);
                chip.setTextSize(11f);
                chip.setBackgroundColor(layer.color);
                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                );
                params.setMargins(0, 0, 12, 8);
                chip.setPadding(16, 6, 16, 6);
                chip.setLayoutParams(params);
                techContainer.addView(chip);
            }
        }
    }
}
