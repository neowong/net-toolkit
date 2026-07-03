import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./layouts/AppShell";
import SubnetCalcPage from "./pages/SubnetCalcPage";
import LiveScanPage from "./pages/LiveScanPage";
import PortScanPage from "./pages/PortScanPage";
import TraceroutePage from "./pages/TraceroutePage";
import WebCheckPage from "./pages/WebCheckPage";
import SnmpPage from "./pages/SnmpPage";
import TftpPage from "./pages/TftpPage";
import SyslogPage from "./pages/SyslogPage";
import BatchPingPage from "./pages/BatchPingPage";
import DnsQueryPage from "./pages/DnsQueryPage";
import AboutPage from "./pages/AboutPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/subnet" replace />} />
        <Route path="/subnet" element={<SubnetCalcPage />} />
        <Route path="/scanner" element={<LiveScanPage />} />
        <Route path="/port" element={<PortScanPage />} />
        <Route path="/trace" element={<TraceroutePage />} />
        <Route path="/web" element={<WebCheckPage />} />
        <Route path="/snmp" element={<SnmpPage />} />
        <Route path="/tftp" element={<TftpPage />} />
        <Route path="/syslog" element={<SyslogPage />} />
        <Route path="/ping" element={<BatchPingPage />} />
        <Route path="/dns" element={<DnsQueryPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={
          <div className="flex flex-col items-center justify-center h-64 text-[hsl(var(--text-tertiary))]">
            <p className="text-lg font-medium">404 — 页面不存在</p>
            <a href="/" className="mt-2 text-sm text-[hsl(var(--accent))] hover:underline">返回首页</a>
          </div>
        } />
      </Route>
    </Routes>
  );
}
