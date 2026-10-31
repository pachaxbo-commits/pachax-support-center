import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Trash2,
  Upload,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Send,
  Sliders,
  DollarSign
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Project } from '@/models/project';
import { ImageAnnotationEditor } from '@/components/image-editor/ImageAnnotationEditor';
import { AnnotationItem } from '@/models/incident';
import { ChangeScope } from '@/models/featureRequest';

interface RequestItemDraft {
  id: string;
  title: string;
  description: string;
  businessJustification: string;
  isConsideredFreeByClient: boolean;
  freeRationale?: string;
  changeScope: ChangeScope;
  annotatedImageUrl?: string;
  annotations?: AnnotationItem[];
}

export const FeatureRequestPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Batch requests list
  const [requests, setRequests] = useState<RequestItemDraft[]>([
    {
      id: `req-${Date.now()}-1`,
      title: '',
      description: '',
      businessJustification: '',
      isConsideredFreeByClient: false,
      freeRationale: '',
      changeScope: 'client_specific',
    },
  ]);

  // Image editor state
  const [activeEditorIndex, setActiveEditorIndex] = useState<number | null>(null);
  const [editorInitialImage, setEditorInitialImage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      const projs = await api.getProjects(currentUser?.clientCompanyId);
      setProjects(projs);
      if (projs.length > 0) {
        setSelectedProjectId(projs[0].id);
      }
    }
    loadProjects();
  }, [currentUser]);

  const handleAddRequest = () => {
    setRequests([
      ...requests,
      {
        id: `req-${Date.now()}-${requests.length + 1}`,
        title: '',
        description: '',
        businessJustification: '',
        isConsideredFreeByClient: false,
        freeRationale: '',
        changeScope: 'client_specific',
      },
    ]);
  };

  const handleRemoveRequest = (index: number) => {
    if (requests.length <= 1) {
      alert('Debes incluir al menos una solicitud.');
      return;
    }
    setRequests(requests.filter((_, idx) => idx !== index));
  };

  const handleUpdateRequest = (index: number, field: keyof RequestItemDraft, value: any) => {
    setRequests(
      requests.map((r, idx) => (idx === index ? { ...r, [field]: value } : r))
    );
  };

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setEditorInitialImage(event.target?.result as string);
      setActiveEditorIndex(index);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProjectId) {
      alert('Selecciona el proyecto.');
      return;
    }

    for (let i = 0; i < requests.length; i++) {
      if (!requests[i].title.trim() || !requests[i].description.trim() || !requests[i].businessJustification.trim()) {
        alert(`Completa el título, descripción y justificación de la Solicitud #${i + 1}.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const selectedProj = projects.find((p) => p.id === selectedProjectId);

      for (const req of requests) {
        await api.createFeatureRequest({
          clientCompanyId: currentUser?.clientCompanyId || 'client-sanjose',
          developerCompanyId: selectedProj?.developerCompanyId || 'dev-pachax-core',
          projectId: selectedProjectId,
          projectName: selectedProj?.name,
          title: req.title,
          description: req.description,
          businessJustification: req.businessJustification,
          isConsideredFreeByClient: req.isConsideredFreeByClient,
          freeRationale: req.freeRationale,
          changeScope: req.changeScope,
          annotatedImageUrl: req.annotatedImageUrl,
          reportedBy: {
            uid: currentUser?.uid || 'user-unknown',
            displayName: currentUser?.displayName || 'Usuario',
            email: currentUser?.email || '',
          },
        });
      }

      setSubmitted(true);
      setTimeout(() => {
        navigate('/client/history');
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Error al enviar las solicitudes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-lg animate-in zoom-in-95">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Solicitudes Recibidas
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          El equipo técnico y comercial evaluará el alcance y emitirá la cotización o confirmación de garantía según corresponda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Solicitud de Implementaciones y Cambios
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Propón nuevas características, exportaciones personalizadas o modificaciones a tu sistema.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Proyecto / Software Destino *
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

        {/* Requests container */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>Solicitudes ({requests.length})</span>
            </h2>
            <button
              type="button"
              onClick={handleAddRequest}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900 rounded-lg transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Agregar solicitud</span>
            </button>
          </div>

          {requests.map((req, index) => (
            <div
              key={req.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Solicitud #{index + 1}
                </span>

                {requests.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRequest(index)}
                    className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar solicitud</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Título de la función o mejora solicitada *
                  </label>
                  <input
                    type="text"
                    required
                    value={req.title}
                    onChange={(e) => handleUpdateRequest(index, 'title', e.target.value)}
                    placeholder="Ej. Exportación de libro de ventas a Excel con filtros avanzados"
                    className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Alcance del Cambio
                  </label>
                  <select
                    value={req.changeScope}
                    onChange={(e) => handleUpdateRequest(index, 'changeScope', e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="client_specific">Exclusivo para mi empresa</option>
                    <option value="template">Ajuste de plantilla</option>
                    <option value="core">Mejora general del núcleo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descripción Detallada del Cambio *
                </label>
                <textarea
                  required
                  rows={3}
                  value={req.description}
                  onChange={(e) => handleUpdateRequest(index, 'description', e.target.value)}
                  placeholder="Describe cómo visualizas la nueva función, qué campos debe incluir y cómo debe comportarse..."
                  className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Justificación de Negocio / Valor Operativo *
                </label>
                <textarea
                  required
                  rows={2}
                  value={req.businessJustification}
                  onChange={(e) => handleUpdateRequest(index, 'businessJustification', e.target.value)}
                  placeholder="¿Por qué es importante este cambio? (Ej. Permite ahorrar 3 horas de cuadre al mes)..."
                  className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              {/* Free-of-charge consideration toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={req.isConsideredFreeByClient}
                    onChange={(e) => handleUpdateRequest(index, 'isConsideredFreeByClient', e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-600"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Considero que esta solicitud debería ser gratuita / incluida en garantía
                  </span>
                </label>

                {req.isConsideredFreeByClient && (
                  <div className="pt-2 pl-6 animate-in fade-in duration-150">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Justificación de gratuidad o garantía:
                    </label>
                    <input
                      type="text"
                      value={req.freeRationale || ''}
                      onChange={(e) => handleUpdateRequest(index, 'freeRationale', e.target.value)}
                      placeholder="Ej. Forma parte de la entrega del sprint pasado o corrige una omisión de diseño"
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Mockup / Annotated Reference Image */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Boceto, Ejemplo o Captura con Anotaciones (Opcional)
                </label>

                {req.annotatedImageUrl ? (
                  <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                    <img
                      src={req.annotatedImageUrl}
                      alt="Boceto"
                      className="max-h-24 rounded border object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateRequest(index, 'annotatedImageUrl', undefined)}
                      className="text-xs text-rose-500 hover:underline"
                    >
                      Quitar Imagen
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 transition">
                    <Upload className="w-3.5 h-3.5 text-brand-500" />
                    <span>Subir Boceto o Captura Referencial</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(index, e)}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddRequest}
            className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 flex items-center justify-center gap-2 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Agregar otra solicitud a este envío</span>
          </button>
        </div>

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
            <span>{isSubmitting ? 'Enviando...' : `Enviar (${requests.length} Solicitudes)`}</span>
          </button>
        </div>
      </form>

      {/* Image Annotation Editor Modal */}
      {activeEditorIndex !== null && editorInitialImage && (
        <ImageAnnotationEditor
          initialImage={editorInitialImage}
          title={`Anotar Boceto — Solicitud #${activeEditorIndex + 1}`}
          onSave={(annotated) => {
            handleUpdateRequest(activeEditorIndex, 'annotatedImageUrl', annotated);
            setActiveEditorIndex(null);
            setEditorInitialImage(null);
          }}
          onCancel={() => {
            setActiveEditorIndex(null);
            setEditorInitialImage(null);
          }}
        />
      )}
    </div>
  );
};
