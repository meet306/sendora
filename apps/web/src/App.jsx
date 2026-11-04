import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { HistoryProvider } from './context/HistoryContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { SendPage } from './pages/SendPage';
import { TransferSuccessPage } from './pages/TransferSuccessPage';
import { ReceivePage } from './pages/ReceivePage';
import { TransferDetailsPage } from './pages/TransferDetailsPage';
import { FilePreviewPage } from './pages/FilePreviewPage';
import { RequestFilesPage } from './pages/RequestFilesPage';
import { RequestUploadPage } from './pages/RequestUploadPage';
import { RequestManagePage } from './pages/RequestManagePage';
import { HistoryPage } from './pages/HistoryPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <ThemeProvider>
      <HistoryProvider>
        <BrowserRouter>
          <div className="flex flex-col min-h-screen bg-sendora-50 dark:bg-sendora-950 text-sendora-900 dark:text-sendora-100 transition-colors">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* 1. Landing Page */}
                <Route path="/" element={<LandingPage />} />

                {/* 2. Send Files Studio */}
                <Route path="/send" element={<SendPage />} />

                {/* 3. Transfer Success */}
                <Route path="/transfer/:id/success" element={<TransferSuccessPage />} />

                {/* 4. Receive Lookup */}
                <Route path="/receive" element={<ReceivePage />} />

                {/* 5. Transfer Details & File Receiver */}
                <Route path="/t/:id" element={<TransferDetailsPage />} />

                {/* 6. Standalone File Preview */}
                <Route path="/t/:id/preview/:fileId" element={<FilePreviewPage />} />

                {/* 7. Request Files Creation */}
                <Route path="/request" element={<RequestFilesPage />} />

                {/* 8. Public Request Dropbox Upload */}
                <Route path="/r/:id" element={<RequestUploadPage />} />

                {/* 9. Requester Management Dashboard */}
                <Route path="/request/:id/manage" element={<RequestManagePage />} />

                {/* 10. Transfer History */}
                <Route path="/history" element={<HistoryPage />} />

                {/* 11. Admin Authentication */}
                <Route path="/admin/login" element={<AdminLoginPage />} />

                {/* 12. Admin Operations Dashboard */}
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

                {/* 13. Privacy Policy */}
                <Route path="/privacy" element={<PrivacyPolicyPage />} />

                {/* 14. Terms of Service */}
                <Route path="/terms" element={<TermsOfServicePage />} />

                {/* 15. Contextual 404 Recovery */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </HistoryProvider>
    </ThemeProvider>
  );
}

export default App;
