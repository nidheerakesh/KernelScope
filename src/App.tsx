import { useState } from "react";
import { Activity, Cpu, HardDrive, Network, Layers, TerminalSquare, FolderOpen, Zap, BookOpen } from "lucide-react";
import "./App.css";
import { Dashboard } from "./dashboards/Dashboard";
import { ProcessMap } from "./dashboards/ProcessMap";
import { MemoryMap } from "./dashboards/MemoryMap";
import { SyscallWaterfall } from "./dashboards/SyscallWaterfall";
import { FilesystemActivity } from "./dashboards/FilesystemActivity";
import { NetworkMap } from "./dashboards/NetworkMap";
import { KernelEvents } from "./dashboards/KernelEvents";
import { EducationalPanel } from "./dashboards/EducationalPanel";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 font-sans">
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-6 border-r border-slate-800/50 bg-slate-900/50 backdrop-blur-md">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-8 shadow-[0_0_15px_rgba(34,211,238,0.3)] border border-cyan-500/30">
          <Activity size={24} />
        </div>
        
        <nav className="flex flex-col gap-6 flex-1">
          <NavItem icon={<Layers />} isActive={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
          <NavItem icon={<Cpu />} isActive={activeTab === "processes"} onClick={() => setActiveTab("processes")} />
          <NavItem icon={<HardDrive />} isActive={activeTab === "memory"} onClick={() => setActiveTab("memory")} />
          <NavItem icon={<FolderOpen />} isActive={activeTab === "fs"} onClick={() => setActiveTab("fs")} />
          <NavItem icon={<Network />} isActive={activeTab === "network"} onClick={() => setActiveTab("network")} />
          <NavItem icon={<Zap />} isActive={activeTab === "kernel"} onClick={() => setActiveTab("kernel")} />
          <NavItem icon={<TerminalSquare />} isActive={activeTab === "syscalls"} onClick={() => setActiveTab("syscalls")} />
          <NavItem icon={<BookOpen />} isActive={activeTab === "learn"} onClick={() => setActiveTab("learn")} />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 flex items-center px-6 border-b border-slate-800/50 bg-slate-900/20">
          <h1 className="text-xl font-medium tracking-wide text-white">KernelScope <span className="text-slate-500 text-sm ml-2">v0.1.0-alpha</span></h1>
        </header>

        {/* Dashboard Area */}
        <div className="flex-1 p-6 overflow-hidden">
          {activeTab === "dashboard" ? (
            <Dashboard />
          ) : activeTab === "processes" ? (
            <ProcessMap />
          ) : activeTab === "memory" ? (
            <MemoryMap />
          ) : activeTab === "syscalls" ? (
            <SyscallWaterfall />
          ) : activeTab === "fs" ? (
            <FilesystemActivity />
          ) : activeTab === "network" ? (
            <NetworkMap />
          ) : activeTab === "kernel" ? (
            <KernelEvents />
          ) : activeTab === "learn" ? (
            <EducationalPanel />
          ) : null}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, isActive, onClick }: { icon: React.ReactNode, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-cyan-500/10 text-cyan-400 shadow-[inset_0_0_10px_rgba(34,211,238,0.2)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
    >
      {icon}
    </button>
  );
}

export default App;
