import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Activity } from 'lucide-react';
import { useProcessStore } from '../engine/processStore';

export function ProcessMap() {
  const { processes, startListening } = useProcessStore();
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    startListening();
  }, [startListening]);

  useEffect(() => {
    if (!processes.length || !svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Setup Process nodes
    const nodes = processes.map(d => ({ ...d, id: d.pid }));
    const processMap = new Map(nodes.map(d => [d.id, d]));

    const links = processes
      .filter(d => d.ppid && processMap.has(d.ppid))
      .map(d => ({
        source: d.ppid as number,
        target: d.pid
      }));

    // Setup Force Directed Simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(40).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => Math.sqrt(d.memory / 1024 / 1024 / 2) + 5));

    // Stop simulation after it settles (about 300 ticks) to "make it stay"
    simulation.alphaMin(0.05); 

    const g = svg.append("g");

    const link = g.append("g")
      .attr("stroke", "#1e293b")
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(links)
      .join("line");

    const node = g.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", d => Math.max(3, Math.sqrt(d.memory / 1024 / 1024 / 2)))
      .attr("fill", d => d.status.includes("Run") ? "#22d3ee" : d.status.includes("Sleep") ? "#475569" : "#d946ef")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .call(drag(simulation));

    // Create a dedicated tooltip div in the dashboard
    const tooltip = d3.select("body").append("div")
      .attr("id", "process-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(15, 23, 42, 0.95)")
      .style("border", "1px solid rgba(34, 211, 238, 0.4)")
      .style("padding", "12px")
      .style("border-radius", "8px")
      .style("color", "#f1f5f9")
      .style("font-family", "monospace")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "100")
      .style("box-shadow", "0 0 20px rgba(0,0,0,0.5)");

    node.on("mouseover", (event, d: any) => {
      d3.select(event.currentTarget).attr("stroke", "#22d3ee").attr("stroke-width", 2);
      tooltip.style("visibility", "visible")
        .html(`
          <div style="color:#22d3ee; font-weight:bold; margin-bottom:4px;">${d.name}</div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <span style="color:#64748b">PID:</span> <span>${d.pid}</span>
            <span style="color:#64748b">PPID:</span> <span>${d.ppid || '1'}</span>
            <span style="color:#64748b">CPU:</span> <span style="color:#4ade80">${d.cpu_usage.toFixed(1)}%</span>
            <span style="color:#64748b">MEM:</span> <span>${(d.memory/1024/1024).toFixed(1)} MB</span>
            <span style="color:#64748b">STATE:</span> <span style="text-transform:uppercase">${d.status}</span>
          </div>
        `);
    })
    .on("mousemove", (event) => {
      tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 20) + "px");
    })
    .on("mouseout", (event) => {
      d3.select(event.currentTarget).attr("stroke", "#0f172a").attr("stroke-width", 1);
      tooltip.style("visibility", "hidden");
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
    });

    function drag(simulation: any) {
      return d3.drag()
        .on("start", (event) => {
          if (!event.active) simulation.alphaTarget(0.1).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        })
        .on("drag", (event) => {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        })
        .on("end", (event) => {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        }) as any;
    }

    return () => {
      simulation.stop();
      d3.select("#process-tooltip").remove();
    };
  }, [processes]);

  if (!processes.length) {
    return (
      <div className="w-full h-full rounded-2xl border border-slate-800/60 bg-slate-900/40 shadow-inner flex flex-col items-center justify-center relative overflow-hidden group">
        <Activity className="w-24 h-24 text-fuchsia-500/20 animate-pulse mb-6" />
        <h2 className="text-2xl font-light text-white mb-2 z-10">Initializing Process Matrix...</h2>
        <p className="text-slate-500 z-10 text-sm">Awaiting kernel process tree via Tauri IPC</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-2xl border border-slate-800/60 bg-slate-900/40 shadow-inner relative overflow-hidden flex flex-col">
      <div className="absolute top-4 left-4 z-10 bg-slate-950/80 backdrop-blur border border-slate-800/80 p-3 rounded-lg shadow-lg">
        <h3 className="text-sm font-medium text-slate-200 mb-2">Process Galaxy</h3>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]"></div>
            <span className="text-slate-400">Running / Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-500"></div>
            <span className="text-slate-400">Sleeping</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-fuchsia-500"></div>
            <span className="text-slate-400">Zombie / Stopped</span>
          </div>
        </div>
      </div>
      
      <svg ref={svgRef} className="w-full h-full bg-slate-950/50 cursor-move" />
    </div>
  );
}
