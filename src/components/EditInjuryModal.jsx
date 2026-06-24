import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { X, Save, Trash2, Calendar } from "lucide-react";

export default function EditInjuryModal({ player, injury, onClose }) {
  const [tipoLesion, setTipoLesion] = useState(injury.tipoLesion || "");
  const [fechaBaja, setFechaBaja] = useState(injury.fechaBaja || "");
  const [fechaAlta, setFechaAlta] = useState(injury.fechaAlta || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [loading, onClose]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!tipoLesion.trim()) {
      setError("El tipo de lesión no puede estar vacío.");
      return;
    }
    if (!fechaBaja) {
      setError("Selecciona la fecha de baja.");
      return;
    }
    if (!fechaAlta) {
      setError("Selecciona la fecha de alta.");
      return;
    }

    const start = new Date(fechaBaja);
    const end = new Date(fechaAlta);
    if (end < start) {
      setError("La fecha de alta no puede ser anterior a la de baja.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const diffTime = end - start;
      const duracion = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const updatedHistorial = player.historialLesiones.map((item) => {
        if (item.id === injury.id) {
          return {
            ...item,
            tipoLesion: tipoLesion.trim(),
            fechaBaja,
            fechaAlta,
            duracion
          };
        }
        return item;
      });

      await updateDoc(doc(db, "jugadores", player.id), {
        historialLesiones: updatedHistorial
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Error al guardar cambios. Comprueba tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const updatedHistorial = player.historialLesiones.filter(
        (item) => item.id !== injury.id
      );

      await updateDoc(doc(db, "jugadores", player.id), {
        historialLesiones: updatedHistorial
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Error al eliminar la lesión. Comprueba tu conexión.");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="w-full max-w-md bg-slate-800 border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/60 bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 rounded-xl">
              <Calendar className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white leading-tight">
                Editar Lesión
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {player.nombre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-semibold">
              ⚠️ {error}
            </div>
          )}

          {showDeleteConfirm && (
            <div className="p-4 bg-red-955/60 border border-red-500/30 rounded-2xl space-y-3 text-left animate-in slide-in-from-top-2 duration-200">
              <span className="block text-xs font-black text-red-400 uppercase tracking-wide">⚠️ ¿Confirmar eliminación?</span>
              <p className="text-[11px] text-slate-300 leading-normal">
                Esta acción eliminará de forma permanente esta lesión de {injury.tipoLesion} del historial de {player.nombre}. No se puede deshacer.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-extrabold rounded-lg hover:bg-slate-850 cursor-pointer active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-lg shadow-md cursor-pointer active:scale-95 transition-all"
                >
                  Sí, Eliminar
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tipo de Lesión
            </label>
            <input
              type="text"
              value={tipoLesion}
              onChange={(e) => setTipoLesion(e.target.value)}
              disabled={loading || showDeleteConfirm}
              placeholder="Ej. Esguince de tobillo, Sobrecarga"
              className="w-full bg-slate-900 border border-slate-700/60 text-white rounded-xl px-4 py-3 text-xs outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Fecha de Baja
              </label>
              <input
                type="date"
                value={fechaBaja}
                onChange={(e) => setFechaBaja(e.target.value)}
                disabled={loading || showDeleteConfirm}
                className="w-full bg-slate-900 border border-slate-700/60 text-white rounded-xl px-4 py-3 text-xs outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Fecha de Alta
              </label>
              <input
                type="date"
                value={fechaAlta}
                onChange={(e) => setFechaAlta(e.target.value)}
                disabled={loading || showDeleteConfirm}
                className="w-full bg-slate-900 border border-slate-700/60 text-white rounded-xl px-4 py-3 text-xs outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-700/40 gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || showDeleteConfirm}
              className="bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 text-red-400 font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading || showDeleteConfirm}
                className="bg-slate-900 border border-slate-800 text-slate-355 font-extrabold text-xs py-3 px-4 rounded-xl cursor-pointer hover:bg-slate-850 active:scale-95 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || showDeleteConfirm}
                className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
