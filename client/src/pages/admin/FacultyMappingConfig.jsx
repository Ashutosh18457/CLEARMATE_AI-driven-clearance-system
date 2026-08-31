import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Skeleton from '../../components/common/Skeleton';
import {
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlineBookOpen,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineArrowPath,
  HiOutlineCheckBadge,
  HiOutlineSparkles,
  HiOutlineCog6Tooth,
} from 'react-icons/hi2';
import { FaGraduationCap, FaShieldAlt, FaUniversity } from 'react-icons/fa';

export default function FacultyMappingConfig() {
  const [mappings, setMappings] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('CSE');
  const [selectedSem, setSelectedSem] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Active branch mapping state for editing
  const [currentMapping, setCurrentMapping] = useState(null);

  // Fetch all mappings
  const fetchMappings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/faculty-mappings');
      if (res.data.success && res.data.data) {
        setMappings(res.data.data);
        const match = res.data.data.find(
          (m) => m.branchCode.toUpperCase() === selectedBranch.toUpperCase()
        ) || res.data.data[0];
        if (match) {
          setCurrentMapping(JSON.parse(JSON.stringify(match)));
          setSelectedBranch(match.branchCode);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load faculty mappings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const handleBranchChange = (branchCode) => {
    setSelectedBranch(branchCode);
    const match = mappings.find(
      (m) => m.branchCode.toUpperCase() === branchCode.toUpperCase()
    );
    if (match) {
      setCurrentMapping(JSON.parse(JSON.stringify(match)));
    }
  };

  const handleSave = async () => {
    if (!currentMapping) return;
    setSaving(true);
    try {
      if (currentMapping._id) {
        await api.put(`/faculty-mappings/${currentMapping._id}`, currentMapping);
      } else {
        await api.post('/faculty-mappings', currentMapping);
      }
      toast.success(`Faculty & Subject mappings for ${currentMapping.branchCode} saved!`);
      fetchMappings();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save mappings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all faculty and subject mappings to university defaults?')) return;
    setSaving(true);
    try {
      await api.post('/faculty-mappings/seed-defaults');
      toast.success('Restored university default mappings (CSE, IT, AIML, Civil, Mechanical)!');
      fetchMappings();
    } catch (err) {
      console.error(err);
      toast.error('Failed to reset defaults');
    } finally {
      setSaving(false);
    }
  };

  // Helper to get or create subjects array for the selected semester
  const getCurrentSemesterSubjects = () => {
    if (!currentMapping) return [];
    const semMap = (currentMapping.semesters || []).find((s) => s.semNumber === Number(selectedSem));
    return semMap?.subjects || [];
  };

  const updateSemesterSubjects = (newSubjects) => {
    if (!currentMapping) return;
    const existingSemesters = currentMapping.semesters || [];
    const semIndex = existingSemesters.findIndex((s) => s.semNumber === Number(selectedSem));

    let updatedSemesters = [...existingSemesters];
    if (semIndex >= 0) {
      updatedSemesters[semIndex] = {
        ...updatedSemesters[semIndex],
        subjects: newSubjects,
      };
    } else {
      updatedSemesters.push({
        semNumber: Number(selectedSem),
        subjects: newSubjects,
      });
    }

    setCurrentMapping({
      ...currentMapping,
      semesters: updatedSemesters,
    });
  };

  const handleAddSubject = () => {
    const subjects = getCurrentSemesterSubjects();
    const newSubject = {
      code: `${selectedBranch}${selectedSem}0${subjects.length + 1}`,
      title: 'New Course Title',
      teacherName: currentMapping?.sections?.[0]?.classIncharge?.name || 'Prof. Assigned Faculty',
      type: 'theory',
      isReRun: false,
      remarks: 'Assignments & practicals cleared',
      status: 'Approved',
    };
    updateSemesterSubjects([...subjects, newSubject]);
  };

  const handleRemoveSubject = (idx) => {
    const subjects = getCurrentSemesterSubjects();
    const updated = subjects.filter((_, i) => i !== idx);
    updateSemesterSubjects(updated);
  };

  const handleSubjectChange = (idx, field, value) => {
    const subjects = getCurrentSemesterSubjects();
    const updated = [...subjects];
    updated[idx] = { ...updated[idx], [field]: value };
    updateSemesterSubjects(updated);
  };

  const handleAddSection = () => {
    if (!currentMapping) return;
    const currentSections = currentMapping.sections || [];
    const nextChar = String.fromCharCode(65 + currentSections.length); // 'A', 'B', 'C'
    const newSec = {
      sectionName: nextChar,
      classIncharge: {
        name: `Prof. Class Incharge (Sec ${nextChar})`,
        email: `ci.${nextChar.toLowerCase()}.${selectedBranch.toLowerCase()}@clearmate.edu`,
        designation: `Assistant Professor & Class Incharge (Sec ${nextChar})`,
        phone: '+91 98000 00000',
      },
    };
    setCurrentMapping({
      ...currentMapping,
      sections: [...currentSections, newSec],
    });
  };

  const handleRemoveSection = (idx) => {
    if (!currentMapping) return;
    const updated = (currentMapping.sections || []).filter((_, i) => i !== idx);
    setCurrentMapping({
      ...currentMapping,
      sections: updated,
    });
  };

  return (
    <DashboardLayout title="Faculty & Subject Mapping Config (ERP)">
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-xl shadow-xs">
              <HiOutlineCog6Tooth className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Academic Faculty & Subject Mapping Engine
              </h2>
              <p className="text-xs text-slate-500">
                Configure dynamic downstream bindings for Class Incharge, HOD, and Semester Subjects with Re-run rules.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-300"
            >
              <HiOutlineArrowPath className="w-4 h-4" />
              Reset University Defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm disabled:opacity-50"
            >
              <HiOutlineCheckBadge className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {/* Branch Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {mappings.map((m) => {
            const isActive = m.branchCode.toUpperCase() === selectedBranch.toUpperCase();
            return (
              <button
                key={m.branchCode}
                type="button"
                onClick={() => handleBranchChange(m.branchCode)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap border shadow-2xs ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <FaGraduationCap className="w-3.5 h-3.5" />
                {m.branchCode} — {m.branchName}
              </button>
            );
          })}
        </div>

        {loading || !currentMapping ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Branch & HOD & Sections (4 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* 1. Branch & HOD Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                  <FaShieldAlt className="w-4 h-4 text-purple-600" />
                  1. Department & HOD Assignment
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Branch Code
                    </label>
                    <input
                      type="text"
                      value={currentMapping.branchCode}
                      onChange={(e) =>
                        setCurrentMapping({
                          ...currentMapping,
                          branchCode: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Branch Full Name
                    </label>
                    <input
                      type="text"
                      value={currentMapping.branchName}
                      onChange={(e) =>
                        setCurrentMapping({
                          ...currentMapping,
                          branchName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Head of Department (HOD) Name
                    </label>
                    <input
                      type="text"
                      value={currentMapping.hod?.name || ''}
                      onChange={(e) =>
                        setCurrentMapping({
                          ...currentMapping,
                          hod: { ...currentMapping.hod, name: e.target.value },
                        })
                      }
                      placeholder="e.g. Dr. Kulkarni"
                      className="w-full px-3 py-2 bg-purple-50/50 border border-purple-200 rounded-xl text-xs font-black text-purple-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      HOD Official Designation
                    </label>
                    <input
                      type="text"
                      value={currentMapping.hod?.designation || ''}
                      onChange={(e) =>
                        setCurrentMapping({
                          ...currentMapping,
                          hod: { ...currentMapping.hod, designation: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Section to Class Incharge Mapping */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                    <HiOutlineUserGroup className="w-4 h-4 text-emerald-600" />
                    2. Section Class Incharge
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                  >
                    <HiOutlinePlus className="w-3.5 h-3.5" /> Add Section
                  </button>
                </div>

                <div className="space-y-3.5">
                  {(currentMapping.sections || []).map((sec, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-emerald-50/30 border border-emerald-200/80 rounded-xl space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-800">
                          Section {sec.sectionName}
                        </span>
                        {currentMapping.sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <HiOutlineTrash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">
                            Incharge Name
                          </label>
                          <input
                            type="text"
                            value={sec.classIncharge?.name || ''}
                            onChange={(e) => {
                              const updated = [...currentMapping.sections];
                              updated[idx].classIncharge.name = e.target.value;
                              setCurrentMapping({ ...currentMapping, sections: updated });
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">
                            Email / Contact
                          </label>
                          <input
                            type="text"
                            value={sec.classIncharge?.email || ''}
                            onChange={(e) => {
                              const updated = [...currentMapping.sections];
                              updated[idx].classIncharge.email = e.target.value;
                              setCurrentMapping({ ...currentMapping, sections: updated });
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Semester Subjects & Re-run Configuration (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                    <HiOutlineBookOpen className="w-4 h-4 text-blue-600" />
                    3. Semester Subject Auto-Assignment & Re-Run Rules
                  </div>

                  {/* Semester Switcher */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <button
                        key={sem}
                        type="button"
                        onClick={() => setSelectedSem(sem)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${
                          selectedSem === sem
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Sem {sem}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject List Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">
                      Subjects for {currentMapping.branchCode} — Semester {selectedSem}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddSubject}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 border border-blue-200"
                    >
                      <HiOutlinePlus className="w-3.5 h-3.5" /> Add Subject
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                            <th className="py-2.5 px-3 w-10 text-center">#</th>
                            <th className="py-2.5 px-3 w-28">Code</th>
                            <th className="py-2.5 px-3">Subject Title</th>
                            <th className="py-2.5 px-3 w-40">Assigned Teacher</th>
                            <th className="py-2.5 px-3 w-24 text-center">Re-Run?</th>
                            <th className="py-2.5 px-3 w-12 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {getCurrentSemesterSubjects().map((sub, idx) => (
                            <tr
                              key={idx}
                              className={`hover:bg-slate-50/60 transition ${
                                sub.isReRun ? 'bg-amber-50/40' : ''
                              }`}
                            >
                              <td className="py-2 px-3 text-center font-bold text-slate-500">
                                {idx + 1}
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={sub.code || ''}
                                  onChange={(e) =>
                                    handleSubjectChange(idx, 'code', e.target.value.toUpperCase())
                                  }
                                  placeholder="CS501"
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold"
                                />
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={sub.title || ''}
                                  onChange={(e) =>
                                    handleSubjectChange(idx, 'title', e.target.value)
                                  }
                                  placeholder="Subject Title"
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-900"
                                />
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={sub.teacherName || ''}
                                  onChange={(e) =>
                                    handleSubjectChange(idx, 'teacherName', e.target.value)
                                  }
                                  placeholder="Prof. Name"
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-900"
                                />
                              </td>

                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSubjectChange(idx, 'isReRun', !sub.isReRun)
                                  }
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase transition ${
                                    sub.isReRun
                                      ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                  }`}
                                >
                                  {sub.isReRun ? 'RE-RUN' : 'Normal'}
                                </button>
                              </td>

                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSubject(idx)}
                                  className="text-rose-500 hover:text-rose-700 p-1"
                                  title="Delete subject"
                                >
                                  <HiOutlineTrash className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}

                          {getCurrentSemesterSubjects().length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">
                                No subjects mapped for Semester {selectedSem} yet. Click "Add Subject" above to configure.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-slate-600 leading-relaxed flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                      i
                    </span>
                    <span>
                      Subjects assigned here will automatically appear on student clearance reports when they select <strong>{currentMapping.branchCode}</strong> and <strong>Semester {selectedSem}</strong>. If marked as <strong>Re-run</strong>, they will be highlighted with a red backlog tag in both the ERP portal and official clearance PDF.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
