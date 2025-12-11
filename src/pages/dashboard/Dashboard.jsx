import { useState } from 'react';
import BgMainImage from '../../assets/images/BgMain.jpg';
import MainSection from '../../components/layout/dashboard/MainSection';
import Header from '../../components/layout/header/Header';
import { AlertCircle, X } from 'lucide-react';


const Dashboard = () => {
  return (
    <div className="relative h-screen w-screen overflow-hidden font-bold text-white">
      
      {/* Background */}
      <img
        src={BgMainImage}
        alt="background"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <MainSection />
      <div className='absolute bottom-3 w-[70%] flex right-0'>
        <div className="relative z-10 px-6 mt-6 w-full">
          <div className="bg-yellow-500/90 backdrop-blur-sm rounded-lg p-4 shadow-lg flex items-start gap-4">
            <AlertCircle className="w-10 h-8 mt-3" />
            <div className="flex-1">
              <h3 className="text-[32px] font-bold ">Important Notice</h3>
              <div className="text-[30px] font-normal text-white/90 leading-10">
                Scheduled maintenance will occur on December 15, 2025 from 2:00 AM to 4:00 AM UTC. 
                Some services may be temporarily unavailable during this time. 
              </div>
            </div>
            <button
              className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
              aria-label="Close notice"
            >
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
