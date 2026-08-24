import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StaticPage from "@/components/StaticPage";

import Home from "@/pages/Home";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import ApplyJob from "@/pages/ApplyJob";
import Companies from "@/pages/Companies";
import CompanyDetail from "@/pages/CompanyDetail";
import ForCompanies from "@/pages/ForCompanies";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import RegisterCompany from "@/pages/auth/RegisterCompany";

import CandidateDashboard from "@/pages/candidate/CandidateDashboard";
import MyApplications from "@/pages/candidate/MyApplications";
import CandidateProfile from "@/pages/candidate/CandidateProfile";
import CandidateCV from "@/pages/candidate/CandidateCV";

import CompanyDashboard from "@/pages/company/CompanyDashboard";
import CompanyProfile from "@/pages/company/CompanyProfile";
import CompanyJobs from "@/pages/company/CompanyJobs";
import JobForm from "@/pages/company/JobForm";
import Applicants from "@/pages/company/Applicants";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminJobs from "@/pages/admin/AdminJobs";
import AdminCompanies from "@/pages/admin/AdminCompanies";
import AdminCandidates from "@/pages/admin/AdminCandidates";
import AdminApplications from "@/pages/admin/AdminApplications";
import AdminCategories from "@/pages/admin/AdminCategories";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

const protect = (role, el) => <ProtectedRoute role={role}>{el}</ProtectedRoute>;

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Toaster position="top-center" richColors />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:slug" element={<JobDetail />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:slug" element={<CompanyDetail />} />
              <Route path="/untuk-perusahaan" element={<ForCompanies />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register-company" element={<RegisterCompany />} />
              <Route path="/tentang-kami" element={<StaticPage page="tentang-kami" />} />
              <Route path="/kebijakan-privasi" element={<StaticPage page="kebijakan-privasi" />} />
              <Route path="/syarat-ketentuan" element={<StaticPage page="syarat-ketentuan" />} />
              <Route path="/hubungi-kami" element={<StaticPage page="hubungi-kami" />} />
              <Route path="/jobs/:slug/apply" element={protect("candidate", <ApplyJob />)} />
            </Route>

            <Route path="/candidate/dashboard" element={protect("candidate", <CandidateDashboard />)} />
            <Route path="/candidate/applications" element={protect("candidate", <MyApplications />)} />
            <Route path="/candidate/profile" element={protect("candidate", <CandidateProfile />)} />
            <Route path="/candidate/cv" element={protect("candidate", <CandidateCV />)} />

            <Route path="/company/dashboard" element={protect("company", <CompanyDashboard />)} />
            <Route path="/company/profile" element={protect("company", <CompanyProfile />)} />
            <Route path="/company/jobs" element={protect("company", <CompanyJobs />)} />
            <Route path="/company/jobs/new" element={protect("company", <JobForm />)} />
            <Route path="/company/jobs/:id/edit" element={protect("company", <JobForm />)} />
            <Route path="/company/applicants" element={protect("company", <Applicants />)} />

            <Route path="/admin" element={protect("admin", <AdminDashboard />)} />
            <Route path="/admin/jobs" element={protect("admin", <AdminJobs />)} />
            <Route path="/admin/companies" element={protect("admin", <AdminCompanies />)} />
            <Route path="/admin/candidates" element={protect("admin", <AdminCandidates />)} />
            <Route path="/admin/applications" element={protect("admin", <AdminApplications />)} />
            <Route path="/admin/categories" element={protect("admin", <AdminCategories />)} />

            <Route path="*" element={<PublicLayout404 />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

function PublicLayout404() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center" data-testid="not-found-page">
          <p className="font-display text-6xl font-extrabold text-slate-300">404</p>
          <h1 className="font-display text-xl font-bold text-slate-900 mt-2">Halaman tidak ditemukan</h1>
          <a href="/" className="inline-flex items-center h-11 px-6 mt-6 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors" data-testid="not-found-home-btn">
            Kembali ke Beranda
          </a>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default App;
