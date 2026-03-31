import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as venn from 'venn.js';

interface VennDiagramProps {
  data: Array<{ sets: string[]; size: number; label?: string }>;
  noneCount: number;
}

const colorMap: Record<string, string> = {
  'Toán': '#3b82f6', // blue-500
  'Văn': '#f43f5e',  // rose-500
  'Anh': '#10b981',  // emerald-500
};

export const VennDiagram: React.FC<VennDiagramProps> = ({ data, noneCount }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    
    // Clear previous diagram
    d3.select(chartRef.current).selectAll("*").remove();
    
    if (data.length === 0) {
      d3.select(chartRef.current)
        .append("div")
        .attr("class", "flex flex-col items-center justify-center h-full text-slate-400 italic space-y-4")
        .html(`
          <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2 shadow-inner">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <p class="font-medium">Chưa có dữ liệu khảo sát</p>
        `);
      return;
    }

    const chart = venn.VennDiagram()
      .width(500)
      .height(400);

    const div = d3.select(chartRef.current);
    div.datum(data).call(chart);

    // Add drop shadow filter definition
    const defs = div.select("svg").append("defs");
    const filter = defs.append("filter")
      .attr("id", "drop-shadow")
      .attr("height", "130%");
    filter.append("feDropShadow")
      .attr("dx", "0")
      .attr("dy", "8")
      .attr("stdDeviation", "8")
      .attr("flood-color", "#0f172a")
      .attr("flood-opacity", "0.15");

    // Add gradients
    const gradMath = defs.append("linearGradient").attr("id", "grad-math").attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%");
    gradMath.append("stop").attr("offset", "0%").style("stop-color", "#60a5fa"); // blue-400
    gradMath.append("stop").attr("offset", "100%").style("stop-color", "#2563eb"); // blue-600

    const gradLit = defs.append("linearGradient").attr("id", "grad-lit").attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%");
    gradLit.append("stop").attr("offset", "0%").style("stop-color", "#fb7185"); // rose-400
    gradLit.append("stop").attr("offset", "100%").style("stop-color", "#e11d48"); // rose-600

    const gradEng = defs.append("linearGradient").attr("id", "grad-eng").attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%");
    gradEng.append("stop").attr("offset", "0%").style("stop-color", "#34d399"); // emerald-400
    gradEng.append("stop").attr("offset", "100%").style("stop-color", "#059669"); // emerald-600

    const gradientMap: Record<string, string> = {
      'Toán': 'url(#grad-math)',
      'Văn': 'url(#grad-lit)',
      'Anh': 'url(#grad-eng)',
    };

    // Apply custom colors and blend modes
    div.selectAll("g")
      .each(function(d: any) {
        const node = d3.select(this);
        if (d.sets.length === 1) {
          const color = gradientMap[d.sets[0]] || colorMap[d.sets[0]];
          if (color) {
            node.select("path")
              .style("fill", color)
              .style("fill-opacity", 0.7)
              .style("mix-blend-mode", "multiply")
              .style("filter", "url(#drop-shadow)");
          }
        }
      });

    // Style the text and handle multiline labels
    div.selectAll("text")
      .style("fill", "#ffffff") 
      .style("font-family", "Inter, sans-serif")
      .style("text-shadow", "0px 2px 4px rgba(0,0,0,0.3)")
      .each(function(d: any) {
        const textNode = d3.select(this);
        const label = d.label || "";
        if (label.includes("\n")) {
          const lines = label.split("\n");
          textNode.text(""); // clear existing
          lines.forEach((line, i) => {
            textNode.append("tspan")
              .attr("x", textNode.attr("x") || 0)
              .attr("dy", i === 0 ? "-0.2em" : "1.2em")
              .text(line)
              .style("font-size", i === 1 ? "26px" : "16px")
              .style("font-weight", i === 1 ? "900" : "700")
              .style("fill", "#ffffff");
          });
        } else {
          textNode
            .style("font-size", d.sets.length > 1 ? "24px" : "16px")
            .style("font-weight", d.sets.length > 1 ? "900" : "700")
            .style("fill", "#ffffff");
        }
      });

    // Add tooltips
    const tooltip = d3.select("body").append("div")
      .attr("class", "venntooltip")
      .style("position", "absolute")
      .style("text-align", "center")
      .style("width", "auto")
      .style("min-width", "140px")
      .style("height", "auto")
      .style("background", "rgba(15, 23, 42, 0.9)") // slate-900 with opacity
      .style("backdrop-filter", "blur(4px)")
      .style("color", "#fff")
      .style("padding", "10px 16px")
      .style("border", "1px solid rgba(255,255,255,0.1)")
      .style("border-radius", "12px")
      .style("box-shadow", "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)")
      .style("opacity", 0)
      .style("pointer-events", "none")
      .style("font-size", "14px")
      .style("font-weight", "500")
      .style("font-family", "Inter, sans-serif")
      .style("z-index", 1000)
      .style("white-space", "nowrap")
      .style("transform", "translate(-50%, -100%)")
      .style("margin-top", "-12px");

    div.selectAll("g")
      .on("mouseover", function (event, d: any) {
        venn.sortAreas(div, d);
        tooltip.transition().duration(200).style("opacity", 1);
        
        let tooltipText = "";
        if (d.sets.length === 1) {
          tooltipText = `<div style="color: #cbd5e1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Tổng số học sinh thích ${d.sets[0]}</div><div style="font-size: 28px; font-weight: 900; color: #fff;">${d.size}</div>`;
        } else {
          tooltipText = `<div style="color: #cbd5e1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Thích cả ${d.sets.join(' & ')}</div><div style="font-size: 28px; font-weight: 900; color: #fff;">${d.size}</div>`;
        }
        tooltip.html(tooltipText);

        const selection = d3.select(this).transition("tooltip").duration(200);
        selection.select("path")
          .style("stroke", "#ffffff")
          .style("stroke-width", 4)
          .style("fill-opacity", d.sets.length === 1 ? 0.9 : 0.5)
          .style("stroke-opacity", 1);
      })
      .on("mousemove", function (event) {
        tooltip.style("left", event.pageX + "px")
               .style("top", event.pageY + "px");
      })
      .on("mouseout", function (event, d: any) {
        tooltip.transition().duration(200).style("opacity", 0);
        const selection = d3.select(this).transition("tooltip").duration(200);
        selection.select("path")
          .style("stroke-width", 0)
          .style("fill-opacity", d.sets.length === 1 ? 0.7 : 0.0)
          .style("stroke-opacity", 0);
      });

    return () => {
      tooltip.remove();
    };
  }, [data]);

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-[2rem] p-8 bg-slate-50/50 border border-slate-100 shadow-inner">
      <div className="absolute top-6 left-6 flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-200 border border-slate-400"></span>
        </div>
        <span className="text-sm font-medium text-slate-500">
          Không thích môn nào: <strong className="text-slate-800 text-base ml-1">{noneCount}</strong>
        </span>
      </div>
      <div ref={chartRef} className="w-full h-[400px] flex justify-center items-center mt-4" />
    </div>
  );
};
