import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Activity, Navigation, BrainCircuit, ChevronRight, Map, ArrowRight, Hospital, Truck, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

const LandingPage = () => {
  return (
    <div className="min-h-screen relative overflow-hidden font-sans text-text-main flex flex-col bg-primary-900">
      <div className="flex-1 flex flex-col h-full w-full relative z-0">

        {/* Background static image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/landing-bg.jpg"
            alt="Emergency Operations"
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.35) saturate(0.7)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/90 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-900 via-transparent to-primary-900/70" />
        </div>

        {/* Navbar */}
        <nav className="h-16 border-b border-primary-700 bg-primary-800 px-6 lg:px-12 flex items-center justify-between z-50 relative shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-primary rounded shadow-sm flex items-center justify-center">
              <ShieldAlert className="text-white w-4 h-4" />
            </div>
            <span className="text-text-main text-sm font-bold tracking-widest uppercase">AI Dispatch</span>
          </div>

          <div className="hidden md:flex items-center gap-5 text-xs font-bold uppercase tracking-wider">
            <Link to="/dashboard" className="text-text-muted hover:text-brand-primary transition-colors">
              Dashboard
            </Link>
            <Link to="/dashboard/ps10" className="text-text-muted hover:text-brand-primary transition-colors">
              PS10 Simulator
            </Link>
            <Link to="/dashboard/ambulances" className="text-text-muted hover:text-brand-primary transition-colors">
              Ambulances
            </Link>
            <Link to="/dashboard/hospitals" className="text-text-muted hover:text-brand-primary transition-colors">
              Hospitals
            </Link>
            <Link to="/dashboard/reports" className="text-text-muted hover:text-brand-primary transition-colors">
              Reports
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/report" className="px-3.5 py-1.5 border border-emergency/30 bg-emergency/10 text-emergency text-xs font-bold tracking-wider uppercase rounded hover:bg-emergency/20 transition-all">
              Report Emergency
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold uppercase tracking-widest rounded transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Command Center</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col lg:flex-row items-center relative z-10 px-8 lg:px-16 py-12 gap-12">
          {/* LEFT: Text */}
          <div className="flex-1 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-brand-primary/15 border border-brand-primary/30 text-brand-primary text-[10px] font-bold tracking-widest uppercase mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-operational animate-pulse" />
              Emergency Operations Center • Active
            </div>

            <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-text-main uppercase leading-none mb-4">
              AI Emergency<br />
              <span className="text-brand-primary">Dispatch</span>
            </h1>

            <p className="text-base text-text-secondary max-w-xl leading-relaxed mb-8">
              Intelligent Real-Time Emergency Coordination, Ambulance Dispatch, and Dynamic Hospital Resource Allocation across Hyderabad and India.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/dashboard"
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold tracking-widest rounded shadow-sm transition-all uppercase"
              >
                <span>Command Dashboard</span>
                <ArrowRight size={15} />
              </Link>

              <Link
                to="/dashboard/hospitals"
                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-primary-800 hover:bg-primary-700 border border-primary-700 text-text-main text-xs font-bold tracking-widest rounded transition-all uppercase"
              >
                <Hospital size={15} className="text-brand-primary" />
                <span>Hospitals Network</span>
              </Link>

              <Link
                to="/dashboard/ambulances"
                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-primary-800 hover:bg-primary-700 border border-primary-700 text-text-main text-xs font-bold tracking-widest rounded transition-all uppercase"
              >
                <Truck size={15} className="text-operational" />
                <span>Ambulances Fleet</span>
              </Link>

              <Link
                to="/report"
                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-emergency/15 hover:bg-emergency/25 border border-emergency/30 text-emergency text-xs font-bold tracking-widest rounded transition-all uppercase"
              >
                <Radio size={15} />
                <span>Report Emergency</span>
              </Link>
            </div>
          </div>

          {/* RIGHT: Quick System Telemetry Card */}
          <div className="w-full lg:w-96 bg-primary-800/90 backdrop-blur border border-primary-700 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-primary-700 pb-3 mb-4">
              <span className="text-xs font-black uppercase tracking-wider text-text-main">Hyderabad EMS Status</span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-operational uppercase">
                <span className="w-2 h-2 rounded-full bg-operational animate-pulse" />
                Live Network
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center bg-primary-900/60 p-2.5 rounded-lg border border-primary-700/50">
                <span className="text-text-muted font-medium">Monitored Hospitals</span>
                <span className="font-extrabold text-text-main">20 Facilities</span>
              </div>
              <div className="flex justify-between items-center bg-primary-900/60 p-2.5 rounded-lg border border-primary-700/50">
                <span className="text-text-muted font-medium">Ambulance Fleet</span>
                <span className="font-extrabold text-operational">28 Units Active</span>
              </div>
              <div className="flex justify-between items-center bg-primary-900/60 p-2.5 rounded-lg border border-primary-700/50">
                <span className="text-text-muted font-medium">Optimization Engine</span>
                <span className="font-extrabold text-brand-primary">Hungarian Global Solver</span>
              </div>
              <div className="flex justify-between items-center bg-primary-900/60 p-2.5 rounded-lg border border-primary-700/50">
                <span className="text-text-muted font-medium">Hard Constraint</span>
                <span className="font-extrabold text-emergency">Zero-ICU Protected</span>
              </div>
            </div>

            <Link
              to="/dashboard/ps10"
              className="mt-5 w-full flex items-center justify-center gap-1.5 py-2.5 bg-primary-700 hover:bg-primary-600 text-text-main rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <span>Launch PS10 Simulator</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </main>

        {/* Feature Grid Strip */}
        <div className="border-t border-primary-700 bg-primary-800/80 backdrop-blur z-10 px-8 lg:px-16 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Activity,
                color: 'text-brand-primary',
                title: 'Global Optimization',
                desc: 'Multi-incident Hungarian solver minimizing total response latency.'
              },
              {
                icon: BrainCircuit,
                color: 'text-emergency',
                title: 'Zero-ICU Hard Constraint',
                desc: 'Guarantees critical patients are never routed to hospitals with 0 ICU beds.'
              },
              {
                icon: ShieldAlert,
                color: 'text-warning',
                title: 'Capability Matching',
                desc: 'Matches ALS, ICU ambulances, Fire Tenders, and Rescue Boats to incident demands.'
              },
              {
                icon: Navigation,
                color: 'text-operational',
                title: 'Dynamic Traffic Routing',
                desc: 'Live bypass around traffic bottlenecks, weather hazards, and flooded roads.'
              }
            ].map(item => (
              <div
                key={item.title}
                className="p-4 rounded-lg bg-primary-900/70 border border-primary-700 shadow-sm"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <item.icon className={item.color} size={18} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-main">{item.title}</h3>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LandingPage;
