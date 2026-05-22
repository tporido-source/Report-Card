/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Printer,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  UserPlus,
  FileText,
  RefreshCw,
  SlidersHorizontal,
  ArrowRightLeft,
  QrCode,
  Info,
  Calendar,
  ClipboardList,
  Check,
  Users,
  Utensils,
  LogOut,
  Upload,
  Award
} from 'lucide-react';
import { Student, ClearanceStatus, BoardingStatus } from './types.ts';
import { getStudents, saveStudents, SCHOOL_CLASSES } from './data.ts';
import ClearanceCard from './components/ClearanceCard.tsx';
import SchoolLogo, { DEFAULT_SCHOOL_LOGO } from './components/SchoolLogo.tsx';
import { generateClearancePdf } from './utils/pdfGenerator.ts';
import { removeLogoBackground } from './utils/imageProcessor.ts';

function normalizeGradeClass(input: string): string {
  const clean = input.trim().toLowerCase().replace(/\s+/g, ' ');
  
  // Try to match Senior numbers: e.g. "s1 a", "senior 1 a", "s.1 a", "s1a"
  const sMatch = clean.match(/^(?:s|senior|s\.)\s*([1-6])\s*(a|b|c|arts|science|sciences)?$/);
  if (sMatch) {
    const num = sMatch[1];
    let stream = sMatch[2] || '';
    
    if (stream.includes('arts')) {
      stream = 'Arts';
    } else if (stream.includes('science')) {
      stream = 'Sciences';
    } else {
      stream = stream.toUpperCase();
    }
    
    if (['1', '2', '3', '4'].includes(num)) {
      if (!stream || !['A', 'B', 'C'].includes(stream)) {
        stream = 'A';
      }
      return `S.${num} ${stream}`;
    } else if (['5', '6'].includes(num)) {
      if (!stream || !['Arts', 'Sciences'].includes(stream)) {
        stream = 'Sciences';
      }
      return `S.${num} ${stream}`;
    }
  }
  
  // Direct match lookup
  const matched = SCHOOL_CLASSES.find(sc => sc.toLowerCase() === clean);
  if (matched) return matched;
  
  return SCHOOL_CLASSES[0]; // fallback
}

export default function App() {
  // --- STATE DECLARATIONS ---
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(() => {
    return localStorage.getItem('clearance_printer_school_logo') || DEFAULT_SCHOOL_LOGO;
  });
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterClearance, setFilterClearance] = useState<string>('All'); // 'All' | 'Cleared' | 'Hold'
  const [filterBoarding, setFilterBoarding] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('name');

  // Multi-Student Importer
  const [showBulkImporter, setShowBulkImporter] = useState<boolean>(false);
  const [bulkInput, setBulkInput] = useState<string>('');
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);

  // Single Student Editor Drawer/Modal
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formInputs, setFormInputs] = useState<Omit<Student, 'id'>>({
    adminNo: '',
    name: '',
    gender: 'Male',
    gradeClass: SCHOOL_CLASSES[0],
    boardingStatus: 'Boarder',
    isCleared: true,
    remarks: '',
    photo: undefined
  });

  // Selector Count widget (Bursar requested count queuing)
  const [queueCountInput, setQueueCountInput] = useState<number>(5);
  const [queueSuccessMessage, setQueueSuccessMessage] = useState<string | null>(null);

  // Active Card Preview Panel state
  const [previewStudentId, setPreviewStudentId] = useState<string>('');
  const [previewCardSide, setPreviewCardSide] = useState<'front' | 'back' | 'payment' | 'both'>('both');

  // Scanner Simulator Screen Modal (Mobile pass)
  const [scanModeStudent, setScanModeStudent] = useState<Student | null>(null);

  // PDF Generation spinner tracking
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [pdfLayoutMode, setPdfLayoutMode] = useState<'front-back-paired' | 'printable-grid'>('front-back-paired');

  // --- PERSISTENCE LOADER & LOGO COMPATIBILITY CLEANER ---
  useEffect(() => {
    const data = getStudents();
    setStudents(data);
    if (data.length > 0) {
      setPreviewStudentId(data[0].id);
    }

    // Auto-clean already uploaded custom logo background on first load
    const storedLogo = localStorage.getItem('clearance_printer_school_logo');
    if (storedLogo && !localStorage.getItem('clearance_printer_school_logo_cleaned_v2')) {
      removeLogoBackground(storedLogo, 45).then((cleanedLogo) => {
        setSchoolLogo(cleanedLogo);
        localStorage.setItem('clearance_printer_school_logo', cleanedLogo);
        localStorage.setItem('clearance_printer_school_logo_cleaned_v2', 'true');
      }).catch((err) => {
        console.warn("Background auto-clean error:", err);
      });
    }
  }, []);

  const handleSaveAndSync = (updatedList: Student[]) => {
    setStudents(updatedList);
    saveStudents(updatedList);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.2 * 1024 * 1024) {
      alert("Strict size limit: please upload an image smaller than 1.2MB for local storage safety.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      
      // Instantly run high-precision background removal to discard white outer box
      removeLogoBackground(base64String, 45).then((cleanedLogo) => {
        setSchoolLogo(cleanedLogo);
        localStorage.setItem('clearance_printer_school_logo', cleanedLogo);
        localStorage.setItem('clearance_printer_school_logo_cleaned_v2', 'true');
      }).catch((err) => {
        console.warn("Failed background removal, using original:", err);
        setSchoolLogo(base64String);
        localStorage.setItem('clearance_printer_school_logo', base64String);
      });
    };
    reader.onerror = () => {
      alert("Trouble parsing image. Try another standard PNG/JPG image.");
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setSchoolLogo(DEFAULT_SCHOOL_LOGO);
    localStorage.removeItem('clearance_printer_school_logo');
    localStorage.removeItem('clearance_printer_school_logo_cleaned_v2');
  };

  // --- EXTRACT UNIQUE CLASSES FOR FILTER DROPDOWN ---
  const uniqueClassesList = useMemo(() => {
    return ['All', ...SCHOOL_CLASSES];
  }, []);

  // --- FILTERED AND SORTED STUDENTS ---
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        const matchesQuery =
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.adminNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.gradeClass.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesClass = filterClass === 'All' || s.gradeClass === filterClass;
        const matchesClearance =
          filterClearance === 'All' ||
          (filterClearance === 'Cleared' && s.isCleared) ||
          (filterClearance === 'Hold' && !s.isCleared);
        const matchesBoarding = filterBoarding === 'All' || s.boardingStatus === filterBoarding;

        return matchesQuery && matchesClass && matchesClearance && matchesBoarding;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'adminNo') return a.adminNo.localeCompare(b.adminNo);
        if (sortBy === 'gradeClass') return a.gradeClass.localeCompare(b.gradeClass);
        return 0;
      });
  }, [students, searchQuery, filterClass, filterClearance, filterBoarding, sortBy]);

  // Selected Student Object references
  const selectedStudentsData = useMemo(() => {
    return students.filter((s) => selectedIds.includes(s.id));
  }, [students, selectedIds]);

  const activePreviewStudent = useMemo(() => {
    return students.find((s) => s.id === previewStudentId) || students[0] || null;
  }, [students, previewStudentId]);

  // --- STATS COMPUTATION ---
  const stats = useMemo(() => {
    const total = students.length;
    if (total === 0) return { total: 0, clearedCount: 0, balanceCount: 0, selectCount: 0, clearedPct: 0 };
    const clearedCount = students.filter((s) => s.isCleared).length;
    const balanceCount = total - clearedCount;
    return {
      total,
      clearedCount,
      balanceCount,
      selectCount: selectedIds.length,
      clearedPct: Math.round((clearedCount / total) * 100),
    };
  }, [students, selectedIds]);

  // --- BURSAR'S ADVANCED QUEUE SELECTOR ---
  // Select first N matching students from active filtered lists
  const handleSelectFirstN = (n: number) => {
    const count = Math.min(n, filteredStudents.length);
    if (count === 0) {
      setQueueSuccessMessage("No matching students found to queue. Check filters.");
      setTimeout(() => setQueueSuccessMessage(null), 5000);
      return;
    }
    const firstNIds = filteredStudents.slice(0, count).map((s) => s.id);
    setSelectedIds(firstNIds);
    setQueueSuccessMessage(`Successfully queued ${count} student passes! Press the export buttons to start printing.`);
    setTimeout(() => setQueueSuccessMessage(null), 7000);
  };

  // --- BATCH STATUS MODIFIER ---
  const handleBulkUpdate = (cleared: boolean) => {
    if (selectedIds.length === 0) return;
    const dateToday = new Date().toISOString().split('T')[0];

    const updated = students.map((s) => {
      if (selectedIds.includes(s.id)) {
        return {
          ...s,
          isCleared: cleared,
          gateClearanceDate: cleared ? dateToday : undefined,
          mealsClearanceDate: cleared ? dateToday : undefined,
        };
      }
      return s;
    });

    handleSaveAndSync(updated);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterClass('All');
    setFilterClearance('All');
    setFilterBoarding('All');
  };

  // --- INDIVIDUAL ROW QUICK ACCENT TOGGLERS ---
  const toggleRowStatus = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    const updated = students.map((s) => {
      if (s.id === id) {
        const next = !s.isCleared;
        return {
          ...s,
          isCleared: next,
          gateClearanceDate: next ? today : undefined,
          mealsClearanceDate: next ? today : undefined,
        };
      }
      return s;
    });
    handleSaveAndSync(updated);
  };

  // --- INDIVIDUAL DELETE STUDENT ---
  const handleDeleteStudent = (id: string) => {
    const updated = students.filter((s) => s.id !== id);
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    handleSaveAndSync(updated);
    if (previewStudentId === id && updated.length > 0) {
      setPreviewStudentId(updated[0].id);
    }
  };

  // --- BATCH DELETE SELECTED ---
  const handleDeleteSelected = () => {
    const updated = students.filter((s) => !selectedIds.includes(s.id));
    setSelectedIds([]);
    handleSaveAndSync(updated);
  };

  // --- ADD / CHANGE SINGLE STUDENT RECOGNITION ---
  const handleOpenAddForm = () => {
    setEditingStudent(null);
    setFormInputs({
      adminNo: `ADM-2026-${(students.length + 1).toString().padStart(3, '0')}`,
      name: '',
      gender: 'Male',
      gradeClass: SCHOOL_CLASSES[0],
      boardingStatus: 'Boarder',
      isCleared: true,
      remarks: '',
      photo: undefined
    });
    setShowFormModal(true);
  };

  const handleOpenEditForm = (student: Student) => {
    setEditingStudent(student);
    setFormInputs({
      adminNo: student.adminNo,
      name: student.name,
      gender: student.gender || 'Male',
      gradeClass: student.gradeClass,
      boardingStatus: student.boardingStatus,
      isCleared: student.isCleared,
      remarks: student.remarks || '',
      photo: student.photo
    });
    setShowFormModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInputs.name.trim()) {
      alert('Student Name is required.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    let updatedList: Student[] = [];

    if (editingStudent) {
      // Edit mode
      updatedList = students.map((s) => {
        if (s.id === editingStudent.id) {
          return {
            ...s,
            ...formInputs,
            gateClearanceDate: formInputs.isCleared ? (s.gateClearanceDate || today) : undefined,
            mealsClearanceDate: formInputs.isCleared ? (s.mealsClearanceDate || today) : undefined,
          };
        }
        return s;
      });
    } else {
      // Add mode
      const newStudent: Student = {
        id: `stud-${Date.now()}`,
        ...formInputs,
        gateClearanceDate: formInputs.isCleared ? today : undefined,
        mealsClearanceDate: formInputs.isCleared ? today : undefined,
      };
      updatedList = [...students, newStudent];
    }

    handleSaveAndSync(updatedList);
    setShowFormModal(false);
    setEditingStudent(null);
  };

  // --- INTUITIVE COOPERATIVE BULK SPREADSHEET IMPORTER ---
  // Accepts tab-separated, CSV, or human-delimited lines (comma or pipe)
  const handleBulkImport = () => {
    setBulkImportError(null);
    if (!bulkInput.trim()) {
      setBulkImportError('Roster input field is empty.');
      return;
    }

    const rows = bulkInput.split('\n');
    const parsedStudents: Student[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Default indices based on typical column distribution
    let nameIdx = 0;
    let classIdx = 1;
    let adminIdx = 2;
    let boardingIdx = 3;
    let genderIdx = 4;
    
    let startRow = 0;

    if (rows.length > 0) {
      const firstLineParts = rows[0].split(/[,\t|]+/);
      const isHeader = firstLineParts.some((part) => {
        const lp = part.toLowerCase().trim();
        return (
          lp === 'name' ||
          lp === 'student' ||
          lp === 'full name' ||
          lp === 'class' ||
          lp === 'grade' ||
          lp === 'gender' ||
          lp === 'sex' ||
          lp === 'admin' ||
          lp === 'admin no' ||
          lp === 'id' ||
          lp === 'boarding' ||
          lp === 'boarding status'
        );
      });

      if (isHeader) {
        // Skip header line and map dynamic columns based on exact metadata headings
        startRow = 1;
        firstLineParts.forEach((part, idx) => {
          const lp = part.toLowerCase().trim();
          if (lp.includes('name') || lp === 'student') {
            nameIdx = idx;
          } else if (lp.includes('class') || lp.includes('grade') || lp.includes('form')) {
            classIdx = idx;
          } else if (lp.includes('admin') || lp.includes('id') || lp.includes('no') || lp.includes('number')) {
            adminIdx = idx;
          } else if (lp.includes('board') || lp.includes('hostel') || lp.includes('status')) {
            boardingIdx = idx;
          } else if (lp.includes('gender') || lp.includes('sex')) {
            genderIdx = idx;
          }
        });
      }
    }

    for (let i = startRow; i < rows.length; i++) {
      const line = rows[i].trim();
      if (!line) continue;

      // Split line using comma, tab, or pipe
      let parts = line.split(/[,\t|]+/);
      if (parts.length <= nameIdx || parts[nameIdx].trim() === '') {
        continue;
      }

      const name = parts[nameIdx].trim();
      const gradeClass = parts[classIdx] ? normalizeGradeClass(parts[classIdx]) : 'S.4 A';
      
      // Auto-generate admin no or read from parts
      const customNo = parts[adminIdx] && parts[adminIdx].trim().length > 3 
        ? parts[adminIdx].trim() 
        : `ADM-2026-${(students.length + parsedStudents.length + 1).toString().padStart(3, '0')}`;
      
      // Parse Boarder schema
      let boarding: BoardingStatus = 'Boarder';
      if (parts[boardingIdx] && parts[boardingIdx].toLowerCase().includes('day')) {
        boarding = 'Day Scholar';
      }

      let gender: 'Male' | 'Female' = 'Male';
      if (parts[genderIdx] && (parts[genderIdx].toLowerCase().trim() === 'female' || parts[genderIdx].toLowerCase().trim() === 'f')) {
        gender = 'Female';
      } else {
        const nameLower = name.toLowerCase();
        // High coverage regex matching typical female names, biblicals & regional Ganda/Ugandan female indicators
        const femalePatterns = /\b(sarah|chipo|fatima|priya|aminata|mercy|tendai|rachel|racheal|reachel|rachele|mary|maria|marie|mariam|mariama|jane|grace|joyce|esther|ruth|doris|alice|beatrice|florence|rose|agnes|helen|evelyn|margaret|anne|anna|lucy|milly|clara|fiona|irene|gloria|winifred|judith|lillian|patricia|hannah|sharon|naomi|rebecca|miriam|tabitha|deborah|priscilla|phoebe|lydia|peace|hope|charity|faith|joy|providence|patience|comfort|blessing|vicky|victoria|elizabeth|edith|damaris|lynda|linda|brenda|shiela|sheila|tracy|stella|anitah|anita|dorcus|diana|daisy|jackline|jacqueline|daphine|daphne|peninah|proscoviya|proscovia|mrs|miss|lady|female|queen|hadassah|abigail|sandra|favour|loice|milika|naiga|nakato|babirye|namubiru|nankya|najjuma|nakanwagi|nakazibwe|namaganda|nsubuga|nanfuka|namutebi|nambi|nakasi|namara|natukunda|tumusiime|kemigisha|atukwatse|ankunda|kyomugisha|arinda|karungi|kabasinguzi|atwooki|abwooli|katusiime|asimwe|asiimwe|mbabazi|akiteng|amaro|apio|aceng|atyo|akello|awor|aber|anena|alomol|akurut|asijo|adong|alanyo|amit|akoli|among|amulen|aspen|rehema|hadija|fatuma|asha|zara|halima|shifa|mariana|zahra|layla|amina|yasmin|safia|zainab|khadija|rukayah|nuru|muna|warda|nadia|fatma|leila)\b/i;
        if (femalePatterns.test(nameLower)) {
          gender = 'Female';
        }
      }

      parsedStudents.push({
        id: `stud-bulk-${Date.now()}-${i}`,
        adminNo: customNo,
        name,
        gender,
        gradeClass,
        boardingStatus: boarding,
        isCleared: true,
        gateClearanceDate: today,
        mealsClearanceDate: today,
        remarks: 'Batch imported via roster paste.'
      });
    }

    if (parsedStudents.length > 0) {
      const newList = [...students, ...parsedStudents];
      handleSaveAndSync(newList);
      setBulkInput('');
      setShowBulkImporter(false);
      alert(`Successfully registered ${parsedStudents.length} students in Term 2 database!`);
    }
  };

  // --- TRIGGER NATIVE BROWSER PRINT DIALOG ---
  const handleTriggerWebPrint = () => {
    if (selectedIds.length === 0) {
      alert('Please check/select at least one student card to queue for printing.');
      return;
    }
    window.print();
  };

  // --- DOWNLOAD HIGH FIDELITY VECTOR PDF ---
  const handleTriggerPdfExport = async () => {
    if (selectedIds.length === 0) {
      alert('Please select at least one student to export.');
      return;
    }

    setIsGeneratingPdf(true);
    setPdfProgress({ current: 0, total: selectedIds.length });

    // Micro setTimeout wrapper so DOM updates loader graphic state cleanly
    setTimeout(async () => {
      try {
        const doc = await generateClearancePdf({
          layoutMode: pdfLayoutMode,
          students: selectedStudentsData,
          onProgress: (current, total) => {
            setPdfProgress({ current, total });
          },
          schoolLogoBase64: schoolLogo,
        });

        const filename = `clearance-cards-${pdfLayoutMode}-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
      } catch (e) {
        console.error('Vector PDF generation crashed:', e);
        alert('An issue occurred during PDF generation. Please try browser printing.');
      } finally {
        setIsGeneratingPdf(false);
        setPdfProgress(null);
      }
    }, 150);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* HEADER NAVBAR */}
      <header className="no-print bg-slate-950 border-b border-slate-800 shrink-0 px-4 py-4 md:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="relative p-1 bg-slate-900/45 rounded-lg border border-slate-800 shrink-0 shadow-inner">
            <SchoolLogo className="w-12 h-12" logoBase64={schoolLogo} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 uppercase tracking-tight">Term 2 Student Clearance</h1>
            <p className="text-xs text-slate-400 mt-0.5">ST. PAUL SECONDARY SCHOOL, NASUTI • P.O.BOX 678, NASUTI IGANGA • "God is My Guide"</p>
          </div>
        </div>
        
        <div className="flex gap-2.5 self-stretch sm:self-auto">
          <button
            onClick={handleOpenAddForm}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg border border-indigo-500 shadow-sm transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Student
          </button>
          <button
            onClick={() => setShowBulkImporter(!showBulkImporter)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all duration-150 cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Bulk Excel Paste
          </button>
        </div>
      </header>

      {/* METRICS BENTO GRID */}
      <section className="no-print grid grid-cols-2 md:grid-cols-4 gap-4 p-4 md:p-6 bg-slate-950 border-b border-slate-900 shrink-0 select-none">
        <div className="rounded-xl bg-slate-900 p-4 border border-slate-800/80 hover:border-slate-800 transition-all duration-150 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider font-mono">
            <span>Roster Total</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black mt-2 text-slate-100">{stats.total}</div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">Term 2 2026 Students Registered</p>
        </div>

        <div className="rounded-xl bg-slate-900 p-4 border border-slate-800/80 hover:border-slate-800 transition-all duration-150 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider font-mono">
            <span>Cleared Students</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black mt-2 text-slate-100 flex items-baseline gap-2">
            <span>{stats.clearedCount}</span>
            <span className="text-xs font-bold text-emerald-400">({stats.clearedPct}%)</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">Students Cleared &amp; Validated</p>
        </div>

        <div className="rounded-xl bg-slate-900 p-4 border border-slate-800/80 hover:border-slate-800 transition-all duration-150 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider font-mono">
            <span>Clearance Hold</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black mt-2 text-slate-100 flex items-baseline gap-2">
            <span>{stats.balanceCount}</span>
            <span className="text-xs font-bold text-amber-400">({stats.total > 0 ? 100 - stats.clearedPct : 0}%)</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">Students Awaiting Clearance</p>
        </div>

        <div className="rounded-xl bg-slate-900 p-4 border border-indigo-500/30 bg-indigo-950/20 shadow-indigo-950/10 shadow-inner">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider font-mono">
            <span>Print Queue Selected</span>
            <Printer className="w-4 h-4 text-indigo-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black mt-2 text-indigo-300">{stats.selectCount}</div>
          <p className="text-[10px] text-indigo-400 mt-1 font-mono">Total Badges Queued</p>
        </div>
      </section>

      {/* SOLE INTEGRATED DASHBOARD WORKSPACE */}
      <main className="no-print flex-1 flex flex-col lg:flex-row overflow-hidden md:h-0">
        
        {/* LEFT WORKSPACE PANEL: STUDENT TABLE & MANAGEMENT */}
        <section className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 border-r border-slate-800 gap-4">
          
          {/* BULK EXCEL PASTE CONTAINER (COLLAPSIBLE) */}
          {showBulkImporter && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Roster Copy-Paste Importer</h3>
                <span className="text-[10px] text-indigo-400 font-mono">Comma (*,*), Tab, or Pipe (*|*) delimiter</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Paste names and grade forms directly from Excel. <span className="text-slate-200 font-semibold font-mono">One student per line</span>. Format optionally: <span className="text-indigo-400 font-mono">Name, Class/Grade, AdminID, Dorm/Day</span>.
              </p>
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="Examples:&#10;Kofi Mensah, S.1 A, ADM-101, Boarder&#10;Winfred Banda, S.5 Sciences, ADM-102, Day Scholar"
                className="w-full h-28 bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600"
              />
              {bulkImportError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/20 p-2.5 rounded-lg border border-rose-900/40">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bulkImportError}</span>
                </div>
              )}
              <div className="flex gap-2 self-end">
                <button
                  onClick={() => setShowBulkImporter(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-md text-xs font-bold uppercase tracking-wider border border-slate-700 hover:bg-slate-700 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkImport}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-bold uppercase tracking-wider border border-indigo-500 hover:bg-indigo-500 transition-colors shadow-sm cursor-pointer"
                >
                  Parse and Save
                </button>
              </div>
            </div>
          )}

          {/* BULK ACTIONS / QUEUING AND QUICK-SELECT WIDGETS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* bursars requested "print a certain number of students" */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> Bursar's Print Queuer
                </h4>
                <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                  Queue a sequence of students instantly, then choose an option to download or print high fidelity badges.
                </p>
              </div>

              {queueSuccessMessage && (
                <div className="text-[10px] leading-snug bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 p-2 rounded-lg flex items-center gap-1.5 font-semibold animate-pulse">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{queueSuccessMessage}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex-1 flex bg-slate-900 border border-slate-800 rounded-lg items-center px-2.5 py-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase mr-2 font-mono">Count:</label>
                  <input
                    type="number"
                    min={1}
                    max={filteredStudents.length}
                    value={queueCountInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSelectFirstN(queueCountInput);
                      }
                    }}
                    onChange={(e) => setQueueCountInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-transparent text-slate-100 placeholder:text-slate-700 text-xs font-black border-none focus:outline-none focus:ring-0 pr-1 select-all"
                  />
                </div>
                <button
                  onClick={() => handleSelectFirstN(queueCountInput)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 font-bold text-xs uppercase tracking-wider rounded-lg transition-all duration-150 shrink-0 shadow-sm cursor-pointer"
                  title="Select N students in table to queue them for printing"
                >
                  Queue Selected
                </button>
              </div>

              {selectedIds.length > 0 ? (
                <div className="border-t border-slate-900 pt-2.5 mt-1 space-y-2">
                  <div className="flex justify-between items-center text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">
                    <span>Print Queue Action:</span>
                    <span className="text-indigo-400 font-extrabold">{selectedIds.length} Student Cards Selected</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleTriggerPdfExport}
                      disabled={isGeneratingPdf}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg border border-indigo-500 transition-all duration-150 shadow-sm cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </button>
                    <button
                      onClick={handleTriggerWebPrint}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-[10px] uppercase tracking-wider rounded-lg border border-slate-700 transition-all duration-150 shadow-sm cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Layout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[9.5px] text-slate-500 italic flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-600 shrink-0" />
                  <span>Enter student count, click 'Queue Selected', then press 'Download PDF' or 'Print Layout'!</span>
                </div>
              )}
            </div>

            {/* BATCH STATUS MODIFIER CODES */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Bulk Status Action
                </h4>
                <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                  Apply security clearance eligibility status shifts to all checked students.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleBulkUpdate(true)}
                  disabled={selectedIds.length === 0}
                  className="w-full bg-emerald-950 hover:bg-emerald-900 border border-emerald-800/50 py-1.8 text-[9px] font-black tracking-wider text-emerald-300 uppercase rounded-lg transition-all disabled:opacity-30 cursor-pointer"
                >
                  ✔ Clear Checked
                </button>
                <button
                  onClick={() => handleBulkUpdate(false)}
                  disabled={selectedIds.length === 0}
                  className="w-full bg-rose-950 hover:bg-rose-900 border border-rose-800/50 py-1.8 text-[9px] font-black tracking-wider text-rose-300 uppercase rounded-lg transition-all disabled:opacity-30 cursor-pointer"
                >
                  ✖ Place Hold
                </button>
              </div>
            </div>

          </div>

          {/* ACTIVE REGISTRY CONTROL: ADVANCED FILTERS */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Bar */}
              <div className="flex-1 flex bg-slate-900 border border-slate-850 rounded-lg items-center px-3 py-1.5">
                <Search className="w-4 h-4 text-slate-500 shrink-0 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students by Name, ADM ID, or Form Class..."
                  className="w-full bg-transparent text-slate-100 placeholder:text-slate-600 text-xs border-none focus:outline-none focus:ring-0"
                />
              </div>

              {/* Class Filter */}
              <div className="flex bg-slate-900 border border-slate-850 rounded-lg items-center px-2 py-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1.5" />
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="bg-transparent text-slate-300 text-[10px] font-bold border-none focus:outline-none focus:ring-0 uppercase tracking-widest"
                >
                  <option value="All">FORM / GRADE: ALL</option>
                  {uniqueClassesList.filter(c => c !== 'All').map((c) => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Micro Filter Chips row */}
            <div className="flex flex-wrap gap-2 items-center text-xs">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Filters:</span>
              
              <select
                value={filterClearance}
                onChange={(e) => setFilterClearance(e.target.value)}
                className="bg-slate-900 border border-slate-850 py-1 px-2 text-[10px] text-slate-400 font-medium rounded-md focus:outline-none uppercase"
              >
                <option value="All">CLEARANCE: ALL</option>
                <option value="Cleared">CLEARED ONLY</option>
                <option value="Hold">ON HOLD</option>
              </select>

              <select
                value={filterBoarding}
                onChange={(e) => setFilterBoarding(e.target.value)}
                className="bg-slate-900 border border-slate-850 py-1 px-2 text-[10px] text-slate-400 font-medium rounded-md focus:outline-none uppercase"
              >
                <option value="All">BOARDING: ALL</option>
                <option value="Boarder">BOARDER</option>
                <option value="Day Scholar">DAY SCHOLAR</option>
              </select>

              <button
                onClick={handleResetFilters}
                className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 ml-auto px-2 py-1 rounded hover:bg-slate-900 uppercase font-mono tracking-wider cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-md flex-1 min-h-[300px] flex flex-col justify-between">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse select-none">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredStudents.map((s) => s.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                      />
                    </th>
                    <th className="py-3 px-3">Student Details</th>
                    <th className="py-3 px-3">Admin No</th>
                    <th className="py-3 px-3">Class &amp; Stream</th>
                    <th className="py-3 px-3 text-center">Clearance Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                        No student records found matching active metrics.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => {
                      const isChecked = selectedIds.includes(s.id);
                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-slate-900/40 transition-colors duration-100 ${
                            isChecked ? 'bg-indigo-950/20' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedIds((prev) =>
                                  prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                                );
                              }}
                              className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                          </td>

                          {/* Student Info */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              {/* Selection Highlight Pointer */}
                              <button
                                onClick={() => setPreviewStudentId(s.id)}
                                className={`w-2.5 h-2.5 rounded-full transition-colors shrink-0 cursor-pointer ${
                                  previewStudentId === s.id ? 'bg-indigo-500 animate-pulse' : 'bg-slate-700 hover:bg-slate-500'
                                }`}
                                title="Set Focus preview card"
                              />

                              {/* Mini Passport Photo Thumbnail */}
                              <div className="w-8 h-9 rounded bg-slate-950 border border-slate-800/85 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative">
                                {s.photo ? (
                                  <img src={s.photo} alt={s.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                ) : (
                                  <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>

                              <div>
                                <span
                                  onClick={() => setPreviewStudentId(s.id)}
                                  className="font-bold text-slate-100 hover:text-indigo-400 cursor-pointer transition-colors"
                                >
                                  {s.name}
                                </span>
                                <div className="text-[10px] text-indigo-400 font-semibold mt-0.5">
                                  {s.boardingStatus === 'Boarder' ? 'Hosteler' : 'Day Scholar'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Admin No */}
                          <td className="py-3 px-3 font-mono font-bold text-slate-400">{s.adminNo}</td>

                          {/* Class & Stream */}
                          <td className="py-3 px-3 font-semibold text-slate-350">
                            {(() => {
                              const clsParts = (s.gradeClass || '').split(' ');
                              return (
                                <div className="flex flex-col">
                                  <span className="text-slate-200 font-bold">{clsParts[0]}</span>
                                  <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">
                                    Stream {clsParts.slice(1).join(' ') || 'A'}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                                                   {/* Clearance Status */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => toggleRowStatus(s.id)}
                              className={`inline-flex px-3 py-1 rounded-full font-mono font-black text-[9px] tracking-wider uppercase border text-center cursor-pointer transition-colors duration-200 ${
                                s.isCleared
                                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/30'
                                  : 'bg-rose-950/40 border-rose-800/60 text-rose-400 hover:bg-rose-900/30'
                              }`}
                              title="Click to toggle clearance status"
                            >
                              {s.isCleared ? 'CLEARED' : 'HOLD'}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex gap-1.5 align-middle">
                              <button
                                onClick={() => setScanModeStudent(s)}
                                className="p-1 text-slate-400 hover:bg-slate-800 rounded-md hover:text-indigo-400 cursor-pointer transition-all duration-150"
                                title="Mobile scanning pass"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditForm(s)}
                                className="p-1 text-slate-400 hover:bg-slate-800 rounded-md hover:text-emerald-400 cursor-pointer transition-all duration-150"
                                title="Edit registration"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(s.id)}
                                className="p-1 text-slate-400 hover:bg-slate-800 rounded-md hover:text-rose-400 cursor-pointer transition-all duration-150"
                                title="Remove Student"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Actions */}
            <div className="p-4 border-t border-slate-850 bg-slate-900/40 flex flex-col md:flex-row gap-3 justify-between items-center text-xs">
              <span className="text-slate-500 font-mono">
                Showing {filteredStudents.length} of {students.length} Total Registered Students
              </span>
              
              {selectedIds.length > 0 && (
                <div className="flex gap-2.5 items-center">
                  <span className="text-amber-400 font-bold font-mono text-[10px] uppercase bg-amber-950/30 border border-amber-900/40 px-2.5 py-1 rounded-md">
                    Queue: {selectedIds.length} Selected
                  </span>
                  <button
                    onClick={handleDeleteSelected}
                    className="px-3 py-1.5 bg-rose-950/40 text-rose-400 border border-rose-900/40 rounded-lg hover:bg-rose-900/30 hover:text-rose-300 transition-colors uppercase font-mono font-bold text-[10px] tracking-wider cursor-pointer"
                  >
                    Delete Selected
                  </button>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="px-3 py-1.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg hover:text-slate-200 transition-colors uppercase font-mono font-bold text-[10px] tracking-wider cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              )}
            </div>
          </div>

        </section>

        {/* RIGHT PREVIEW PANEL: BADGE CARD STUDIO & EXPORTERS */}
        <section className="w-full lg:w-[400px] bg-slate-950 p-4 md:p-6 flex flex-col justify-start gap-4 shrink-0 overflow-y-auto border-t lg:border-t-0 border-slate-900 select-none">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-extrabold text-slate-150 uppercase tracking-tight flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-indigo-400" /> Print Preview Workspace
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">
              Select student on the grid to update live preview parameters. Flip card using toggle controls.
            </p>

            {activePreviewStudent ? (
              <div className="mt-4 flex flex-col items-center gap-4">
                {/* Active Card Frame */}
                <div className="p-1 px-2 bg-slate-100/5 border border-slate-700 rounded-full flex gap-1 text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest leading-none flex-wrap justify-center">
                  <button
                    onClick={() => setPreviewCardSide('both')}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      previewCardSide === 'both' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-800'
                    }`}
                  >
                    All Sides
                  </button>
                  <button
                    onClick={() => setPreviewCardSide('front')}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      previewCardSide === 'front' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-800'
                    }`}
                  >
                    Front
                  </button>
                  <button
                    onClick={() => setPreviewCardSide('back')}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      previewCardSide === 'back' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-800'
                    }`}
                  >
                    Meal Calendar
                  </button>
                  <button
                    onClick={() => setPreviewCardSide('payment')}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      previewCardSide === 'payment' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-800'
                    }`}
                  >
                    Payment Mode
                  </button>
                </div>

                <div className="scale-[0.9] origin-top md:scale-[0.95] flex flex-col gap-4">
                  <ClearanceCard
                    student={activePreviewStudent}
                    side={previewCardSide}
                    interactive={false}
                    logoBase64={schoolLogo}
                  />
                </div>
                
                {/* Micro info */}
                <div className="w-full bg-slate-950 rounded-lg p-2.5 border border-slate-850 text-[10px] text-left">
                  <div className="flex justify-between font-mono font-bold text-slate-400 border-b border-slate-850 pb-1 mb-1">
                    <span>Admin Code</span>
                    <span className="text-slate-200">{activePreviewStudent.adminNo}</span>
                  </div>
                  {activePreviewStudent.remarks && (
                    <p className="text-slate-500 italic mt-0.5 leading-relaxed font-sans">
                      "{activePreviewStudent.remarks}"
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-slate-500 font-medium">
                Please register a student to load active layouts.
              </div>
            )}
          </div>

          {/* SCHOOL LOGO & CREST SETTINGS CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" /> School Branding Logo
              </span>
              {schoolLogo && (
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="text-[9px] hover:text-rose-450 text-slate-400 font-extrabold uppercase transition-colors pointer-events-auto cursor-pointer"
                  title="Restore default St. Paul Secondary School crest"
                >
                  Reset Crest
                </button>
              )}
            </h3>
            
            <div className="flex gap-3 items-center bg-slate-950 p-2.5 rounded-lg border border-slate-850">
              <div className="relative shrink-0 w-11 h-11 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
                <SchoolLogo className="w-9 h-9" logoBase64={schoolLogo} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] uppercase font-bold text-slate-450 tracking-wider">Active Credentials Seal</span>
                <span className="block text-[8.5px] text-slate-500 truncate mt-0.5 leading-relaxed">
                  {schoolLogo ? 'Custom Uploaded Official Logo' : 'St. Paul Fallback Vector Crest'}
                </span>
              </div>
            </div>

            <div className="relative">
              <label 
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-755 text-slate-300 hover:text-slate-100 font-bold text-[10px] uppercase tracking-wider rounded-lg border border-slate-700 cursor-pointer text-center select-none transition-all duration-150"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Brand Logo
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg, image/svg+xml" 
                  onChange={handleLogoUpload} 
                  className="hidden" 
                />
              </label>
            </div>
            <p className="text-[8.5px] leading-relaxed text-slate-500 font-mono">
              Upload the logo in transparent digital PNG, JPG, or SVG format (max 1.2MB). This dynamically applies the seal to clearance layouts, scan mobile links, and high-fidelity PDF exports.
            </p>
          </div>

          {/* PRINT ACTIONS AREA */}
          <div className="bg-slate-900 border border-indigo-505/20 bg-indigo-950/5 rounded-xl p-4 flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-indigo-400" /> Export Clearance Passes
            </h3>
            
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Export vector multi-page PDF documents or execute high-fidelity paper sheets via browser layout.
            </p>

            <div className="space-y-2 mt-1">
              {/* PDF Settings Layout select */}
              <div className="flex flex-col bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">PDF Sheets Alignment Method:</label>
                <select
                  value={pdfLayoutMode}
                  onChange={(e) => setPdfLayoutMode(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-200 uppercase mt-1 focus:outline-none"
                >
                  <option value="front-back-paired">Stacked (Front & Back Side-by-Side)</option>
                  <option value="printable-grid">Grid (8-Cards Duplex Mirrored Roster)</option>
                </select>
                <p className="text-[8.5px] text-slate-500 mt-1 leading-normal">
                  {pdfLayoutMode === 'front-back-paired' 
                    ? 'Best for direct single A4 handouts. Front is side-by-side with Back calendar.'
                    : 'Best for standard duplex printers. Generates Page 1 (Fronts) and Page 2 (Backs) paired.'}
                </p>
              </div>

              {/* Progress feedback under generation */}
              {isGeneratingPdf && pdfProgress && (
                <div className="bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-900/30 flex flex-col gap-1.5 text-[10px] font-mono">
                  <div className="flex justify-between font-bold text-indigo-300">
                    <span>COMPILING VECTOR BARCODES...</span>
                    <span>{pdfProgress.current} / {pdfProgress.total}</span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-100"
                      style={{ width: `${(pdfProgress.current / pdfProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={handleTriggerPdfExport}
                  disabled={selectedIds.length === 0 || isGeneratingPdf}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-lg border border-indigo-500 shadow-md transition-all duration-150 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download PDF ({selectedIds.length} queued)
                </button>
                
                <button
                  onClick={handleTriggerWebPrint}
                  disabled={selectedIds.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 font-black text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all duration-150 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Browser Page Handouts
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-center justify-center text-[9px] text-slate-500 leading-normal font-medium mt-1">
                <Info className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>Tick student checkboxes in the grid to queue their cards for printing.</span>
              </div>
            </div>

          </div>

        </section>

      </main>

      {/* INDIVIDUAL ADD / EDIT DIALOG FORM DRAWER */}
      {showFormModal && (() => {
        const parts = (formInputs.gradeClass || '').split(' ');
        const currentClass = parts[0] || 'S.1';
        const currentStream = parts.slice(1).join(' ') || 'A';

        return (
          <div className="no-print fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto py-8">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] md:max-h-[85vh] overflow-y-auto scrollbar-thin">
              
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black uppercase text-slate-100 tracking-wider">
                  {editingStudent ? 'Edit Student Details' : 'Register New Student'}
                </h3>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors text-xs font-mono font-bold cursor-pointer"
                >
                  [ CLOSE ]
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleFormSubmit(e);
                }}
                className="space-y-4"
              >
                {/* Passport Photo Upload Zone */}
                <div className="flex items-center gap-4 bg-slate-950/45 p-3 rounded-lg border border-slate-850">
                  <div className="relative w-14 h-18 bg-slate-950 border-2 border-dashed border-slate-800 hover:border-indigo-500 flex flex-col items-center justify-center rounded cursor-pointer overflow-hidden transition shrink-0 group">
                    {formInputs.photo ? (
                      <>
                        <img src={formInputs.photo} alt="Passport photo" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-slate-300 font-bold transition-opacity">
                          CHANGE
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-1">
                        <Upload className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 mb-0.5" />
                        <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-tight leading-none text-center">ADD PHOTO</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 800 * 1024) {
                          alert("Select a passport photo smaller than 800KB for school database storage safety.");
                          return;
                        }
                        const r = new FileReader();
                        r.onloadend = () => {
                          setFormInputs(prev => ({ ...prev, photo: r.result as string }));
                        };
                        r.readAsDataURL(file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Student Passport Photo
                    </span>
                    <p className="text-[9.5px] text-slate-500 leading-snug mt-0.5">
                      Upload a front-facing image (square or 3:4 profile aspect ratio). Will print on pass card.
                    </p>
                    {formInputs.photo && (
                      <button
                        type="button"
                        onClick={() => setFormInputs(prev => ({ ...prev, photo: undefined }))}
                        className="text-[9px] text-rose-400 hover:text-rose-300 font-bold uppercase mt-1 inline-block"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Student Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={formInputs.name}
                    onChange={(e) => setFormInputs(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Grid 2 Column for Class and Stream */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Class selection dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Class *</label>
                    <select
                      value={currentClass}
                      onChange={(e) => {
                        const nextClass = e.target.value;
                        let nextStream = currentStream;
                        if (['S.5', 'S.6'].includes(nextClass)) {
                          if (!['Sciences', 'Arts'].includes(nextStream)) {
                            nextStream = 'Sciences';
                          }
                        } else {
                          if (!['A', 'B', 'C'].includes(nextStream)) {
                            nextStream = 'A';
                          }
                        }
                        setFormInputs(prev => ({ ...prev, gradeClass: `${nextClass} ${nextStream}`.trim() }));
                      }}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 uppercase font-black"
                    >
                      {['S.1', 'S.2', 'S.3', 'S.4', 'S.5', 'S.6'].map((clsOption) => (
                        <option key={clsOption} value={clsOption}>{clsOption}</option>
                      ))}
                    </select>
                  </div>

                  {/* Stream selective dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Stream *</label>
                    <select
                      value={currentStream}
                      onChange={(e) => {
                        const nextStream = e.target.value;
                        setFormInputs(prev => ({ ...prev, gradeClass: `${currentClass} ${nextStream}`.trim() }));
                      }}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
                    >
                      {['S.1', 'S.2', 'S.3', 'S.4'].includes(currentClass) ? (
                        ['A', 'B', 'C'].map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))
                      ) : (
                        ['Sciences', 'Arts'].map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Grid 2 Column for Gender & Boarding */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Gender selection */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gender *</label>
                    <select
                      value={formInputs.gender || 'Male'}
                      onChange={(e) => setFormInputs(prev => ({ ...prev, gender: e.target.value as 'Male' | 'Female' }))}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-bold uppercase"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  {/* Boarding Type: Day Scholar or Hosteler */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Boarding Status</label>
                    <select
                      value={formInputs.boardingStatus}
                      onChange={(e) => setFormInputs(prev => ({ ...prev, boardingStatus: e.target.value as any }))}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-500 uppercase font-semibold"
                    >
                      <option value="Boarder">Hosteler (Boarding)</option>
                      <option value="Day Scholar">Day Scholar</option>
                    </select>
                  </div>
                </div>

                {/* Remarks and Clearance fields */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Remarks / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Fees fully cleared, special note"
                    value={formInputs.remarks}
                    onChange={(e) => setFormInputs(prev => ({ ...prev, remarks: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Status Selector */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-850">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Overall Clearance Status</label>
                    <select
                      value={formInputs.isCleared ? "true" : "false"}
                      onChange={(e) => setFormInputs(prev => ({ ...prev, isCleared: e.target.value === "true" }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.2 text-xs text-slate-200 focus:outline-none uppercase font-bold tracking-wider"
                    >
                      <option value="true">CLEARED ✔</option>
                      <option value="false">ON HOLD ✖</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2.5 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                  >
                    Save Registration
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MOBILE SCAN SIMULATOR SCREEN MODAL */}
      {scanModeStudent && (
        <div className="no-print fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between p-4 md:p-6 overflow-y-auto select-none">
          {/* Top Bar Bar */}
          <div className="w-full max-w-md flex justify-between items-center border-b border-slate-850 pb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-extrabold tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>TERMINAL ACTIVE</span>
            </div>
            <button
              onClick={() => setScanModeStudent(null)}
              className="px-3 py-1 bg-slate-900 border border-slate-800 text-xs font-bold font-mono tracking-wider text-slate-400 hover:text-white rounded-md cursor-pointer"
            >
              EXIT SCANNER
            </button>
          </div>

          {/* Simulated scanning reader interface */}
          <div className="w-full max-w-xs flex-1 flex flex-col justify-center items-center py-6 gap-6">
            
            {/* Status indicator Ring */}
            <div className={`p-5 rounded-full border-[5px] flex items-center justify-center bg-slate-900 shadow-xl ${
              scanModeStudent.isCleared
                ? 'border-emerald-500 text-emerald-400 shadow-emerald-950/20'
                : 'border-rose-500 text-rose-400 shadow-rose-950/20'
            }`}>
              {scanModeStudent.isCleared ? (
                <CheckCircle2 className="w-16 h-16 animate-bounce" />
              ) : (
                <XCircle className="w-16 h-16 animate-pulse" />
              )}
            </div>

            {/* Clearance visual stamps */}
            <div className="text-center">
              <div className="text-[10px] tracking-widest text-slate-500 uppercase font-mono font-black">Clearance Verification</div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight mt-1">{scanModeStudent.name}</h2>
              <p className="text-xs text-indigo-400 font-mono font-bold mt-1 uppercase tracking-wider animate-pulse">
                {scanModeStudent.adminNo} • {scanModeStudent.gradeClass} • {scanModeStudent.boardingStatus === 'Boarder' ? 'HOSTELER' : 'DAY SCHOLAR'}
              </p>
            </div>

            {/* Verification Checklist cards */}
            <div className="w-full bg-slate-900 border border-slate-850 rounded-xl p-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400 font-mono">CLEARANCE STATUS:</span>
                <span className={`px-2.5 py-0.5 rounded font-black font-mono text-[10px] tracking-widest ${
                  scanModeStudent.isCleared
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/60'
                    : 'bg-rose-950 text-rose-400 border border-rose-900/60'
                }`}>
                  {scanModeStudent.isCleared ? 'CLEARED' : 'HOLD'}
                </span>
              </div>
            </div>

            {/* Interactive checkoff simulation back calendar view for phone layout */}
            <div className="w-full scale-[0.85] p-2 flex bg-slate-900 rounded-xl border border-slate-850">
              <ClearanceCard student={scanModeStudent} side="back" interactive={true} logoBase64={schoolLogo} />
            </div>

          </div>

          {/* Quick toggle list links */}
          <div className="w-full max-w-md bg-slate-900 border border-slate-850 rounded-xl p-3 text-[10px] font-mono leading-relaxed text-slate-500 text-center">
            <span>Scan simulator processes Code 39 laser signals against active school Term 2 caches. Daily register is manually initialed or punched on physical back dates.</span>
          </div>
        </div>
      )}

      {/* HIDDEN PHYSICAL HIGH-FIDELITY WEB PRINT CONTAINER */}
      {/* Renders cards formatted for physical A4 papers in column grids */}
      <div id="print-section" className="hidden print:block bg-white text-black p-0">
        {(() => {
          const cardsPerPage = 8;
          const pages: Student[][] = [];
          for (let i = 0; i < selectedStudentsData.length; i += cardsPerPage) {
            pages.push(selectedStudentsData.slice(i, i + cardsPerPage));
          }

          if (pdfLayoutMode === 'front-back-paired') {
            // Stacked pairs for handout: Card 1 front, Card 1 back side by side, and payment card spanning whole width inside grid
            return pages.map((pageStudents, pIdx) => (
              <div key={pIdx} className="print-page bg-white">
                {pageStudents.map((student) => [
                  // FRONT card element
                  <div key={`print-front-${student.id}`} className="print-card-wrapper border border-slate-250">
                    <ClearanceCard student={student} side="front" logoBase64={schoolLogo} />
                  </div>,
                  // BACK card element
                  <div key={`print-back-${student.id}`} className="print-card-wrapper border border-slate-250">
                    <ClearanceCard student={student} side="back" logoBase64={schoolLogo} />
                  </div>,
                  // PAYMENT card element spanning columns
                  <div key={`print-payment-${student.id}`} className="col-span-2 w-[190mm] h-[55mm] page-break-inside-avoid overflow-hidden shadow-none border border-slate-250 rounded-[4px] bg-white">
                    <ClearanceCard student={student} side="payment" logoBase64={schoolLogo} />
                  </div>
                ])}
              </div>
            ));
          } else {
            // Duplex Roster layout sheets
            return pages.map((pageStudents, pIdx) => [
              // Sheet Front side
              <div key={`print-grid-front-${pIdx}`} className="print-page bg-white">
                {pageStudents.map((student) => (
                  <div key={`duplex-f-${student.id}`} className="print-card-wrapper border border-slate-200">
                    <ClearanceCard student={student} side="front" logoBase64={schoolLogo} />
                  </div>
                ))}
              </div>,
              // Sheet Back side (Mirrored horizontally for double-sided printers alignment!)
              <div key={`print-grid-back-${pIdx}`} className="print-page bg-white">
                {(() => {
                  // Re-map column cells manually to support reverse paper mirroring:
                  // For each row (0 to 3), mirror Col 1 and Col 2 elements!
                  const mirroredList: Student[] = [];
                  for (let r = 0; r < Math.ceil(pageStudents.length / 2); r++) {
                    const idxLeft = r * 2;
                    const idxRight = r * 2 + 1;
                    
                    const leftStudent = pageStudents[idxLeft];
                    const rightStudent = pageStudents[idxRight];

                    if (rightStudent) mirroredList.push(rightStudent); // Col 0 on page back corresponds to Col 1 on page front
                    if (leftStudent) mirroredList.push(leftStudent);   // Col 1 on page back corresponds to Col 0 on page front
                  }
                  return mirroredList.map((student) => (
                    <div key={`duplex-b-${student.id}`} className="print-card-wrapper border border-slate-200">
                      <ClearanceCard student={student} side="back" logoBase64={schoolLogo} />
                    </div>
                  ));
                })()}
              </div>
            ]);
          }
        })()}
      </div>

    </div>
  );
}
