import React from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import Pricing from './components/Pricing';
import UploadImage from './components/UploadImage';
import UploadSelfie from './components/UploadSelfie';
import EventDashboard from './components/EventDashboard';
import EventDetail from './components/EventDetail';
import ViewEvent from './components/ViewEvent';
import { GoogleAuthConfig } from './config/GoogleAuthConfig';

const App = () => {
  return (
    <GoogleAuthConfig>
      <Router>
        <div className="min-h-screen bg-white">
          <Navbar mobileMenuOpen={false} setMobileMenuOpen={() => {}} />
          <Routes>
            <Route path="/" element={
              <div className="animate-slideIn">
                <Hero />
                <Features />
                <Testimonials />
                <Pricing />
                <FAQ />
              </div>
            } />
            <Route path="/events" element={<div className="animate-slideIn"><EventDashboard /></div>} />
            <Route path="/event/:eventId" element={<div className="animate-slideIn"><EventDetail eventId={useParams().eventId || ''} /></div>} />
            <Route path="/upload" element={<div className="animate-slideIn"><UploadImage /></div>} />
            <Route path="/upload-image" element={<div className="animate-slideIn"><UploadImage /></div>} />
            <Route path="/upload_selfie" element={<div className="animate-slideIn"><UploadSelfie /></div>} />
            <Route path="/upload_selfie/:eventId" element={<div className="animate-slideIn"><UploadSelfie /></div>} />
            <Route path="/view-event/:eventId" element={<div className="animate-slideIn"><ViewEvent eventId={useParams().eventId || ''} /></div>} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </GoogleAuthConfig>
  );
};

export default App;