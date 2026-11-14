# AI Dispatch (PS10) 🚑
## Intelligent Real-Time Emergency Coordination and Dynamic Resource Allocation Platform
**Team: CodeRangers**

AI Dispatch is an enterprise-grade emergency coordination platform engineered for **Global, Dynamic, Multi-Incident Resource Optimization**. Rather than naively dispatching the nearest vehicle independently per incident, AI Dispatch simultaneously optimizes across all active emergencies, multi-agency fleet resources (ALS, BLS, ICU ambulances, Fire Engines, Rescue Boats, HazMat teams), and hospital capacities.

---

## 🌟 Key Capabilities (PS10 Innovations)

1. **Global Multi-Incident Hungarian Optimization:**
   - Solves bipartite multi-emergency matching simultaneously using the Kuhn-Munkres algorithm.
   - Computes globally optimal trade-offs considering urgency, travel time, and stability bonuses to prevent unnecessary assignment churn.

2. **Hard Clinical & Operational Constraints:**
   - **Zero ICU Rule:** An incident requiring an ICU bed is *never* assigned to a hospital with 0 available ICU beds.
   - **Capability Requirement Matching:** Cardiac and multi-casualty incidents strictly match ALS/ICU units; structural fires require Fire Engines; urban floods require Rescue Boats/Teams.
   - **1-to-1 Vehicle Exclusivity:** Emergency vehicles cannot be double-allocated.
   - **Resource Availability:** Offline or maintenance units are strictly excluded.

3. **Event-Driven Dynamic Reallocation Engine:**
   - Automatically re-evaluates central system state on operational disruptions:
     - Vehicle breakdown or unavailability
     - Hospital zero ICU bed reports or overload
     - Traffic congestion and flood waterlogging on primary routes
     - New higher-priority emergencies reported in real time
   - Preserves valid ongoing assignments unless clinically justified.
   - Emits real-time updates via WebSockets (Socket.IO).

4. **Traffic-Aware Routing & Weather Integration:**
   - OSRM route generation with dynamic traffic and waterlogging penalties (+12 min for blocked roads).
   - Live weather integration via Open-Meteo API.
   - Automatic calculation and suggestion of Alternative Bypass Detours.

5. **24-Hour Demand Forecasting & Hotspot Analytics:**
   - Empirical hourly arrival rate modeling with morning and evening peak windows.
   - High-risk geographical hotspot identification with pre-positioning recommendations.

6. **Strategy Benchmark Evaluation:**
   - Comparative evaluation of:
     - *Strategy 1:* Nearest Available (Greedy Distance)
     - *Strategy 2:* Severity-Prioritized Dispatch
     - *Strategy 3:* Proposed Global Dynamic Optimization
   - Quantified improvements: 66% critical response time reduction with strictly 0 ICU overloads and 0 capability mismatches.

7. **Citizen Emergency Portal & Live Tracking:**
   - Multi-category emergency reporting (Road Accident, Cardiac, Medical, Fire, Urban Flood, Natural Disaster).
   - Voice-to-text dictation via Web Speech API.
   - Optional Computer Vision scene hazard analysis preview.
   - Citizen tracking portal (`/track/:token`) for live vehicle ETA and designated hospital status.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT 19 FRONTEND                        │
│  - Operations Dashboard (/dashboard)                        │
│  - PS10 Interactive Scenario Simulator (/dashboard/ps10)    │
│  - Central Dispatch Board (/dashboard/dispatch)             │
│  - Hospital Capacity Admin Portal (/dashboard/hospitals)    │
│  - Analytics & Strategy Benchmarks (/dashboard/analytics)   │
│  - Citizen Intake & Voice Reporting (/report)               │
│  - Citizen Live Response Tracker (/track/:token)            │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / WebSocket
┌──────────────────────────────▼──────────────────────────────┐
│                    NODE.JS / EXPRESS BACKEND                │
│  - Global Multi-Incident Hungarian Solver                   │
│  - Event-Driven Dynamic Reallocation Engine                 │
│  - Hospital Capacity & Clinical Constraint Matcher          │
│  - OSRM + Weather-Aware Detour Routing Engine               │
│  - Audit Logging (AllocationLog) & Concurrency Controls     │
│  - Socket.IO Real-Time Dispatch Broadcast                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP Microservice
┌──────────────────────────────▼──────────────────────────────┐
│                    FASTAPI PYTHON AI SERVICE                │
│  - Scikit-Learn TF-IDF Random Forest Severity Model         │
│  - Multi-Agency Resource Requirement Estimator              │
│  - Computer Vision Scene Hazard Classifier                  │
│  - Gemini 1.5 Pro Natural Language Triage                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 PS10 Critical End-to-End Test Scenario

A dedicated interactive simulator is built directly into the application under **PS10 Simulator** (`/dashboard/ps10`).

### The Scenario:
* **Initial State (10:30 AM):**
  - Incident A: Road accident involving 5 injured people.
  - Incident B: Critical cardiac emergency (ventricular arrhythmia).
  - Incident C: Urban flooding with 8 trapped people.
  - Multi-agency resources dispatched via Global Dynamic Optimization.
* **Step 1 (10:31 AM):** Nearest ambulance assigned to Incident A reports engine failure.
  - *Result:* Reallocation engine dynamically recalculates and deploys backup unit AMB-A03 without disrupting ongoing cardiac transit.
* **Step 2 (10:32 AM):** Hospital initially selected for Incident B reports 0 ICU beds.
  - *Result:* Strict hard constraint diverts cardiac patient to Metro Specialty Hospital (6 available ICU beds). Zero patients are routed to a full ICU.
* **Step 3 (10:33 AM):** Heavy rainfall increases congestion and waterlogging on shortest route (+12 min penalty).
  - *Result:* Route recalculation automatically switches vehicle to Alternative Bypass Detour.
* **Step 4 (10:34 AM):** Fourth critical emergency (Industrial Fire) is reported.
  - *Result:* Simultaneous 4-incident optimization dispatches Fire Engine FIRE-F01 while preserving all active operations.

---

## 🚀 Quickstart & Installation Instructions

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (3.9+)
- **MongoDB** (Local or MongoDB Atlas)

### 2. Backend Setup
```bash
cd backend
npm install
npm run seed     # Seeds hospitals, fleet, and historical datasets
npm start        # Starts server on port 5000
```

### 3. AI Service Setup
```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Runs Vite dev server on http://localhost:5173
```

### 5. Running the Automated PS10 Test Suite
```bash
cd backend
npm test
```
Validates all 8 core constraints:
- ✓ Rule 1: 1-to-1 Vehicle Exclusivity
- ✓ Rule 2: Unavailable/Maintenance Vehicles Excluded
- ✓ Rule 3: Zero ICU Hospital Strict Prohibition
- ✓ Rule 4: Emergency Capability Matching
- ✓ Rule 5: Traffic & Road Hazard Recalculation
- ✓ Rule 6: Reassignment Stability & Churn Prevention
- ✓ Rule 7: Strategy Benchmark Calculations
- ✓ Rule 8: Explicit Deficit Alerts
