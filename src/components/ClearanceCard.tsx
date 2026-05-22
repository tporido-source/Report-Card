import { useState, useEffect } from 'react';
import { Student } from '../types.ts';
import SchoolLogo from './SchoolLogo.tsx';
import QRCode from 'qrcode';
import { User, GraduationCap, Smile, Utensils, BookOpen } from 'lucide-react';

interface ClearanceCardProps {
  student: Student;
  side?: 'front' | 'back' | 'payment' | 'both';
  interactive?: boolean;
  logoBase64?: string | null;
}

export default function ClearanceCard({
  student,
  side = 'both',
  interactive = false,
  logoBase64,
}: ClearanceCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    const codeData = student.adminNo || student.id;
    QRCode.toDataURL(codeData, { margin: 1, width: 150 })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error("Could not generate client QR Code:", err));
  }, [student.adminNo, student.id]);

  // Calendar days helper for 2026
  // June 2026 (Starts Monday, 30 days)
  // July 2026 (Starts Wednesday, 31 days)
  // August 2026 (Starts Saturday, 31 days)
  const renderCalendar = (monthName: string, startDayOfWeek: number, totalDays: number, isSmall = false) => {
    const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const cells: (number | null)[] = [];

    // Fill in empty slots for padding
    const padding = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    for (let i = 0; i < padding; i++) {
      cells.push(null);
    }

    // Fill days
    for (let d = 1; d <= totalDays; d++) {
      cells.push(d);
    }

    const cellClass = isSmall
      ? 'w-full h-[16px] md:h-[26px] text-[7px] md:text-[10.5px] rounded-[1px] md:rounded-[3.5px]'
      : 'w-full h-[21px] md:h-[28px] text-[9px] md:text-[12px] rounded-[3px]';

    const textClass = isSmall
      ? 'text-[6.5px] md:text-[10px]'
      : 'text-[9px] md:text-[11px]';

    const checkSize = isSmall
      ? 'w-1.5 md:w-3.8 h-1.5 md:h-3.8'
      : 'w-3.2 md:w-5 h-3.2 md:h-5';

    return (
      <div className={`flex flex-col bg-slate-50 border border-slate-200/80 rounded-md shadow-2xs flex-1 min-w-0 ${isSmall ? 'p-1 md:p-2' : 'p-1.5 md:p-2.5'}`}>
        <div className={`text-center font-sans uppercase tracking-wider font-extrabold text-indigo-950 border-b border-slate-200/60 pb-1 mb-1.5 bg-indigo-50/40 rounded-t-[2px] ${isSmall ? 'text-[8px] md:text-[11px]' : 'text-[10.5px] md:text-[12px]'}`}>
          {monthName} 2026
        </div>
        <div className={`grid grid-cols-7 gap-0.5 text-center font-bold text-slate-400 mb-1 ${isSmall ? 'text-[6px] md:text-[8px]' : 'text-[8px] md:text-[9.5px]'}`}>
          {daysOfWeek.map((day, idx) => (
            <div key={idx} className="w-full h-3.5 md:h-4.5 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5 justify-items-center w-full">
          {cells.map((day, idx) => {
            const isWeekend = day
              ? ((startDayOfWeek - 1 + day - 1) % 7 === 5 || (startDayOfWeek - 1 + day - 1) % 7 === 6)
              : false;

            return (
              <div
                key={idx}
                className={`flex flex-col justify-between items-center border transition-colors duration-150 relative ${cellClass} ${
                  day
                    ? isWeekend
                      ? 'bg-amber-50/85 border-amber-100/80 text-amber-900 font-bold hover:bg-amber-100/90'
                      : 'bg-white border-slate-100 text-slate-800 font-bold hover:bg-slate-100'
                    : 'bg-transparent border-transparent'
                }`}
              >
                {day ? (
                  <>
                    <span className={`font-mono leading-none pt-0.5 ${textClass}`}>{day}</span>
                    {/* Meal Tracking Checkbox */}
                    <div className="pb-0.5 md:pb-1">
                      <span className={`${checkSize} rounded-[1px] md:rounded-[2px] border border-slate-250 bg-slate-50/30 block`} />
                    </div>
                  </>
                ) : (
                  ''
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Card Theme classes based on overall clearance status
  const getThemeClasses = () => {
    if (student.isCleared) {
      return {
        cardBorder: 'border-emerald-600 shadow-emerald-50/20',
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-250/20',
        stripe: 'bg-gradient-to-r from-emerald-900 to-emerald-600',
        accentText: 'text-emerald-700',
      };
    } else {
      return {
        cardBorder: 'border-[#1E1B4B] shadow-indigo-50/20', // Elite Dark Navy/Indigo border
        badge: 'bg-indigo-50 text-indigo-800 border-indigo-250/25',
        stripe: 'bg-gradient-to-r from-[#0C0B25] to-[#25206E]', // Dark blue -> Purple navy premium gradient
        accentText: 'text-[#1E1B4B]',
      };
    }
  };

  const theme = getThemeClasses();
  const serialNo = `SPSSN-2026-${(student.adminNo || student.id || "0000").replace(/[^0-9]/g, "").slice(0, 5).padStart(5, "0")}`;

  const renderFrontCard = () => (
    <div
      id={`card-front-${student.id}`}
      className={`relative w-[340px] h-[215px] print:w-full print:h-[55mm] bg-white rounded-xl shadow-lg border-[3.5px] flex flex-col justify-between overflow-hidden shrink-0 select-none ${theme.cardBorder}`}
    >
      {/* Watermark Logo behind content - 3.5% Opacity */}
      <div className="absolute inset-x-0 top-11 bottom-7 flex items-center justify-center pointer-events-none select-none opacity-[0.035] overflow-hidden z-[0]">
        <SchoolLogo className="w-44 h-44 scale-[1.3] rotate-12" logoBase64={logoBase64} />
      </div>

      {/* Secure Guilloche/Diagonal Geometric Line Background Patterns - Faint 3.5% Opacity */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-[0.035] z-[0] overflow-hidden">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="text-slate-500">
          <defs>
            <pattern id="diagonal-waves-front" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
              <path d="M 0 5 H 30 M 0 15 H 30 M 0 25 H 30" fill="none" stroke="currentColor" strokeWidth="0.38" />
              <path d="M 5 0 V 30 M 15 0 V 30 M 25 0 V 30" fill="none" stroke="currentColor" strokeWidth="0.1" strokeDasharray="1,1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diagonal-waves-front)" />
          {/* Security Shield concentric circles */}
          <circle cx="50%" cy="50%" r="55" fill="none" stroke="currentColor" strokeWidth="0.45" />
          <circle cx="50%" cy="50%" r="75" fill="none" stroke="currentColor" strokeWidth="0.25" strokeDasharray="3,2" />
          <circle cx="50%" cy="50%" r="95" fill="none" stroke="currentColor" strokeWidth="0.15" />
        </svg>
      </div>

      {/* Top Header stripe */}
      <div className={`px-2.5 py-1.5 text-white flex justify-between items-center relative z-10 ${theme.stripe}`}>
        <div className="flex items-center gap-1.5 max-w-[250px] min-w-0">
          <SchoolLogo className="w-7 h-7 object-contain inline-block shrink-0" logoBase64={logoBase64} />
          <div className="flex flex-col min-w-0">
            <span className="text-[8.5px] font-black tracking-wide uppercase leading-tight font-sans truncate">ST. PAUL SECONDARY SCHOOL, NASUTI</span>
            <span className="text-[5.5px] opacity-95 tracking-widest leading-none text-slate-100 uppercase truncate mt-0.5">P.O.BOX 678, NASUTI IGANGA • "God is My Guide"</span>
          </div>
        </div>
        <div className="bg-white/15 px-1.5 py-0.5 rounded text-[6.5px] font-mono font-bold uppercase shrink-0 select-none tracking-widest">
          TERM 2, 2026
        </div>
      </div>

      {/* Main Card Content */}
      <div className="flex-1 p-2.5 flex gap-3 relative justify-between bg-white text-slate-800 z-10">
        {/* Left Column: Passport photo AND QR Code (Strict Left Arrangement) */}
        <div className="flex flex-col items-center justify-between w-[94px] h-full shrink-0 border-r border-slate-150 pr-2.5">
          {/* Photo Section: Modern Rounded Container */}
          <div className="bg-slate-50/80 border border-slate-150 rounded-lg p-1 shadow-2xs flex items-center justify-center shrink-0 w-full">
            <div className="w-full h-[74px] bg-white rounded-md border border-slate-200/50 flex items-center justify-center overflow-hidden shrink-0">
              {student.photo ? (
                <img
                  src={student.photo}
                  alt={student.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-1">
                  <svg className="w-7 h-7 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[5px] text-slate-400 font-extrabold tracking-widest uppercase mt-0.5">NO PHOTO</span>
                </div>
              )}
            </div>
          </div>

          {/* QR Section: Modern Rounded Container */}
          <div className="bg-slate-50/80 border border-slate-150 rounded-lg p-1.5 flex flex-col items-center gap-1 shrink-0 w-full mt-1.5">
            <div className="w-[30px] h-[30px] flex items-center justify-center shrink-0 border border-slate-200/80 bg-white p-0.5 rounded shadow-3xs">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="Student QR Code" 
                  className="w-full h-full object-contain" 
                />
              ) : (
                <div className="animate-pulse bg-slate-100 w-full h-full rounded" />
              )}
            </div>
            <span className="text-[4.8px] font-sans font-black text-slate-400/90 tracking-wider uppercase leading-none select-none text-center">
              SCAN TO VERIFY
            </span>
          </div>
        </div>

        {/* Right Column: High typography-hierarchy details */}
        <div className="flex-1 flex flex-col justify-between pl-0.5 h-full min-w-0">
          {/* Badge Heading: STUDENT CLEARANCE CARD */}
          <div className="flex items-center justify-between gap-1 select-none">
            <span className="text-[8px] font-black uppercase bg-[#1E1B4B]/5 text-[#1E1B4B] px-1.5 py-0.5 rounded border border-[#1E1B4B]/10 tracking-widest font-sans">
              STUDENT CLEARANCE CARD
            </span>
            <span className="text-[7px] font-mono font-bold bg-slate-100 px-1 py-0.2 rounded text-slate-500 shrink-0">
              {student.adminNo}
            </span>
          </div>

          {/* Student Info Container: Modern Rounded Container */}
          <div className="bg-slate-50/80 border border-slate-150 rounded-lg p-3 space-y-3 mt-2 flex-1 flex flex-col justify-center min-w-0">
            {/* NAME Underline */}
            <div className="text-[10.5px] text-slate-700 flex items-center min-w-0">
              <span className="font-mono font-black text-slate-400 uppercase tracking-widest text-[7px] w-[56px] md:w-[62px] shrink-0 flex items-center gap-1 select-none">
                <User className="w-[9.5px] h-[9.5px] text-slate-400/90 shrink-0 stroke-[2.5]" />
                NAME:
              </span>
              <span className="font-sans font-black uppercase text-indigo-950 border-b border-dashed border-slate-200/80 pb-0.5 pl-2.5 flex-1 truncate select-all leading-tight tracking-wide">
                {student.name}
              </span>
            </div>

            {/* CLASS & GENDER Underline */}
            <div className="text-[10.5px] text-slate-700 flex items-center gap-3 min-w-0">
              <div className="flex items-center flex-1 min-w-0">
                <span className="font-mono font-black text-slate-400 uppercase tracking-widest text-[7px] w-[56px] md:w-[62px] shrink-0 flex items-center gap-1 select-none">
                  <GraduationCap className="w-[10px] h-[10px] text-slate-400/90 shrink-0 stroke-[2.5]" />
                  CLASS:
                </span>
                <span className="font-sans font-extrabold uppercase text-slate-900 border-b border-dashed border-slate-200/80 pb-0 pt-0.5 pl-2.5 flex-1 truncate select-all leading-tight tracking-wide">
                  {student.gradeClass}
                </span>
              </div>
              <div className="flex items-center w-[110px] md:w-[120px] shrink-0">
                <span className="font-mono font-black text-slate-400 uppercase tracking-widest text-[7px] w-[62px] md:w-[68px] shrink-0 flex items-center gap-1 select-none">
                  <Smile className="w-[9.5px] h-[9.5px] text-slate-400/90 shrink-0 stroke-[2.5]" />
                  GENDER:
                </span>
                <span className="font-sans font-extrabold uppercase text-slate-900 border-b border-dashed border-slate-200/80 pb-0 pt-0.5 pl-2.5 flex-1 truncate select-all leading-tight tracking-wide">
                  {student.gender || 'Male'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer bar containing return instructions */}
      <div className="bg-slate-50 px-3 py-1.2 border-t border-slate-150 flex justify-center items-center text-[8px] font-medium text-slate-500 relative z-10 select-none italic">
        If found, please return to the above address.
      </div>
    </div>
  );

  const renderBackCard = () => (
    <div
      id={`card-back-${student.id}`}
      className="relative w-[340px] h-[215px] print:w-full print:h-[55mm] bg-white rounded-xl shadow-lg border-[3.5px] border-[#1E1B4B] flex flex-col justify-between overflow-hidden shrink-0 select-none text-slate-800"
    >
      {/* Faint Watermark Logo behind content - 3.5% Opacity */}
      <div className="absolute inset-x-0 top-11 bottom-7 flex items-center justify-center pointer-events-none select-none opacity-[0.035] overflow-hidden z-[0]">
        <SchoolLogo className="w-44 h-44 scale-[1.3] rotate-12" logoBase64={logoBase64} />
      </div>

      {/* Secure Guilloche/Diagonal Geometric Line Background Patterns - Faint 3.5% Opacity */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-[0.035] z-[0] overflow-hidden">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="text-slate-500">
          <defs>
            <pattern id="diagonal-waves-back" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
              <path d="M 0 5 H 30 M 0 15 H 30 M 0 25 H 30" fill="none" stroke="currentColor" strokeWidth="0.38" />
              <path d="M 5 0 V 30 M 15 0 V 30 M 25 0 V 30" fill="none" stroke="currentColor" strokeWidth="0.1" strokeDasharray="1,1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diagonal-waves-back)" />
          {/* Security Shield concentric circles */}
          <circle cx="50%" cy="50%" r="55" fill="none" stroke="currentColor" strokeWidth="0.45" />
          <circle cx="50%" cy="50%" r="75" fill="none" stroke="currentColor" strokeWidth="0.25" strokeDasharray="3,2" />
          <circle cx="50%" cy="50%" r="95" fill="none" stroke="currentColor" strokeWidth="0.15" />
        </svg>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-[#0C0B25] to-[#25206E] px-2.5 py-1.5 flex justify-between items-center text-white shrink-0 relative z-10">
        <div className="flex items-center gap-1.5 max-w-[245px] min-w-0">
          <SchoolLogo className="w-7 h-7 object-contain inline-block shrink-0" logoBase64={logoBase64} />
          <div className="flex flex-col min-w-0">
            <span className="text-[8.5px] font-black tracking-wide uppercase leading-tight font-sans truncate">ST. PAUL SECONDARY SCHOOL, NASUTI</span>
            <span className="text-[5.5px] opacity-85 tracking-widest leading-none truncate mt-0.5 uppercase">P.O.BOX 678 • God is My Guide</span>
          </div>
        </div>
        <span className="text-[7px] font-sans bg-indigo-600 text-white px-1.5 py-0.5 rounded font-black uppercase shrink-0 tracking-widest text-center">
          MEALS
        </span>
      </div>

      {/* Upgraded Student Metadata Header to prevent double-printing misalignment */}
      <div className="bg-slate-100/90 border-b border-slate-200/60 px-3 py-1 flex justify-between items-center text-[7.5px] font-mono font-bold text-slate-600 relative z-10 shrink-0">
        <span className="truncate">NAME: <span className="text-slate-900 font-sans font-black uppercase">{student.name}</span></span>
        <span className="shrink-0">CLASS: <span className="text-indigo-950 font-sans font-black uppercase">{student.gradeClass}</span></span>
        <span className="shrink-0">ID: <span className="text-[#1E1B4B] font-black">{student.adminNo}</span></span>
      </div>

      {/* Triple Calendar Grids with high accessibility */}
      <div className="flex-1 px-1.5 py-1.5 flex gap-1.5 justify-center items-center bg-white relative z-10">
        {/* June 2026: Starts Monday, 30 days */}
        {renderCalendar('June', 1, 30)}

        {/* July 2026: Starts Wednesday, 31 days */}
        {renderCalendar('July', 3, 31)}
      </div>

      {/* Footer authorization details / Contact lines / Motto in italics */}
      <div className="bg-slate-50 px-2.5 py-1 border-t border-slate-150 flex flex-col gap-1 relative z-10 shrink-0 select-none">
        {/* Stamp inputs row */}
        <div className="flex justify-between items-center text-[7px] font-mono font-bold text-slate-400">
          <div className="text-[6.5px] text-slate-450 tracking-wider font-bold shrink-0 ml-auto">
            {serialNo}
          </div>
        </div>
        {/* School Contact and Motto footer */}
        <div className="flex justify-between items-center border-t border-slate-150/40 pt-0.5 text-[5.5px] font-mono text-slate-400 tracking-tight leading-none mt-0.5">
          <span className="italic font-bold text-slate-500">Motto: "God is My Guide"</span>
          <span>Contact: P.O.BOX 678, NASUTI, IGANGA • info@spssn.edu</span>
        </div>
      </div>
    </div>
  );

  const renderPaymentCard = () => (
    <div
      id={`card-payment-${student.id}`}
      className="relative w-[340px] h-[215px] print:w-full print:h-[55mm] bg-white rounded-xl shadow-lg border-[3.5px] border-[#1E1B4B] flex flex-col justify-between overflow-hidden shrink-0 select-none text-slate-800 transition-all duration-300"
    >
      {/* Watermark Logo - 3.5% Opacity */}
      <div className="absolute inset-x-0 top-11 bottom-7 flex items-center justify-center pointer-events-none select-none opacity-[0.035] overflow-hidden z-[0]">
        <SchoolLogo className="w-44 h-44 scale-[1.3] rotate-12" logoBase64={logoBase64} />
      </div>

      {/* Secure Guilloche Patterns - Faint */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-[0.035] z-[0] overflow-hidden">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="text-slate-500">
          <defs>
            <pattern id="diagonal-waves-payment-preview" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
              <path d="M 0 5 H 30 M 0 15 H 30 M 0 25 H 30" fill="none" stroke="currentColor" strokeWidth="0.38" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diagonal-waves-payment-preview)" />
        </svg>
      </div>

      {/* Top Bar with School Name */}
      <div className="bg-gradient-to-r from-[#0C0B25] to-[#25206E] px-2.5 py-1 flex justify-between items-center text-white shrink-0 relative z-10">
        <div className="flex items-center gap-1.5 max-w-[215px] min-w-0">
          <SchoolLogo className="w-5 h-5 object-contain inline-block shrink-0" logoBase64={logoBase64} />
          <div className="flex flex-col min-w-0">
            <span className="text-[7.8px] font-black tracking-wide uppercase leading-tight font-sans truncate">ST. PAUL SECONDARY SCHOOL, NASUTI</span>
          </div>
        </div>
        <span className="text-[6px] font-sans bg-indigo-600 text-white px-1.5 py-0.5 rounded font-black uppercase shrink-0 tracking-widest text-center">
          PAYMENT MODE
        </span>
      </div>

      {/* Student Details Row */}
      <div className="bg-slate-100/90 border-b border-slate-200/60 px-2.5 py-1.2 flex justify-between items-center text-[7px] font-mono font-bold text-slate-600 relative z-10 shrink-0">
        <span className="truncate">NAME: <span className="text-slate-900 font-sans font-black uppercase text-[6.8px]">{student.name}</span></span>
        <span className="shrink-0">CLASS: <span className="text-indigo-950 font-sans font-black uppercase text-[6.8px]">{student.gradeClass}</span></span>
        <span className="shrink-0">ID: <span className="text-[#1E1B4B] font-black">{student.adminNo}</span></span>
      </div>

      {/* Main Area: Table representing the installments - stretched to full width as requested */}
      <div className="flex-1 px-2.5 py-2.5 relative z-10 flex flex-col justify-center min-h-0 overflow-hidden bg-white/40">
        <table className="w-full border-collapse border border-slate-350 text-[7px] text-slate-800 bg-white/95 shadow-3xs">
          <thead>
            <tr className="bg-slate-100 font-bold uppercase text-center text-slate-700 tracking-wider text-[7px]">
              <th className="border border-slate-350 py-1.5 px-2 w-[30%] font-black text-left truncate">Installment</th>
              <th className="border border-slate-350 py-1.5 px-1.5 w-[24%] font-black text-center truncate">Amount (UGX)</th>
              <th className="border border-slate-350 py-1.5 px-1.5 w-[22%] font-black text-center truncate">Balance (UGX)</th>
              <th className="border border-slate-350 py-1.5 px-2 w-[24%] font-black text-left truncate">Bursar's Sign</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="border border-slate-300 py-2.2 px-2 font-bold font-sans text-[7.8px] text-slate-950 truncate">1st Installment</td>
              <td className="border border-slate-300 py-2.2 px-1.5"></td>
              <td className="border border-slate-300 py-2.2 px-1.5"></td>
              <td className="border border-slate-300 py-2.2 px-2"></td>
            </tr>
            <tr className="bg-slate-50/50">
              <td className="border border-slate-300 py-2.2 px-2 font-bold font-sans text-[7.8px] text-slate-950 truncate">2nd Installment</td>
              <td className="border border-slate-300 py-2.2 px-1.5"></td>
              <td className="border border-slate-300 py-2.2 px-1.5"></td>
              <td className="border border-slate-300 py-2.2 px-2"></td>
            </tr>
            <tr className="bg-white">
              <td className="border border-slate-300 py-2.2 px-2 font-bold font-sans text-[7.8px] text-slate-950 truncate">3rd Installment</td>
              <td className="border border-slate-300 py-2.2 px-1.5"></td>
              <td className="border border-slate-300 py-2.2 px-1.5"></td>
              <td className="border border-slate-300 py-2.2 px-2"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Date and Signature placeholder line inside footer box */}
      <div className="px-2.5 py-1.2 flex justify-between items-center text-[7px] font-mono font-bold text-slate-400 relative z-10 shrink-0 select-none border-t border-slate-150/40">
        <span>DATE: <span className="text-slate-200">_________________</span></span>
        <span>BURSAR SIGN: <span className="text-slate-200">_________________</span></span>
      </div>

      {/* Footer bar */}
      <div className="bg-slate-50 px-2.5 py-1.2 border-t border-slate-150 flex justify-between items-center text-[5.8px] font-mono text-slate-400 relative z-10 shrink-0 select-none">
        <span className="italic font-bold text-slate-500">Motto: "God is My Guide"</span>
        <span className="font-bold text-slate-400 font-mono tracking-wider">{serialNo}</span>
        <span>Contact: info@spssn.edu</span>
      </div>
    </div>
  );

  const renderAugustCard = () => (
    <div
      id={`card-august-${student.id}`}
      className="relative w-[340px] h-[215px] print:w-full print:h-[55mm] bg-white rounded-xl shadow-lg border-[3.5px] border-[#1E1B4B] flex flex-col justify-between overflow-hidden shrink-0 select-none text-slate-800 transition-all duration-300"
    >
      {/* Watermark Logo - 3.5% Opacity */}
      <div className="absolute inset-x-0 top-11 bottom-7 flex items-center justify-center pointer-events-none select-none opacity-[0.035] overflow-hidden z-[0]">
        <SchoolLogo className="w-44 h-44 scale-[1.3] rotate-12" logoBase64={logoBase64} />
      </div>

      {/* Secure Guilloche Patterns */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-[0.035] z-[0] overflow-hidden">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="text-slate-500">
          <defs>
            <pattern id="diagonal-waves-august-preview" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
              <path d="M 0 5 H 30 M 0 15 H 30 M 0 25 H 30" fill="none" stroke="currentColor" strokeWidth="0.38" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diagonal-waves-august-preview)" />
        </svg>
      </div>

      {/* Top Bar with School Name */}
      <div className="bg-gradient-to-r from-[#0C0B25] to-[#25206E] px-2.5 py-1 flex justify-between items-center text-white shrink-0 relative z-10">
        <div className="flex items-center gap-1.5 max-w-[215px] min-w-0">
          <SchoolLogo className="w-5 h-5 object-contain inline-block shrink-0" logoBase64={logoBase64} />
          <div className="flex flex-col min-w-0">
            <span className="text-[7.8px] font-black tracking-wide uppercase leading-tight font-sans truncate">ST. PAUL SECONDARY SCHOOL, NASUTI</span>
          </div>
        </div>
        <span className="text-[6px] font-sans bg-indigo-600 text-white px-1.5 py-0.5 rounded font-black uppercase shrink-0 tracking-widest text-center">
          MEALS
        </span>
      </div>

      {/* Student Details Row */}
      <div className="bg-slate-100/90 border-b border-slate-200/60 px-2.5 py-1.2 flex justify-between items-center text-[7px] font-mono font-bold text-slate-600 relative z-10 shrink-0">
        <span className="truncate">NAME: <span className="text-slate-900 font-sans font-black uppercase text-[6.8px]">{student.name}</span></span>
        <span className="shrink-0">CLASS: <span className="text-indigo-950 font-sans font-black uppercase text-[6.8px]">{student.gradeClass}</span></span>
        <span className="shrink-0">ID: <span className="text-[#1E1B4B] font-black">{student.adminNo}</span></span>
      </div>

      {/* Main Area: Side-By-Side Calendar and Cafeteria Guide as requested */}
      <div className="flex-1 px-2.5 py-1.5 relative z-10 flex gap-3 items-center justify-between min-h-0 overflow-hidden bg-white/40">
        {/* Left Half: August Calendar (Saturday started, 31 days) */}
        <div className="w-[110px] shrink-0">
          {renderCalendar('August', 6, 31, true)}
        </div>

        {/* Right Half: Upgraded Cafeteria Guide and Terms Container */}
        <div className="flex-1 h-full flex flex-col justify-between bg-slate-50/90 border border-slate-150 rounded-lg p-2 min-w-0">
          <div>
            <div className="flex items-center gap-1 text-[7px] font-black text-[#1E1B4B] uppercase tracking-wider border-b border-slate-200/60 pb-1 mb-1 select-none">
              <Utensils className="w-3 h-3 text-indigo-600 shrink-0 stroke-[2.5]" />
              CAFETERIA GUIDE
            </div>
            <ul className="space-y-1 text-[5.8px] text-slate-600 font-medium">
              <li className="flex gap-1 items-start">
                <span className="text-indigo-600 shrink-0 font-bold">•</span>
                <span>Present card at each serving point on request.</span>
              </li>
              <li className="flex gap-1 items-start">
                <span className="text-indigo-600 shrink-0 font-bold">•</span>
                <span>Card is strictly non-transferable to other peers.</span>
              </li>
              <li className="flex gap-1 items-start">
                <span className="text-indigo-600 shrink-0 font-bold">•</span>
                <span>Report identity card loss instantly to Warden.</span>
              </li>
            </ul>
          </div>

          {/* Verification stamp space */}
          <div className="border border-dashed border-slate-300 rounded p-1 text-center bg-white">
            <span className="text-[5px] text-slate-400 font-mono font-bold block leading-none uppercase mb-0.5">CAFETERIA RECTOR STAMP</span>
            <span className="text-[4.5px] text-slate-300 font-mono block leading-none tracking-widest mt-0.5">AUTHENTIC TOKEN</span>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="bg-slate-50 px-2.5 py-1.2 border-t border-slate-150 flex justify-between items-center text-[5.8px] font-mono text-slate-400 relative z-10 shrink-0 select-none">
        <span className="italic font-bold text-slate-500">Motto: "God is My Guide"</span>
        <span className="font-bold text-slate-400 font-mono tracking-wider">{serialNo}</span>
        <span>Contact: info@spssn.edu</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 items-center w-full" id={`clearance-card-stack-${student.id}`}>
      {side === 'both' ? (
        <div className="flex flex-col gap-6 items-center w-full">
          {/* Front Side Section */}
          <div className="w-full flex flex-col items-center gap-1.5">
            <span className="text-[9.5px] font-mono font-bold uppercase tracking-widest text-[#1E1B4B]/75 flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse shrink-0" />
              FRONT SIDE: IDENTIFICATION & ATTENDANCE (JUNE & JULY)
            </span>
            <div className="flex flex-col xl:flex-row gap-4 xl:gap-5 items-center justify-center w-full mt-1">
              {renderFrontCard()}
              {renderBackCard()}
            </div>
          </div>

          {/* Back Side Section */}
          <div className="w-full flex flex-col items-center gap-1.5">
            <span className="text-[9.5px] font-mono font-bold uppercase tracking-widest text-[#1E1B4B]/75 flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
              BACK SIDE: FINANCIAL LEDGER & ATTENDANCE (AUGUST)
            </span>
            <div className="flex flex-col xl:flex-row gap-4 xl:gap-5 items-center justify-center w-full mt-1">
              {renderPaymentCard()}
              {renderAugustCard()}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row gap-4 xl:gap-5 items-center justify-center w-full">
          {side === 'front' && renderFrontCard()}
          {side === 'back' && renderBackCard()}
          {side === 'payment' && (
            <div className="flex flex-col xl:flex-row gap-4 xl:gap-5 items-center justify-center w-full">
              {renderPaymentCard()}
              {renderAugustCard()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
