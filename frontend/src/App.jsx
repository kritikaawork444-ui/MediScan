import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import SymptomCheckerLocal from "./pages/SymptomCheckerLocal.jsx";
import MLSymptomPredictor from "./pages/MLSymptomPredictor.jsx";
import GenderHealthCheck from "./pages/GenderHealthCheck.jsx";
import ReportScanner from "./pages/ReportScanner.jsx";
import ReportSummary from "./pages/ReportSummary.jsx";
import InjuryAnalyzer from "./pages/InjuryAnalyzer.jsx";
import Encyclopedia from "./pages/Encyclopedia.jsx";
import History from "./pages/History.jsx";
import Profile from "./pages/Profile.jsx";
import DoctorConsult from "./pages/DoctorConsult.jsx";
import BottomNav from "./components/BottomNav.jsx";
import Sidebar from "./components/Sidebar.jsx";

export default function App() {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 min-w-0 pb-28 md:pb-10">
        <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ai-checker" element={<SymptomCheckerLocal />} />
            <Route path="/ml-checker" element={<MLSymptomPredictor />} />
            <Route path="/gender-check" element={<GenderHealthCheck />} />
            <Route path="/consult" element={<DoctorConsult />} />
            <Route path="/reports" element={<ReportScanner />} />
            <Route path="/reports/result" element={<ReportSummary />} />
            <Route path="/injury" element={<InjuryAnalyzer />} />
            <Route path="/encyclopedia" element={<Encyclopedia />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
