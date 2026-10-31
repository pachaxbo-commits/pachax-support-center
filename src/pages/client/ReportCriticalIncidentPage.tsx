import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  AlertOctagon,
  ShieldAlert,
  Send,
  Upload,
  CheckCircle,
  Clock,
  PhoneCall
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Project } from '@/models/project';
import { ImageAnnotationEditor } from '@/components/image-editor/ImageAnnotationEditor';
import { AnnotationItem } from '@/models/incident';

export const ReportCriticalIncidentPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [moduleAffected, setModuleAffected] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [emergencyPhone, setEmergencyPhone] = useState<string>('');
  const [responsibleUseConsent, setResponsibleUseConsent] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Evidence
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | undefined>();
  const [originalImageUrl, setOriginalImageUrl] = useState<string | undefined>();
  const [annotations, setAnnotations] = useState<AnnotationItem[] | undefined>();
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
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

  // Restore draft from sessionStorage
  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem('pachax_draft_critical_incident');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.moduleAffected) setModuleAffected(parsed.moduleAffected);
        if (parsed.justification) setJustification(parsed.justification);
        if (parsed.emergencyPhone) setEmergencyPhone(parsed.emergencyPhone);
        if (parsed.selectedProjectId) setSelectedProjectId(parsed.selectedProjectId);
      }
    } catch {
      // Ignored
    }
  }, []);

  // Auto-save draft on changes to avoid data loss
  useEffect(() => {
    if (!submitted && (title || description || justification)) {
      try {
        sessionStorage.setItem(
          'pachax_draft_critical_incident',
          JSON.stringify({
            title,
            description,
            moduleAffected,
            justification,
            emergencyPhone,
            selectedProjectId,
          })
        );
      } catch {
        // Ignored
      }
    }
  }, [title, description, moduleAffected, justification, emergencyPhone, selectedProjectId, submitted]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setEditorInitialImage(event.target?.result as string);
      setIsEditorOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProjectId || !title.trim() || !description.trim() || !justification.trim()) {
      alert('Por favor completa todos los campos requeridos y la justificación de bloqueo esencial.');
      return;
    }

    if (!responsibleUseConsent) {
      alert('Debes confirmar el uso responsable de la línea de emergencia crítica.');
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
        category: 'critical',
        title: `[CRÍTICO] ${title}`,
        criticalJustification: justification,
        items: [
          {
            title: title,
            description: `${description}\n\n[TELÉFONO DE CONTACTO INMEDIATO: ${emergencyPhone || 'N/D'}]\n[JUSTIFICACIÓN DE BLOQUEO: ${justification}]`,
            moduleAffected: moduleAffected || 'Módulo Crítico',
            priority: 'urgent',
            originalImageUrl,
            annotatedImageUrl,
            annotations,
          },
        ],
      });

      setSubmitted(true);
      try {
        sessionStorage.removeItem('pachax_draft_critical_incident');
      } catch {
        // Ignored
      }
      setTimeout(() => {
        navigate('/client/history');
      }, 2500);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al enviar la incidencia crítica. Por favor verifique e intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/60 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-2xl animate-in zoom-in-95">
        <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
          <Flame className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
          Incidencia Crítica Activada
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
          La alerta de emergencia ha sido emitida por Telegram y correo al equipo de guardia de PACHAX.
        </p>
        <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300">
          SLA de respuesta prioritaria: Menor a 60 minutos
        </div>
        <div className="mt-6">
          <span className="text-xs text-slate-400">Redireccionando al historial...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Emergency Header */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-2">
          <span className="p-2 bg-rose-500/30 rounded-xl text-rose-300">
            <Flame className="w-6 h-6 animate-pulse" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">
              Reporte de Incidencia Crítica (24/7)
            </h1>
            <p className="text-xs sm:text-sm text-rose-200">
              Canal de máxima prioridad para caídas del sistema o parálisis operativa.
            </p>
          </div>
        </div>
      </div>

      {/* Warning Box */}
      <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-900/60 rounded-xl p-4 flex items-start gap-3">
        <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed space-y-1">
          <p className="font-bold">Advertencia de Uso Responsable de Prioridad Crítica:</p>
          <p>
            Utiliza este canal <strong>exclusivamente</strong> si la aplicación está inoperativa, las ventas están totalmente bloqueadas o la facturación legal está caída. Para dudas, errores menores, ajustes de estilo o funciones alternativas, utiliza el <strong>Reporte de Incidencias Generales</strong>.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Proyecto Afectado *
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Título del Bloqueo Crítico *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Caída total del servidor POS - Imposible facturar o cobrar"
            className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Módulo Bloqueado *
            </label>
            <input
              type="text"
              required
              value={moduleAffected}
              onChange={(e) => setModuleAffected(e.target.value)}
              placeholder="Ej. Sincronización SIN / Pasarela de Pagos"
              className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Teléfono de Contacto Inmediato *
            </label>
            <div className="relative">
              <PhoneCall className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                required
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="+591 70000000"
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Justificación Operativa del Bloqueo *
          </label>
          <textarea
            required
            rows={2}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Explica por qué esta incidencia califica como crítica y detén la operación esencial del negocio..."
            className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Descripción Detallada y Mensajes de Error en Pantalla *
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Pega aquí el código de error, captura de logs o mensaje exacto que muestra la aplicación..."
            className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>

        {/* Evidence Annotation Section */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Captura con Anotaciones de la Falla Crítica
          </label>

          {annotatedImageUrl ? (
            <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <img
                src={annotatedImageUrl}
                alt="Evidencia crítica"
                className="max-h-28 rounded-lg border object-contain"
              />
              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Captura con {annotations?.length || 0} anotaciones lista
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(true)}
                  className="text-xs text-brand-600 hover:underline block font-medium"
                >
                  Editar Anotaciones
                </button>
              </div>
            </div>
          ) : (
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 transition">
              <Upload className="w-4 h-4 text-rose-500" />
              <span>Subir Captura y Anotar en Editor</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          )}
        </div>

        {/* Responsible Consent */}
        <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={responsibleUseConsent}
              onChange={(e) => setResponsibleUseConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-600"
            />
            <span className="text-xs text-rose-950 dark:text-rose-200 font-medium leading-relaxed">
              Confirmo bajo responsabilidad de cliente que esta incidencia causa la detención o bloqueo crítico de funciones esenciales.
            </span>
          </label>
        </div>

        {/* Submit button */}
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
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 shadow-lg shadow-rose-600/30 transition"
          >
            <Flame className="w-4 h-4" />
            <span>{isSubmitting ? 'Enviando Alerta Crítica...' : 'Emitir Alerta Crítica Inmediata'}</span>
          </button>
        </div>
      </form>

      {/* Image Annotation Editor Modal */}
      {isEditorOpen && editorInitialImage && (
        <ImageAnnotationEditor
          initialImage={editorInitialImage}
          title="Anotar Falla Crítica"
          onSave={(annotated, orig, ann) => {
            setAnnotatedImageUrl(annotated);
            setOriginalImageUrl(orig);
            setAnnotations(ann);
            setIsEditorOpen(false);
          }}
          onCancel={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  );
};
