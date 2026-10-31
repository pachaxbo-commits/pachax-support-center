import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Trash2,
  Upload,
  Highlighter,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Info,
  ShieldCheck,
  Send,
  Eye
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Project } from '@/models/project';
import { ImageAnnotationEditor } from '@/components/image-editor/ImageAnnotationEditor';
import { AnnotationItem } from '@/models/incident';

interface ErrorItemDraft {
  id: string;
  title: string;
  description: string;
  moduleAffected: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  originalImageUrl?: string;
  annotatedImageUrl?: string;
  annotations?: AnnotationItem[];
}

export const ReportGeneralIncidentPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [reportTitle, setReportTitle] = useState<string>('Reporte de incidencias del día');
  const [dailyConsent, setDailyConsent] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);

  // Batch error list
  const [errors, setErrors] = useState<ErrorItemDraft[]>([
    {
      id: `err-${Date.now()}-1`,
      title: '',
      description: '',
      moduleAffected: '',
      priority: 'medium',
    },
  ]);

  // Image Editor modal state
  const [activeEditorIndex, setActiveEditorIndex] = useState<number | null>(null);
  const [editorInitialImage, setEditorInitialImage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      const projs = await api.getProjects(currentUser?.clientCompanyId);
      setProjects(projs);
      if (projs.length > 0) {
        setSelectedProjectId((prev) => prev || projs[0].id);
      }
    }
    loadProjects();
  }, [currentUser]);

  // Restore draft from sessionStorage if available
  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem('pachax_draft_general_incident');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.errors && Array.isArray(parsed.errors) && parsed.errors.length > 0) {
          setErrors(parsed.errors);
        }
        if (parsed.selectedProjectId) {
          setSelectedProjectId(parsed.selectedProjectId);
        }
        if (parsed.reportTitle) {
          setReportTitle(parsed.reportTitle);
        }
      }
    } catch {
      // Ignored
    }
  }, []);

  // Auto-save draft on changes to prevent data loss
  useEffect(() => {
    if (!submissionSuccess && errors.length > 0) {
      try {
        sessionStorage.setItem(
          'pachax_draft_general_incident',
          JSON.stringify({ errors, selectedProjectId, reportTitle })
        );
      } catch {
        // Ignored
      }
    }
  }, [errors, selectedProjectId, reportTitle, submissionSuccess]);

  const handleAddError = () => {
    if (errors.length >= 10) {
      alert('Límite de 10 incidencias por reporte alcanzado para mantener la calidad de atención.');
      return;
    }
    setErrors([
      ...errors,
      {
        id: `err-${Date.now()}-${errors.length + 1}`,
        title: '',
        description: '',
        moduleAffected: '',
        priority: 'medium',
      },
    ]);
  };

  const handleRemoveError = (index: number) => {
    if (errors.length <= 1) {
      alert('Debes incluir al menos un error en el reporte.');
      return;
    }
    setErrors(errors.filter((_, idx) => idx !== index));
  };

  const handleUpdateError = (index: number, field: keyof ErrorItemDraft, value: any) => {
    setErrors(
      errors.map((err, idx) => (idx === index ? { ...err, [field]: value } : err))
    );
  };

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no debe superar los 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setEditorInitialImage(dataUrl);
      setActiveEditorIndex(index);
    };
    reader.readAsDataURL(file);
  };

  const handleEditorSave = (
    annotatedImageUrl: string,
    originalImageUrl: string,
    annotations: AnnotationItem[]
  ) => {
    if (activeEditorIndex !== null) {
      handleUpdateError(activeEditorIndex, 'originalImageUrl', originalImageUrl);
      handleUpdateError(activeEditorIndex, 'annotatedImageUrl', annotatedImageUrl);
      handleUpdateError(activeEditorIndex, 'annotations', annotations);
    }
    setActiveEditorIndex(null);
    setEditorInitialImage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProjectId) {
      alert('Por favor selecciona el proyecto afectado.');
      return;
    }

    // Validation
    for (let i = 0; i < errors.length; i++) {
      if (!errors[i].title.trim() || !errors[i].description.trim()) {
        alert(`Por favor completa el título y descripción del Error #${i + 1}.`);
        return;
      }
    }

    if (!dailyConsent) {
      alert('Debes confirmar que has revisado las incidencias y aceptas el límite diario de envío.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedProj = projects.find((p) => p.id === selectedProjectId);

      await api.createIncidentReport({
        clientCompanyId: currentUser?.clientCompanyId || 'client-sanjose',
        developerCompanyId: selectedProj?.developerCompanyId || 'dev-pachax-core',
        projectId: selectedProjectId,
        projectName: selectedProj?.name,
        reportedBy: {
          uid: currentUser?.uid || 'user-unknown',
          displayName: currentUser?.displayName || 'Usuario',
          email: currentUser?.email || '',
        },
        category: 'general',
        title: reportTitle,
        dailyConsent: true,
        items: errors.map((err) => ({
          title: err.title,
          description: err.description,
          moduleAffected: err.moduleAffected || 'Módulo General',
          priority: err.priority,
          originalImageUrl: err.originalImageUrl,
          annotatedImageUrl: err.annotatedImageUrl,
          annotations: err.annotations,
        })),
      });

      setSubmissionSuccess(true);
      try {
        sessionStorage.removeItem('pachax_draft_general_incident');
      } catch {
        // Ignored
      }
      setTimeout(() => {
        navigate('/client/history');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al enviar el reporte. Por favor intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionSuccess) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-lg animate-in zoom-in-95">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Reporte General Enviado Exitosamente
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Se han registrado {errors.length} error(es) en el sistema. El equipo de ingeniería de PACHAX ha sido notificado.
        </p>
        <div className="mt-6">
          <span className="text-xs text-slate-400">Redireccionando al historial...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Daily Limit Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Reportar Incidencias Generales
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Agrupa todos los errores detectados en la jornada en un único envío ordenado.
          </p>
        </div>
      </div>

      {/* Info Callout */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200">
        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-semibold">Política de Envío Diario:</span> Para garantizar un análisis exhaustivo y evitar dispersión de mensajes, se permite <span className="underline font-semibold">1 reporte consolidado al día</span> por cliente. Sin embargo, dentro de este formulario puedes añadir todos los errores que desees usando el botón <strong>+ Agregar error</strong>. Cada error conserva sus propias capturas y anotaciones independientes.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Selector & General Title */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            1. Proyecto e Identificación del Reporte
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Proyecto / Aplicación Afectada *
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Título del Lote Diario *
              </label>
              <input
                type="text"
                required
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Ej. Incidencias operativas de caja y reportes"
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Errors Container */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>2. Errores Detectados</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                {errors.length} {errors.length === 1 ? 'error' : 'errores'}
              </span>
            </h2>

            <button
              type="button"
              onClick={handleAddError}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900 rounded-lg transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Agregar error</span>
            </button>
          </div>

          {errors.map((err, index) => (
            <div
              key={err.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 relative transition hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Error #{index + 1}
                </span>

                {errors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveError(index)}
                    className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar este error</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Título descriptivo del error *
                  </label>
                  <input
                    type="text"
                    required
                    value={err.title}
                    onChange={(e) => handleUpdateError(index, 'title', e.target.value)}
                    placeholder="Ej. El botón de guardar no responde tras seleccionar cliente"
                    className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Módulo afectado
                  </label>
                  <input
                    type="text"
                    value={err.moduleAffected}
                    onChange={(e) => handleUpdateError(index, 'moduleAffected', e.target.value)}
                    placeholder="Ej. Ventas, Facturación, Inventario"
                    className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descripción del comportamiento y pasos para reproducirlo *
                </label>
                <textarea
                  required
                  rows={3}
                  value={err.description}
                  onChange={(e) => handleUpdateError(index, 'description', e.target.value)}
                  placeholder="Explica qué hiciste, qué esperabas que sucediera y qué ocurrió en realidad..."
                  className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none resize-y"
                />
              </div>

              {/* Error Screenshot & Annotations */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Captura con Anotaciones (Exclusiva para Error #{index + 1})
                </label>

                {err.annotatedImageUrl ? (
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <img
                      src={err.annotatedImageUrl}
                      alt={`Anotación error #${index + 1}`}
                      className="max-h-36 rounded-lg object-contain border border-slate-300 dark:border-slate-600 shadow-sm"
                    />
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        <span>Captura editada guardada ({err.annotations?.length || 0} anotaciones)</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditorInitialImage(err.originalImageUrl || err.annotatedImageUrl || null);
                            setActiveEditorIndex(index);
                          }}
                          className="px-2.5 py-1 text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition"
                        >
                          Reabrir Editor
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateError(index, 'originalImageUrl', undefined);
                            handleUpdateError(index, 'annotatedImageUrl', undefined);
                            handleUpdateError(index, 'annotations', undefined);
                          }}
                          className="px-2.5 py-1 text-xs font-medium bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 text-slate-700 dark:text-slate-300 hover:text-rose-600 rounded-lg transition"
                        >
                          Quitar Imagen
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 transition">
                      <Upload className="w-4 h-4 text-brand-500" />
                      <span>Subir Captura y Abrir Editor</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(index, e)}
                      />
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Podrás dibujar flechas, círculos y notas explicativas.
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Add another error button */}
          <button
            type="button"
            onClick={handleAddError}
            className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 flex items-center justify-center gap-2 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Agregar otro error a este reporte</span>
          </button>
        </div>

        {/* Daily Quota Consent Confirmation */}
        <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={dailyConsent}
              onChange={(e) => setDailyConsent(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-600"
            />
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="font-semibold text-slate-900 dark:text-white">
                Confirmación de Envío Diario Consolidado:
              </span>{' '}
              Confirmo que he incluido todos los errores del día en este reporte. Entiendo que tras enviar, el siguiente reporte de incidencias generales se habilitará el día de mañana (a excepción de incidencias críticas que pueden reportarse en cualquier momento).
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/client/dashboard')}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 shadow-lg shadow-brand-500/20 transition"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Enviando Reporte...' : `Enviar Lote (${errors.length} Errores)`}</span>
          </button>
        </div>
      </form>

      {/* Interactive Image Annotation Editor Modal */}
      {activeEditorIndex !== null && editorInitialImage && (
        <ImageAnnotationEditor
          initialImage={editorInitialImage}
          title={`Anotar Evidencia — Error #${activeEditorIndex + 1}`}
          onSave={handleEditorSave}
          onCancel={() => {
            setActiveEditorIndex(null);
            setEditorInitialImage(null);
          }}
        />
      )}
    </div>
  );
};
