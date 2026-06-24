import React, { useState, useMemo } from "react";
import { db } from "../firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { X, Check, ChevronDown, User, Shield, ArrowLeftRight, ClipboardList, Award, Activity } from "lucide-react";

// ─────────────────────────────────────────────
// FORMACIONES DISPONIBLES
// Cada slot tiene: id, label (abreviatura), top%, left%
// ─────────────────────────────────────────────
const FORMACIONES = {
  "4-3-3": {
    label: "4-3-3",
    slots: [
      { id: "POR", label: "POR", top: 88, left: 50 },
      { id: "LD",  label: "LD",  top: 72, left: 82 },
      { id: "DCH", label: "DCD", top: 72, left: 62 },
      { id: "DCI", label: "DCI", top: 72, left: 38 },
      { id: "LI",  label: "LI",  top: 72, left: 18 },
      { id: "MC",  label: "MC",  top: 52, left: 50 },
      { id: "MCD", label: "MCD", top: 52, left: 70 },
      { id: "MCI", label: "MCI", top: 52, left: 30 },
      { id: "ED",  label: "ED",  top: 28, left: 80 },
      { id: "DC",  label: "DC",  top: 22, left: 50 },
      { id: "EI",  label: "EI",  top: 28, left: 20 },
    ],
  },
  "4-4-2": {
    label: "4-4-2",
    slots: [
      { id: "POR", label: "POR", top: 88, left: 50 },
      { id: "LD",  label: "LD",  top: 72, left: 82 },
      { id: "DCH", label: "DCD", top: 72, left: 62 },
      { id: "DCI", label: "DCI", top: 72, left: 38 },
      { id: "LI",  label: "LI",  top: 72, left: 18 },
      { id: "EXD", label: "EXD", top: 50, left: 82 },
      { id: "MCD", label: "MCD", top: 50, left: 62 },
      { id: "MCI", label: "MCI", top: 50, left: 38 },
      { id: "EXI", label: "EXI", top: 50, left: 18 },
      { id: "DCD", label: "DC D",top: 24, left: 62 },
      { id: "DCI2",label: "DC I",top: 24, left: 38 },
    ],
  },
  "4-2-3-1": {
    label: "4-2-3-1",
    slots: [
      { id: "POR", label: "POR", top: 88, left: 50 },
      { id: "LD",  label: "LD",  top: 73, left: 82 },
      { id: "DCH", label: "DCD", top: 73, left: 62 },
      { id: "DCI", label: "DCI", top: 73, left: 38 },
      { id: "LI",  label: "LI",  top: 73, left: 18 },
      { id: "MDV1",label: "MDV", top: 58, left: 62 },
      { id: "MDV2",label: "MDV", top: 58, left: 38 },
      { id: "EXD", label: "EXD", top: 38, left: 80 },
      { id: "MAM", label: "MAM", top: 36, left: 50 },
      { id: "EXI", label: "EXI", top: 38, left: 20 },
      { id: "DC",  label: "DC",  top: 18, left: 50 },
    ],
  },
  "3-5-2": {
    label: "3-5-2",
    slots: [
      { id: "POR", label: "POR", top: 88, left: 50 },
      { id: "DCD", label: "DCD", top: 73, left: 70 },
      { id: "DCC", label: "DCC", top: 73, left: 50 },
      { id: "DCI", label: "DCI", top: 73, left: 30 },
      { id: "CRD", label: "CRD", top: 52, left: 88 },
      { id: "MCD", label: "MCD", top: 52, left: 68 },
      { id: "MCC", label: "MCC", top: 50, left: 50 },
      { id: "MCI", label: "MCI", top: 52, left: 32 },
      { id: "CRI", label: "CRI", top: 52, left: 12 },
      { id: "DCD2",label: "DC D",top: 24, left: 65 },
      { id: "DCI2",label: "DC I",top: 24, left: 35 },
    ],
  },
};

// ─────────────────────────────────────────────
// MODAL DE ESTADÍSTICAS DE UN JUGADOR EN EL PARTIDO
// ─────────────────────────────────────────────
function ModalJugadorActa({ jugador, stats, jugadoresPlantilla, onSave, onClose, onRemove }) {
  const [minutos, setMinutos] = useState(stats.minutos ?? 90);
  const [goles, setGoles] = useState(stats.goles ?? 0);
  const [golesContra, setGolesContra] = useState(stats.golesContra ?? 0);
  const [asistencias, setAsistencias] = useState(stats.asistencias ?? 0);
  const [amarillas, setAmarillas] = useState(stats.amarillas ?? 0);
  const [rojas, setRojas] = useState(stats.rojas ?? 0);
  const [convocado, setConvocado] = useState(stats.convocado ?? true);
  const [sustituido, setSustituido] = useState(stats.sustituido ?? false);
  const [minCambio, setMinCambio] = useState(stats.minCambio ?? "");
  const [sustituidoPorId, setSustituidoPorId] = useState(stats.sustituidoPorId ?? "");

  const handleSave = () => {
    onSave({
      minutos: parseInt(minutos) || 0,
      goles: parseInt(goles) || 0,
      golesContra: parseInt(golesContra) || 0,
      asistencias: parseInt(asistencias) || 0,
      amarillas: parseInt(amarillas) || 0,
      rojas: parseInt(rojas) || 0,
      convocado,
      sustituido,
      minCambio: sustituido ? (parseInt(minCambio) || 0) : null,
      sustituidoPorId: sustituido ? sustituidoPorId : null,
    });
  };

  const esPortero = jugador?.isPortero || jugador?.posicion === "Portero";

  return (
    <div className="fixed inset-0 z-50 bg-slate-955/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            {jugador?.fotoUrl ? (
              <img src={jugador.fotoUrl} alt={jugador.nombre} className="w-12 h-12 rounded-full object-cover border-2 border-camarma-blue bg-slate-950 shadow-md" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-850 flex items-center justify-center border border-slate-800 shadow-md">
                <User className="w-6 h-6 text-slate-400" />
              </div>
            )}
            <div>
              <h4 className="font-black text-white text-base leading-tight font-sans">{jugador?.nombre}</h4>
              <span className="inline-block text-[9px] font-black uppercase text-camarma-gold tracking-widest mt-0.5">
                {jugador?.posicion || "Jugador"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del formulario scrollable */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 font-sans">
          
          {/* Convocado / Convocatoria Switch */}
          <div className="flex items-center justify-between bg-slate-950/40 border border-slate-850/60 p-3.5 rounded-2xl">
            <div>
              <span className="text-sm font-bold text-white block">Convocatoria</span>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Indica si el jugador asistió al encuentro</span>
            </div>
            <button
              onClick={() => setConvocado(!convocado)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer select-none ${convocado ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-400" : "bg-slate-850 border-slate-800 text-slate-400"}`}
            >
              {convocado ? "✔️ Convocado" : "❌ No Convocado"}
            </button>
          </div>

          {/* Minutos jugados */}
          <div className="space-y-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">⏱️ Minutos Jugados</label>
            <div className="flex items-center gap-3 bg-slate-950/20 p-2 border border-slate-850 rounded-2xl">
              <button
                onClick={() => setMinutos(Math.max(0, minutos - 5))}
                className="w-11 h-11 bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-white font-extrabold text-lg rounded-xl transition-all active:scale-90 cursor-pointer border border-slate-800"
              >
                -
              </button>
              <input
                type="number"
                value={minutos}
                onChange={(e) => setMinutos(Math.min(120, Math.max(0, parseInt(e.target.value) || 0)))}
                className="flex-1 bg-slate-950 border border-slate-850 text-white text-center text-xl font-bold rounded-xl py-2 outline-none focus:border-camarma-blue font-mono"
              />
              <button
                onClick={() => setMinutos(Math.min(120, minutos + 5))}
                className="w-11 h-11 bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-white font-extrabold text-lg rounded-xl transition-all active:scale-90 cursor-pointer border border-slate-800"
              >
                +
              </button>
            </div>
            <div className="flex gap-2">
              {[45, 60, 90].map(m => (
                <button
                  key={m}
                  onClick={() => setMinutos(m)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${minutos === m ? "bg-camarma-blue border-camarma-blue text-white shadow-sm" : "bg-slate-850 border-slate-800 text-slate-400 hover:text-white"}`}
                >
                  {m}'
                </button>
              ))}
            </div>
          </div>

          {/* Goles Favor / Contra / Asistencias */}
          <div className="space-y-4 pt-2 border-t border-slate-850/60">
            {!esPortero ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Goles */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">⚽ Goles</label>
                  <div className="flex items-center gap-2 bg-slate-950/20 p-1.5 border border-slate-850 rounded-2xl">
                    <button
                      onClick={() => setGoles(Math.max(0, goles - 1))}
                      className="w-9 h-9 bg-red-950/30 text-red-400 border border-red-900/20 rounded-lg text-lg font-black active:scale-90 cursor-pointer flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center text-xl font-mono font-black text-white">{goles}</span>
                    <button
                      onClick={() => setGoles(goles + 1)}
                      className="w-9 h-9 bg-emerald-950/30 text-emerald-400 border border-emerald-900/20 rounded-lg text-lg font-black active:scale-90 cursor-pointer flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Asistencias */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">👟 Asistencias</label>
                  <div className="flex items-center gap-2 bg-slate-950/20 p-1.5 border border-slate-850 rounded-2xl">
                    <button
                      onClick={() => setAsistencias(Math.max(0, asistencias - 1))}
                      className="w-9 h-9 bg-red-950/30 text-red-400 border border-red-900/20 rounded-lg text-lg font-black active:scale-90 cursor-pointer flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center text-xl font-mono font-black text-white">{asistencias}</span>
                    <button
                      onClick={() => setAsistencias(asistencias + 1)}
                      className="w-9 h-9 bg-emerald-950/30 text-emerald-400 border border-emerald-900/20 rounded-lg text-lg font-black active:scale-90 cursor-pointer flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Goles Contra para Portero */
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">🥅 Goles Recibidos</label>
                <div className="flex items-center gap-3 bg-slate-950/20 p-2 border border-slate-850 rounded-2xl">
                  <button
                    onClick={() => setGolesContra(Math.max(0, golesContra - 1))}
                    className="w-11 h-11 bg-red-955/40 text-red-400 border border-red-900/20 rounded-xl text-xl font-black active:scale-90 cursor-pointer flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center text-2xl font-mono font-black text-white">{golesContra}</span>
                  <button
                    onClick={() => setGolesContra(golesContra + 1)}
                    className="w-11 h-11 bg-emerald-955/40 text-emerald-400 border border-emerald-900/20 rounded-xl text-xl font-black active:scale-90 cursor-pointer flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tarjetas */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-850/60">
            {/* Amarillas */}
            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">🟨 Amarillas</label>
              <div className="flex items-center gap-2 bg-slate-950/20 p-1.5 border border-slate-850 rounded-2xl">
                <button
                  onClick={() => setAmarillas(Math.max(0, amarillas - 1))}
                  className="w-9 h-9 bg-slate-850 hover:bg-slate-800 text-slate-350 rounded-lg text-lg font-black active:scale-90 cursor-pointer flex items-center justify-center border border-slate-800"
                >
                  -
                </button>
                <span className="flex-1 text-center text-lg font-mono font-black text-yellow-400">{amarillas}</span>
                <button
                  onClick={() => setAmarillas(amarillas + 1)}
                  className="w-9 h-9 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg text-lg font-black active:scale-90 cursor-pointer flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Rojas */}
            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">🟥 Rojas</label>
              <div className="flex items-center gap-2 bg-slate-950/20 p-1.5 border border-slate-850 rounded-2xl">
                <button
                  onClick={() => setRojas(Math.max(0, rojas - 1))}
                  className="w-9 h-9 bg-slate-850 hover:bg-slate-800 text-slate-350 rounded-lg text-lg font-black active:scale-90 cursor-pointer flex items-center justify-center border border-slate-800"
                >
                  -
                </button>
                <span className="flex-1 text-center text-lg font-mono font-black text-red-500">{rojas}</span>
                <button
                  onClick={() => setRojas(rojas + 1)}
                  className="w-9 h-9 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-lg font-black active:scale-90 cursor-pointer flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Sustitución */}
          <div className="space-y-4 border-t border-slate-850/60 pt-4">
            <div className="flex items-center justify-between bg-slate-950/20 p-3 rounded-2xl border border-slate-850/50">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2 select-none">
                <ArrowLeftRight className="w-4 h-4 text-orange-400" /> ¿Fue sustituido?
              </span>
              <button
                onClick={() => setSustituido(!sustituido)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none ${sustituido ? "bg-orange-600/20 border-orange-500/35 text-orange-400" : "bg-slate-850 border-slate-800 text-slate-400"}`}
              >
                {sustituido ? "🔄 Sí" : "No"}
              </button>
            </div>
            
            {sustituido && (
              <div className="space-y-3 bg-slate-950/40 p-4 border border-slate-850 rounded-2xl animate-in fade-in duration-200">
                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="text-xs font-bold text-slate-400 col-span-1">Minuto</label>
                  <input
                    type="number"
                    value={minCambio}
                    onChange={(e) => setMinCambio(e.target.value)}
                    placeholder="Ej. 65"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-camarma-blue font-mono col-span-2"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="text-xs font-bold text-slate-400 col-span-1">Entra</label>
                  <div className="relative col-span-2">
                    <select
                      value={sustituidoPorId}
                      onChange={(e) => setSustituidoPorId(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none appearance-none cursor-pointer focus:border-camarma-blue"
                    >
                      <option value="">-- Selecciona --</option>
                      {jugadoresPlantilla.map(j => (
                        <option key={j.id} value={j.id}>{j.nombre}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer / Guardar */}
        <div className="bg-slate-955/40 p-4 border-t border-slate-850 flex flex-col gap-2">
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black py-4 rounded-2xl text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer select-none uppercase tracking-wider"
          >
            <Check className="w-4.5 h-4.5" />
            Confirmar Datos
          </button>
          
          {onRemove && (
            <button
              onClick={onRemove}
              className="w-full flex items-center justify-center gap-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-dashed border-red-900/40 py-3 rounded-2xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer select-none uppercase tracking-wider"
            >
              <X className="w-4 h-4 text-red-400" />
              Quitar de Titulares
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CAMPO DE FÚTBOL CON POSICIONES
// ─────────────────────────────────────────────
function SlotJugador({ slot, jugadorAsignado, onClick }) {
  const isPortero = slot.id === "POR";
  return (
    <div
      className="absolute flex flex-col items-center gap-1.5 cursor-pointer group select-none transition-all duration-300"
      style={{
        top: `${slot.top}%`,
        left: `${slot.left}%`,
        transform: "translate(-50%, -50%)",
        minWidth: "68px",
      }}
      onClick={() => onClick(slot.id)}
    >
      {/* Foto o avatar vacío */}
      <div className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105 group-active:scale-95
        ${jugadorAsignado 
          ? (isPortero 
            ? "border-amber-500 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.25)]" 
            : "border-camarma-blue bg-camarma-blue/10 shadow-[0_0_12px_rgba(30,144,255,0.25)]") 
          : "border-white/10 bg-slate-950/50 border-dashed hover:border-white/30 hover:bg-slate-900/60"}`}>
        {jugadorAsignado?.fotoUrl ? (
          <img src={jugadorAsignado.fotoUrl} alt={jugadorAsignado.nombre} className="w-full h-full object-cover" />
        ) : (
          <User className={`w-5 h-5 sm:w-6 sm:h-6 ${jugadorAsignado ? "text-white" : "text-white/20 group-hover:text-white/40 transition-colors"}`} />
        )}
        {/* Indicador de más si está vacío */}
        {!jugadorAsignado && (
          <span className="absolute inset-0 flex items-center justify-center text-white/0 group-hover:text-white/45 text-xl font-bold transition-all bg-black/0 group-hover:bg-slate-900/30">
            +
          </span>
        )}
      </div>

      {/* Nombre corto */}
      <span className={`text-[9px] sm:text-[10px] font-black leading-tight text-center rounded-lg px-2 py-0.5 max-w-[66px] sm:max-w-[76px] truncate border shadow-md transition-all duration-300
        ${jugadorAsignado 
          ? "text-white bg-slate-950/90 border-slate-800/80" 
          : "text-slate-400 bg-slate-950/40 border-white/5 group-hover:text-white group-hover:border-white/20"}`}>
        {jugadorAsignado ? jugadorAsignado.nombre.split(" ").slice(-1)[0] : slot.label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL: ACTA DE PARTIDO
// ─────────────────────────────────────────────
export default function ActaPartido({ match, jugadores, onClose }) {
  const [formacion, setFormacion] = useState(match.alineacion?.formacion ?? "4-3-3");
  const [asignaciones, setAsignaciones] = useState(match.alineacion?.asignaciones ?? {});
  const [suplentes, setSuplentes] = useState(match.alineacion?.suplentes ?? []);
  const [statsJugadores, setStatsJugadores] = useState(match.statsJugadores ?? {});
  const [cronica, setCronica] = useState(match.cronica ?? "");
  const [mvpJugadorId, setMvpJugadorId] = useState(match.mvpJugadorId ?? "");
  const [modalSlot, setModalSlot] = useState(null); // slotId o "suplente_{id}"
  const [selectorSlot, setSelectorSlot] = useState(null); // slotId que está eligiendo jugador
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");

  const slots = FORMACIONES[formacion].slots;

  // IDs ya asignados (para evitar duplicados)
  const asignadosIds = useMemo(() => {
    return new Set([...Object.values(asignaciones).filter(Boolean), ...suplentes]);
  }, [asignaciones, suplentes]);

  // Jugadores libres (no asignados aún)
  const jugadoresLibres = jugadores.filter(j => !asignadosIds.has(j.id));

  const getJugador = (id) => jugadores.find(j => j.id === id);

  // Al hacer click en un slot del campo:
  const handleSlotClick = (slotId) => {
    if (asignaciones[slotId]) {
      setModalSlot(slotId);
    } else {
      setSelectorSlot(slotId);
    }
  };

  const asignarJugador = (slotId, jugadorId) => {
    setAsignaciones(prev => ({ ...prev, [slotId]: jugadorId }));
    if (!statsJugadores[jugadorId]) {
      setStatsJugadores(prev => ({ ...prev, [jugadorId]: { minutos: 90, goles: 0, golesContra: 0, asistencias: 0, amarillas: 0, rojas: 0, convocado: true } }));
    }
    setSelectorSlot(null);
  };

  const desasignarSlot = (slotId) => {
    setAsignaciones(prev => {
      const newA = { ...prev };
      delete newA[slotId];
      return newA;
    });
  };

  const addSuplente = (jugadorId) => {
    setSuplentes(prev => [...prev, jugadorId]);
    if (!statsJugadores[jugadorId]) {
      setStatsJugadores(prev => ({ ...prev, [jugadorId]: { minutos: 0, goles: 0, golesContra: 0, asistencias: 0, amarillas: 0, rojas: 0, convocado: true } }));
    }
    setSelectorSlot(null);
  };

  const removeSuplente = (jugadorId) => {
    setSuplentes(prev => prev.filter(id => id !== jugadorId));
  };

  const guardarStats = (jugadorId, newStats) => {
    setStatsJugadores(prev => ({ ...prev, [jugadorId]: newStats }));
    setModalSlot(null);
  };

  const jugadorIdModal = modalSlot
    ? (modalSlot.startsWith("suplente_") ? modalSlot.replace("suplente_", "") : asignaciones[modalSlot])
    : null;

  // Confirmar el Acta
  const confirmarActa = async () => {
    setGuardando(true);
    setError("");
    try {
      const oldStats = match.statsJugadores || {};
      const newStats = statsJugadores;
      const oldMvpId = match.mvpJugadorId || "";
      const newMvpId = mvpJugadorId || "";

      const todosLosJugadoresIds = new Set([
        ...Object.values(asignaciones).filter(Boolean),
        ...suplentes,
        ...Object.keys(oldStats)
      ]);

      for (const jugadorId of todosLosJugadoresIds) {
        const playerRef = doc(db, "jugadores", jugadorId);
        const playerOld = oldStats[jugadorId] || { minutos: 0, goles: 0, golesContra: 0, asistencias: 0, amarillas: 0, rojas: 0, convocado: false };
        const playerNew = newStats[jugadorId];

        const updates = {};

        if (playerNew) {
          const diffMinutos = (playerNew.minutos || 0) - (playerOld.minutos || 0);
          const diffGoles = (playerNew.goles || 0) - (playerOld.goles || 0);
          const diffGolesContra = (playerNew.golesContra || 0) - (playerOld.golesContra || 0);
          const diffAsistencias = (playerNew.asistencias || 0) - (playerOld.asistencias || 0);
          const diffAmarillas = (playerNew.amarillas || 0) - (playerOld.amarillas || 0);
          const diffRojas = (playerNew.rojas || 0) - (playerOld.rojas || 0);
          const diffConvocado = (playerNew.convocado ? 1 : 0) - (playerOld.convocado ? 1 : 0);

          if (diffMinutos !== 0) updates.minutosJugados = increment(diffMinutos);
          if (diffGoles !== 0) updates.golesFavor = increment(diffGoles);
          if (diffGolesContra !== 0) updates.golesContra = increment(diffGolesContra);
          if (diffAsistencias !== 0) updates.asistencias = increment(diffAsistencias);
          if (diffAmarillas !== 0) updates.tarjetasAmarillas = increment(diffAmarillas);
          if (diffRojas !== 0) updates.tarjetasRojas = increment(diffRojas);
          if (diffConvocado !== 0) updates.partidosConvocados = increment(diffConvocado);
        } else {
          if (playerOld.minutos > 0) updates.minutosJugados = increment(-playerOld.minutos);
          if (playerOld.goles > 0) updates.golesFavor = increment(-playerOld.goles);
          if (playerOld.golesContra > 0) updates.golesContra = increment(-playerOld.golesContra);
          if (playerOld.asistencias > 0) updates.asistencias = increment(-playerOld.asistencias);
          if (playerOld.amarillas > 0) updates.tarjetasAmarillas = increment(-playerOld.amarillas);
          if (playerOld.rojas > 0) updates.tarjetasRojas = increment(-playerOld.rojas);
          if (playerOld.convocado) updates.partidosConvocados = increment(-1);
        }

        let diffMvp = 0;
        if (oldMvpId === jugadorId && newMvpId !== jugadorId) {
          diffMvp = -1;
        } else if (oldMvpId !== jugadorId && newMvpId === jugadorId) {
          diffMvp = 1;
        }
        if (diffMvp !== 0) {
          updates.mvps = increment(diffMvp);
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(playerRef, updates);
        }
      }

      const matchRef = doc(db, "partidos", match.id);
      await updateDoc(matchRef, {
        actaGuardada: true,
        cronica: cronica.trim(),
        mvpJugadorId: newMvpId || null,
        alineacion: {
          formacion,
          asignaciones,
          suplentes
        },
        statsJugadores: newStats,
        jugado: true
      });

      setGuardado(true);
    } catch (err) {
      console.error(err);
      setError("Error al guardar el acta. Comprueba tu conexión.");
    } finally {
      setGuardando(false);
    }
  };

  const exportMatchToPDF = () => {
    const getPositionPriority = (pos) => {
      const p = (pos || "").toLowerCase();
      if (p.includes("portero") || p.includes("por")) return 1;
      if (p.includes("defensa") || p.includes("lateral") || p.includes("central") || p.includes("ld") || p.includes("li") || p.includes("dcd") || p.includes("dci")) return 2;
      if (p.includes("medio") || p.includes("centro") || p.includes("volante") || p.includes("mc") || p.includes("mcd") || p.includes("mci") || p.includes("mdv") || p.includes("mam")) return 3;
      if (p.includes("delantero") || p.includes("extremo") || p.includes("punta") || p.includes("dc") || p.includes("ed") || p.includes("ei") || p.includes("exd") || p.includes("exi")) return 4;
      return 5;
    };

    const titularesIds = Object.values(asignaciones).filter(Boolean);
    const suplentesIds = suplentes || [];

    const getPlayerWithStats = (id, esTitular) => {
      const p = jugadores.find(j => j.id === id);
      const stats = statsJugadores[id] || { minutos: 0, goles: 0, golesContra: 0, asistencias: 0, amarillas: 0, rojas: 0, convocado: false };
      return {
        nombre: p ? p.nombre : "Jugador",
        posicion: p ? (p.posicion || (p.isPortero ? "Portero" : "Jugador")) : "N/A",
        prioridad: getPositionPriority(p ? p.posicion : ""),
        minutos: stats.minutos || 0,
        goles: stats.goles || 0,
        golesContra: stats.golesContra || 0,
        asistencias: stats.asistencias || 0,
        amarillas: stats.amarillas || 0,
        rojas: stats.rojas || 0,
        convocado: stats.convocado ? "Sí" : "No",
        tipo: esTitular ? "Titular" : "Suplente",
        isPortero: p ? (p.isPortero || p.posicion === "Portero") : false
      };
    };

    const titularesSorted = titularesIds
      .map(id => getPlayerWithStats(id, true))
      .sort((a, b) => a.prioridad - b.prioridad);

    const suplentesSorted = suplentesIds
      .map(id => getPlayerWithStats(id, false))
      .sort((a, b) => a.prioridad - b.prioridad);

    const allPlayersReport = [...titularesSorted, ...suplentesSorted];

    const rowsHtml = allPlayersReport.map(r => `
      <tr>
        <td><strong>${r.nombre}</strong></td>
        <td class="text-slate-500">${r.posicion}</td>
        <td class="text-center font-bold">${r.tipo}</td>
        <td class="text-center">${r.minutos}'</td>
        <td class="text-center font-semibold text-emerald-600">${r.isPortero ? `${r.golesContra} (Recibidos)` : (r.goles > 0 ? `⚽ ${r.goles}` : "-")}</td>
        <td class="text-center">${r.asistencias > 0 ? `👟 ${r.asistencias}` : "-"}</td>
        <td class="text-center">${r.amarillas > 0 ? Array.from({ length: r.amarillas }).map(() => "🟨").join("") : ""}</td>
        <td class="text-center">${r.rojas > 0 ? "🟥" : ""}</td>
      </tr>
    `).join("");

    const mvpPlayer = jugadores.find(j => j.id === mvpJugadorId);

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Acta de Partido - Camarma CF</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              padding: 40px;
              line-height: 1.6;
            }
            .header {
              border-bottom: 3px solid #0f172a;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 28px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: -0.5px;
              margin: 0;
              color: #0f172a;
            }
            .subtitle {
              font-size: 16px;
              font-weight: 600;
              color: #475569;
              margin: 5px 0 0 0;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
              background-color: #f8fafc;
              padding: 20px;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
            }
            .meta-item strong {
              color: #0f172a;
            }
            .section-title {
              font-size: 18px;
              font-weight: 800;
              text-transform: uppercase;
              margin-top: 30px;
              margin-bottom: 15px;
              color: #0f172a;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 8px;
            }
            .cronica {
              font-style: italic;
              color: #334155;
              background-color: #f1f5f9;
              padding: 15px 20px;
              border-left: 4px solid #3b82f6;
              border-radius: 4px;
              margin-bottom: 30px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th {
              background-color: #0f172a;
              color: white;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 12px;
              text-align: left;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 13px;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-slate-500 { color: #64748b; }
            .text-emerald-600 { color: #059669; }
            .mvp-box {
              background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%);
              border: 1px solid #fde68a;
              color: #92400e;
              padding: 15px 20px;
              border-radius: 8px;
              font-weight: 600;
              font-size: 14px;
              margin-bottom: 25px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Acta Oficial de Partido</h1>
            <div class="subtitle">Camarma CF • Temporada de Competición</div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <strong>Partido:</strong> ${match.condicion === "visitante" ? `${match.rival} vs Camarma CF` : `Camarma CF vs ${match.rival}`}<br/>
              <strong>Condición:</strong> ${match.condicion === "visitante" ? "✈️ Visitante" : "🏠 Local"}<br/>
              <strong>Fecha:</strong> ${new Date(match.fecha + "T00:00:00").toLocaleDateString("es-ES", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div class="meta-item">
              <strong>Resultado:</strong> ${match.condicion === "visitante" ? `${match.golesRival} - ${match.golesCamarma}` : `${match.golesCamarma} - ${match.golesRival}`}<br/>
              <strong>Formación táctica:</strong> ${formacion || "N/A"}<br/>
              <strong>Estado:</strong> Finalizado
            </div>
          </div>

          ${mvpPlayer ? `
            <div class="mvp-box">
              🌟 <strong>MVP del Encuentro:</strong> ${mvpPlayer.nombre} (${mvpPlayer.posicion || "Jugador"})
            </div>
          ` : ""}

          ${cronica ? `
            <div class="section-title">Crónica del Míster</div>
            <div class="cronica">
              "${cronica}"
            </div>
          ` : ""}

          <div class="section-title">Ficha Técnica e Informe de Rendimiento</div>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Posición</th>
                <th class="text-center">Rol</th>
                <th class="text-center">Minutos</th>
                <th class="text-center">Goles</th>
                <th class="text-center">Asistencias</th>
                <th class="text-center">Amarillas</th>
                <th class="text-center">Rojas</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-955 flex flex-col overflow-hidden">
      
      {/* Cabecera Principal */}
      <header className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between shrink-0 shadow-lg backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-camarma-blue/10 p-2 rounded-xl border border-camarma-blue/20">
            <ClipboardList className="w-5 h-5 text-camarma-gold" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white leading-tight uppercase font-sans tracking-wide">Acta del Partido</h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">
              {match.condicion === "visitante" ? `${match.rival} vs Camarma CF` : `Camarma CF vs ${match.rival}`} • {new Date(match.fecha + "T00:00:00").toLocaleDateString("es-ES", { day:"numeric", month:"long", year:"numeric" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportMatchToPDF}
            className="flex items-center gap-1.5 bg-gradient-to-r from-camarma-gold to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-slate-950 font-black text-[10px] sm:text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer border border-slate-700/80 active:scale-95 select-none uppercase tracking-wider shrink-0"
            title="Exportar acta a PDF"
          >
            📥 Exportar PDF
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 cursor-pointer border border-slate-800 transition-colors active:scale-95 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Cuerpo principal en malla responsiva */}
      <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* COLUMNA IZQUIERDA: Pizarra Táctica (6 Cols) */}
            <div className="lg:col-span-6 flex flex-col items-center gap-4 lg:sticky lg:top-6">
              <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 shadow-xl backdrop-blur-md flex flex-col items-center relative overflow-hidden">
                <div className="absolute top-0 w-full h-24 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none"></div>
                <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-widest mb-4 z-10 flex items-center gap-1.5">
                  🟢 PIZARRA TÁCTICA
                </span>
                
                {/* CAMPO DE FÚTBOL */}
                <div
                  className="relative w-full rounded-3xl overflow-hidden border-2 border-emerald-600/35 shadow-[0_20px_50px_rgba(0,0,0,0.65)] mx-auto"
                  style={{
                    background: "radial-gradient(circle at center, #1b4332 0%, #081c15 100%)",
                    aspectRatio: "2/3",
                    maxHeight: "690px",
                    maxWidth: "460px",
                  }}
                >
                  {/* Líneas del campo SVG */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ opacity: 0.35 }}>
                    <rect x="5" y="3" width="90" height="94" fill="none" stroke="white" strokeWidth="0.8" />
                    <line x1="5" y1="50" x2="95" y2="50" stroke="white" strokeWidth="0.6" />
                    <circle cx="50" cy="50" r="12" fill="none" stroke="white" strokeWidth="0.6" />
                    <circle cx="50" cy="50" r="1" fill="white" />
                    <rect x="20" y="78" width="60" height="19" fill="none" stroke="white" strokeWidth="0.6" />
                    <rect x="35" y="88" width="30" height="9" fill="none" stroke="white" strokeWidth="0.6" />
                    <rect x="20" y="3" width="60" height="19" fill="none" stroke="white" strokeWidth="0.6" />
                    <rect x="35" y="3" width="30" height="9" fill="none" stroke="white" strokeWidth="0.6" />
                    <rect x="42" y="95.5" width="16" height="4" fill="none" stroke="white" strokeWidth="0.6" />
                    <rect x="42" y="0.5" width="16" height="4" fill="none" stroke="white" strokeWidth="0.6" />
                    <circle cx="50" cy="85" r="0.7" fill="white" />
                    <circle cx="50" cy="15" r="0.7" fill="white" />
                  </svg>

                  {/* Slots de jugadores */}
                  {slots.map(slot => (
                    <SlotJugador
                      key={slot.id}
                      slot={slot}
                      jugadorAsignado={asignaciones[slot.id] ? getJugador(asignaciones[slot.id]) : null}
                      onClick={handleSlotClick}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: Configuración, Suplentes, Crónica y Guardado (6 Cols) */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Esquema Táctico Card */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 shadow-xl backdrop-blur-md space-y-4">
                <span className="text-[10px] font-extrabold uppercase text-camarma-gold tracking-widest block">
                  Sistema de Juego
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-sm font-black text-white uppercase font-sans">Selección de Formación</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(FORMACIONES).map(f => (
                      <button
                        key={f}
                        onClick={() => setFormacion(f)}
                        className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none border ${formacion === f ? "bg-camarma-blue border-camarma-blue text-white shadow-md shadow-camarma-blue/20" : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"}`}
                      >
                        {FORMACIONES[f].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Banquillo / Suplentes Card */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 shadow-xl backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Shield className="w-4.5 h-4.5 text-camarma-gold" />
                    Banquillo / Suplentes ({suplentes.length})
                  </h4>
                  <span className="text-[9px] text-slate-500 font-bold">Máximo 9</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {suplentes.map(supId => {
                    const jug = getJugador(supId);
                    if (!jug) return null;
                    return (
                      <div
                        key={supId}
                        className="flex items-center gap-2.5 bg-slate-950/60 border border-slate-850 hover:border-camarma-blue/40 rounded-2xl px-3 py-2 cursor-pointer hover:scale-[1.02] shadow-sm select-none transition-all group duration-300"
                        onClick={() => setModalSlot(`suplente_${supId}`)}
                      >
                        {jug.fotoUrl ? (
                          <img src={jug.fotoUrl} alt={jug.nombre} className="w-7 h-7 rounded-full object-cover border border-slate-850" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center border border-slate-750">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        )}
                        <span className="text-xs font-bold text-white group-hover:text-camarma-blue transition-colors">
                          {jug.nombre.split(" ").slice(-1)[0] || jug.nombre}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeSuplente(supId); }}
                          className="text-slate-500 hover:text-red-400 p-0.5 rounded-full hover:bg-slate-800 cursor-pointer transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  {suplentes.length < 9 && (
                    <button
                      onClick={() => setSelectorSlot("suplente")}
                      className="flex items-center gap-1.5 bg-slate-955/30 hover:bg-camarma-blue/15 border border-dashed border-slate-800 hover:border-camarma-blue rounded-2xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer transition-all duration-300 select-none"
                    >
                      + Añadir suplente
                    </button>
                  )}
                </div>
              </div>

              {/* Resumen del Acta / Estadísticas Individuales Card */}
              {Object.keys(statsJugadores).length > 0 && (
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl backdrop-blur-md">
                  <div className="px-5 py-4 border-b border-slate-850 flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 text-camarma-blue-light" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 font-sans">
                      Resumen Estadístico del Encuentro
                    </h4>
                  </div>
                  <div className="divide-y divide-slate-850/60 max-h-[360px] overflow-y-auto pr-1">
                    {[...Object.values(asignaciones).filter(Boolean), ...suplentes].map(jugId => {
                      const jug = getJugador(jugId);
                      const s = statsJugadores[jugId];
                      if (!jug || !s) return null;
                      const esPortero = jug.isPortero || jug.posicion === "Portero";
                      const slotEntry = Object.entries(asignaciones).find(([, id]) => id === jugId);
                      
                      return (
                        <div
                          key={jugId}
                          className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/30 cursor-pointer transition-colors"
                          onClick={() => {
                            if (slotEntry) setModalSlot(slotEntry[0]);
                            else setModalSlot(`suplente_${jugId}`);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {jug.fotoUrl ? (
                              <img src={jug.fotoUrl} alt={jug.nombre} className="w-8 h-8 rounded-full object-cover border border-slate-850" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-750">
                                <User className="w-4 h-4 text-slate-500" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-white block truncate">{jug.nombre}</span>
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                {slotEntry ? `Titular (${slotEntry[0]})` : "Suplente"}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center justify-end gap-2 text-[10px] font-black shrink-0">
                            <span className="text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-850">
                              {s.minutos}'
                            </span>
                            {!esPortero && s.goles > 0 && (
                              <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                                ⚽ {s.goles}
                              </span>
                            )}
                            {esPortero && s.golesContra > 0 && (
                              <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">
                                🥅 {s.golesContra}
                              </span>
                            )}
                            {s.asistencias > 0 && (
                              <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                                👟 {s.asistencias}
                              </span>
                            )}
                            {s.amarillas > 0 && (
                              <span className="bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/20">
                                🟨 {s.amarillas}
                              </span>
                            )}
                            {s.rojas > 0 && (
                              <span className="bg-red-500/15 text-red-400 px-2 py-0.5 rounded border border-red-500/20">
                                🟥 {s.rojas}
                              </span>
                            )}
                            {s.sustituido && (
                              <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20">
                                🔄 {s.minCambio}'
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Crónica y MVP del Partido Card */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 shadow-xl backdrop-blur-md space-y-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-camarma-gold border-b border-slate-850 pb-2 flex items-center gap-2">
                  📝 Detalles Post-Partido (Cuerpo Técnico)
                </h3>
                
                {/* Nominar MVP */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    🌟 Nominar MVP del Partido
                  </label>
                  <div className="relative">
                    <select
                      value={mvpJugadorId}
                      onChange={(e) => setMvpJugadorId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800/80 text-white rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-camarma-blue cursor-pointer appearance-none font-medium"
                    >
                      <option value="">-- Selecciona al MVP del encuentro --</option>
                      {[...Object.values(asignaciones).filter(Boolean), ...suplentes].map(pid => {
                        const p = getJugador(pid);
                        return p ? (
                          <option key={pid} value={pid}>
                            {p.nombre} ({p.posicion || (p.isPortero ? "Portero" : "Jugador")})
                          </option>
                        ) : null;
                      })}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Crónica del partido */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    ✍️ Crónica / Resumen Táctico del Míster
                  </label>
                  <textarea
                    value={cronica}
                    onChange={(e) => setCronica(e.target.value)}
                    placeholder="Escribe aquí el resumen del partido, notas tácticas o comentarios destacados para los aficionados y jugadores..."
                    rows={5}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-camarma-blue text-white rounded-2xl p-4 text-sm outline-none resize-none leading-relaxed transition-all font-medium"
                  />
                </div>
              </div>

              {/* Botón de Guardado y Confirmar */}
              <div className="space-y-3">
                {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
                {guardado ? (
                  <div className="w-full py-4.5 bg-emerald-600/20 border border-emerald-500/40 rounded-2xl text-emerald-400 font-extrabold text-center text-sm shadow-md animate-in fade-in duration-300">
                    ✅ Acta guardada y estadísticas actualizadas con éxito
                  </div>
                ) : (
                  <button
                    onClick={confirmarActa}
                    disabled={guardando || Object.values(asignaciones).filter(Boolean).length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-camarma-gold to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 disabled:from-slate-800 disabled:to-slate-800 text-slate-950 disabled:text-slate-500 font-black py-4.5 text-base rounded-2xl shadow-xl transition-all active:scale-[0.98] cursor-pointer select-none uppercase tracking-wider"
                  >
                    {guardando ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Guardando estadísticas...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 stroke-[3px]" />
                        Confirmar Acta y Actualizar Plantilla
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* MODAL DE SELECCIÓN DE JUGADOR PARA UN SLOT */}
      {selectorSlot && (
        <div className="fixed inset-0 z-50 bg-slate-955/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl max-h-[75vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-850">
              <h4 className="font-black text-white text-sm uppercase tracking-wide">Seleccionar Jugador</h4>
              <button
                onClick={() => setSelectorSlot(null)}
                className="text-slate-400 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-slate-850 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-3 space-y-1">
              {jugadoresLibres.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">Todos los jugadores de la plantilla ya están asignados.</p>
              ) : (
                jugadoresLibres.map(jug => (
                  <button
                    key={jug.id}
                    onClick={() => selectorSlot === "suplente" ? addSuplente(jug.id) : asignarJugador(selectorSlot, jug.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-800/60 transition-colors cursor-pointer text-left group"
                  >
                    {jug.fotoUrl ? (
                      <img src={jug.fotoUrl} alt={jug.nombre} className="w-10 h-10 rounded-full object-cover border border-slate-800" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-850 flex items-center justify-center border border-slate-800">
                        <User className="w-5 h-5 text-slate-500 group-hover:text-slate-400 transition-colors" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-camarma-blue transition-colors">{jug.nombre}</p>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">{jug.posicion || (jug.isPortero ? "Portero" : "Jugador")}</p>
                    </div>
                  </button>
                ))
              )}
              
              {/* Desasignar si ya tenía jugador */}
              {selectorSlot !== "suplente" && asignaciones[selectorSlot] && (
                <div className="pt-2 px-1">
                  <button
                    onClick={() => { desasignarSlot(selectorSlot); setSelectorSlot(null); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-red-950/15 border border-dashed border-red-900/40 text-red-400 hover:bg-red-950/25 transition-all cursor-pointer font-bold text-xs"
                  >
                    <X className="w-4 h-4 text-red-400" />
                    Quitar jugador de esta posición
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ESTADÍSTICAS */}
      {modalSlot && jugadorIdModal && (
        <ModalJugadorActa
          jugador={getJugador(jugadorIdModal)}
          stats={statsJugadores[jugadorIdModal] || {}}
          jugadoresPlantilla={jugadores.filter(j => j.id !== jugadorIdModal)}
          onSave={(newStats) => guardarStats(jugadorIdModal, newStats)}
          onClose={() => setModalSlot(null)}
          onRemove={!modalSlot.startsWith("suplente_") ? () => {
            desasignarSlot(modalSlot);
            setStatsJugadores(prev => {
              const newStats = { ...prev };
              delete newStats[jugadorIdModal];
              return newStats;
            });
            setModalSlot(null);
          } : null}
        />
      )}
    </div>
  );
}
