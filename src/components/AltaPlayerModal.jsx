import React, { useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { X, Check, Calendar } from "lucide-react";

export default function AltaPlayerModal({ player, onClose, onDischarged }) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [altaDate, setAltaDate] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAlta = async (e) => {
    e.preventDefault();
    if (!altaDate) {
      setError("Por favor selecciona la fecha de alta.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const baja = player.fechaBaja || todayStr;
      const diffTime = new Date(altaDate) - new Date(baja);
      const duracion = diffTime >= 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

      const archiveEntry = {
        id: Date.now().toString(),
        tipoLesion: player.tipoLesion || "Molestias físicas",
        fechaBaja: baja,
        fechaAlta: altaDate,
        duracion: duracion
      };

      const currentHistorial = player.historialLesiones || [];
      const playerRef = doc(db, "jugadores", player.id);

      await updateDoc(playerRef, {
        lesionado: false,
        tipoLesion: "",
        fechaBaja: "",
        fechaRecuperacion: "",
        historialLesiones: [...currentHistorial, archiveEntry]
      });

      if (onDischarged) onDischarged();
      onClose();
    } catch (err) {
      console.error("Error al registrar alta del jugador:", err);
      setError("Error al guardar en el historial.");
    } finally {
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
      <div className="w-full max-w-sm bg-slate-800 border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/60 bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white leading-tight">
                Dar de Alta Médica
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
        <form onSubmit={handleAlta} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-semibold">
              ⚠️ {error}
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Confirmar Fecha de Alta
            </label>
            <input
              type="date"
              value={altaDate}
              onChange={(e) => setAltaDate(e.target.value)}
              disabled={loading}
              className="w-full bg-slate-900 border border-slate-700/60 text-white rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/40">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="bg-slate-900 border border-slate-800 text-slate-355 font-extrabold text-xs py-3 px-4 rounded-xl cursor-pointer hover:bg-slate-850 active:scale-95 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Confirmar Alta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
