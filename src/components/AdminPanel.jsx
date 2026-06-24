import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  updateDoc,
  increment,
  onSnapshot,
  deleteDoc,
  addDoc,
  query,
  orderBy
} from "firebase/firestore";
import {
  LogOut,
  Plus,
  Users,
  Calendar,
  Search,
  Trash2,
  CalendarDays,
  CheckCircle,
  HelpCircle,
  FileText,
  UserCheck,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ClipboardList,
  Eye,
  Pencil
} from "lucide-react";
import AddPlayerForm from "./AddPlayerForm";
import ActaPartido from "./ActaPartido";
import EditPlayerModal from "./EditPlayerModal";

const calcularEdad = (fechaNac) => {
  if (!fechaNac) return "N/A";
  const birthDate = new Date(fechaNac);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export default function AdminPanel({ adminUser, onViewPublic, onLogout }) {
  const [activeTab, setActiveTab] = useState("jugadores"); // "jugadores", "partidos", "entrenamientos"
  const [expandedPlayerId, setExpandedPlayerId] = useState(null); // ID del jugador expandido en el acordeón
  const [jugadores, setJugadores] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState(null); // Jugador que se está editando

  // Estados para entrenamientos
  const [entrenamientos, setEntrenamientos] = useState([]);
  const [showAddTraining, setShowAddTraining] = useState(false);
  const [trainingDate, setTrainingDate] = useState("");
  const [trainingNotes, setTrainingNotes] = useState("");
  const [absentPlayerIds, setAbsentPlayerIds] = useState([]); // IDs de jugadores ausentes
  const [editingTrainingId, setEditingTrainingId] = useState(null);
  const [trainingError, setTrainingError] = useState("");
  const [savingTraining, setSavingTraining] = useState(false);

  // Estados para crear un partido
  const [rival, setRival] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [condicion, setCondicion] = useState("local"); // "local" o "visitante"
  const [matchError, setMatchError] = useState("");
  
  // Estado para el acta de partido
  const [actaMatch, setActaMatch] = useState(null);

  // Refs para abrir calendarios
  const matchDateInputRef = useRef(null);
  const trainingDateInputRef = useRef(null);
  
  // Estado para registrar resultado de partido
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [golesCamarma, setGolesCamarma] = useState(0);
  const [golesRival, setGolesRival] = useState(0);

  // Escuchar jugadores en tiempo real
  useEffect(() => {
    const q = query(collection(db, "jugadores"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pList = [];
      snapshot.forEach((doc) => {
        pList.push({ id: doc.id, ...doc.data() });
      });
      setJugadores(pList);
      setLoading(false);
    }, (error) => {
      console.error("Error cargando jugadores: ", error);
    });
    return () => unsubscribe();
  }, []);

  // Escuchar partidos en tiempo real
  useEffect(() => {
    const q = query(collection(db, "partidos"), orderBy("fecha", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mList = [];
      snapshot.forEach((doc) => {
        mList.push({ id: doc.id, ...doc.data() });
      });
      setPartidos(mList);
    }, (error) => {
      console.error("Error cargando partidos: ", error);
    });
    return () => unsubscribe();
  }, []);

  // Escuchar entrenamientos en tiempo real
  useEffect(() => {
    const q = query(collection(db, "entrenamientos"), orderBy("fecha", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tList = [];
      snapshot.forEach((doc) => {
        tList.push({ id: doc.id, ...doc.data() });
      });
      setEntrenamientos(tList);
    }, (error) => {
      console.error("Error cargando entrenamientos: ", error);
    });
    return () => unsubscribe();
  }, []);

  // Guardar o actualizar entrenamiento
  const handleSaveTraining = async (e) => {
    e.preventDefault();
    if (!trainingDate) {
      setTrainingError("Por favor, selecciona una fecha.");
      return;
    }
    setSavingTraining(true);
    setTrainingError("");
    try {
      const trainingData = {
        fecha: trainingDate,
        notas: trainingNotes.trim(),
        faltas: absentPlayerIds
      };

      if (editingTrainingId) {
        // Modo Edición: Calcular diferencia de faltas
        const oldTraining = entrenamientos.find(t => t.id === editingTrainingId);
        const oldFaltas = oldTraining ? (oldTraining.faltas || []) : [];
        
        const added = absentPlayerIds.filter(id => !oldFaltas.includes(id));
        const removed = oldFaltas.filter(id => !absentPlayerIds.includes(id));

        for (const playerId of added) {
          await updateDoc(doc(db, "jugadores", playerId), {
            faltasEntrenamiento: increment(1)
          });
        }
        for (const playerId of removed) {
          const player = jugadores.find(j => j.id === playerId);
          const currentFaltas = player?.faltasEntrenamiento || 0;
          const decVal = currentFaltas > 0 ? -1 : 0;
          if (decVal !== 0) {
            await updateDoc(doc(db, "jugadores", playerId), {
              faltasEntrenamiento: increment(decVal)
            });
          }
        }

        await updateDoc(doc(db, "entrenamientos", editingTrainingId), trainingData);
      } else {
        // Modo Nuevo: Guardar sesión e incrementar faltas
        await addDoc(collection(db, "entrenamientos"), trainingData);
        for (const playerId of absentPlayerIds) {
          await updateDoc(doc(db, "jugadores", playerId), {
            faltasEntrenamiento: increment(1)
          });
        }
      }

      // Limpiar formulario
      setTrainingDate("");
      setTrainingNotes("");
      setAbsentPlayerIds([]);
      setEditingTrainingId(null);
      setShowAddTraining(false);
    } catch (err) {
      console.error("Error guardando entrenamiento:", err);
      setTrainingError("Error al guardar el entrenamiento.");
    } finally {
      setSavingTraining(false);
    }
  };

  const handleEditTraining = (training) => {
    setEditingTrainingId(training.id);
    setTrainingDate(training.fecha);
    setTrainingNotes(training.notas || "");
    setAbsentPlayerIds(training.faltas || []);
    setShowAddTraining(true);
  };

  const handleDeleteTraining = async (training) => {
    if (window.confirm("¿Seguro que quieres eliminar este entrenamiento? Los contadores de faltas de los jugadores se restarán automáticamente.")) {
      try {
        const oldFaltas = training.faltas || [];
        for (const playerId of oldFaltas) {
          const player = jugadores.find(j => j.id === playerId);
          const currentFaltas = player?.faltasEntrenamiento || 0;
          const decVal = currentFaltas > 0 ? -1 : 0;
          if (decVal !== 0) {
            await updateDoc(doc(db, "jugadores", playerId), {
              faltasEntrenamiento: increment(decVal)
            });
          }
        }
        await deleteDoc(doc(db, "entrenamientos", training.id));
      } catch (err) {
        console.error("Error eliminando entrenamiento:", err);
        alert("Error al eliminar el entrenamiento.");
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      if (onLogout) onLogout();
    } catch (err) {
      console.error("Error al salir", err);
    }
  };

  // Función para actualizar estadísticas usando Firestore increment()
  const updateStat = async (player, field, value) => {
    // Validar en el cliente que no bajamos de 0
    if (value < 0) {
      const currentValue = player[field] || 0;
      if (currentValue + value < 0) {
        return; // No permitir números negativos
      }
    }
    
    try {
      const playerRef = doc(db, "jugadores", player.id);
      await updateDoc(playerRef, {
        [field]: increment(value)
      });
    } catch (err) {
      console.error("Error actualizando estadística:", err);
      alert("Error al actualizar datos. Comprueba la conexión o permisos.");
    }
  };

  // Crear un nuevo partido
  const handleAddMatch = async (e) => {
    e.preventDefault();
    if (!rival.trim() || !fecha) {
      setMatchError("Por favor, rellena rival y fecha.");
      return;
    }
    try {
      const newMatch = {
        rival: rival.trim(),
        fecha: fecha,
        hora: hora || null,
        condicion: condicion,
        golesCamarma: 0,
        golesRival: 0,
        jugado: false
      };
      await addDoc(collection(db, "partidos"), newMatch);
      setRival("");
      setFecha("");
      setHora("");
      setCondicion("local");
      setMatchError("");
    } catch (err) {
      console.error("Error añadiendo partido:", err);
      setMatchError("Error al guardar el partido.");
    }
  };

  // Guardar resultado de partido
  const saveMatchResult = async (matchId) => {
    try {
      const matchRef = doc(db, "partidos", matchId);
      await updateDoc(matchRef, {
        golesCamarma: parseInt(golesCamarma) || 0,
        golesRival: parseInt(golesRival) || 0,
        jugado: true
      });
      setEditingMatchId(null);
    } catch (err) {
      console.error("Error al guardar resultado:", err);
      alert("Error al guardar el resultado.");
    }
  };

  // Marcar partido como NO jugado
  const resetMatchPlayed = async (matchId) => {
    if (window.confirm("¿Seguro que quieres anular el resultado y dejar el partido como pendiente?")) {
      try {
        const matchRef = doc(db, "partidos", matchId);
        await updateDoc(matchRef, {
          golesCamarma: 0,
          golesRival: 0,
          jugado: false
        });
      } catch (err) {
        console.error("Error reseteando partido:", err);
      }
    }
  };

  // Eliminar un jugador
  const handleDeletePlayer = async (player) => {
    if (window.confirm(`¿Seguro que quieres eliminar a ${player.nombre}? Esta acción no se puede deshacer.`)) {
      try {
        await deleteDoc(doc(db, "jugadores", player.id));
      } catch (err) {
        console.error("Error eliminando jugador:", err);
        alert("Error al borrar jugador.");
      }
    }
  };

  // Generar reporte PDF de la plantilla
  const generatePDFReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor, permite las ventanas emergentes (popups) para descargar el PDF.");
      return;
    }

    const rows = jugadores.map(player => {
      const missedDates = entrenamientos
        .filter(t => t.faltas && t.faltas.includes(player.id))
        .map(t => {
          const d = new Date(t.fecha + "T00:00:00");
          return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
        });

      return {
        nombre: player.nombre,
        posicion: player.posicion || (player.isPortero ? "Portero" : "Jugador"),
        edad: calcularEdad(player.fechaNacimiento),
        goles: player.isPortero ? player.golesContra : player.golesFavor,
        asistencias: player.asistencias || 0,
        minutos: player.minutosJugados || 0,
        faltasCount: player.faltasEntrenamiento || 0,
        faltasFechas: missedDates.length > 0 ? missedDates.join(", ") : "Ninguna"
      };
    });

    const rowsHtml = rows.map(r => {
      let badgeClass = "badge";
      if (r.posicion === "Portero") badgeClass += " badge-portero";
      else if (r.posicion === "Defensa") badgeClass += " badge-defensa";
      else if (r.posicion === "Centrocampista") badgeClass += " badge-centro";
      else if (r.posicion === "Delantero") badgeClass += " badge-delantero";

      return `
        <tr>
          <td><strong>${r.nombre}</strong></td>
          <td><span class="${badgeClass}">${r.posicion}</span></td>
          <td class="text-center">${r.edad}</td>
          <td class="text-center">${r.goles}</td>
          <td class="text-center">${r.asistencias}</td>
          <td class="text-center">${r.minutos}'</td>
          <td class="text-center" style="color: ${r.faltasCount > 0 ? '#ef4444' : '#10b981'}; font-weight: bold;">${r.faltasCount}</td>
          <td class="date-list">${r.faltasFechas}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Camarma CF - Resumen de Plantilla</title>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 40px;
              line-height: 1.5;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 3px solid #1e3a8a;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title-section h1 {
              margin: 0;
              font-size: 26px;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .title-section h2 {
              margin: 5px 0 0 0;
              font-size: 14px;
              color: #eab308;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .meta-date {
              font-size: 12px;
              color: #64748b;
              text-align: right;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 13px;
            }
            th {
              background-color: #f1f5f9;
              color: #1e293b;
              font-weight: bold;
              text-align: left;
              padding: 12px 10px;
              border-bottom: 2px solid #cbd5e1;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.5px;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .text-center {
              text-align: center;
            }
            .badge {
              font-size: 10px;
              font-weight: bold;
              padding: 3px 6px;
              border-radius: 4px;
              background-color: #f1f5f9;
              border: 1px solid #cbd5e1;
            }
            .badge-portero { background-color: #fae8ff; border-color: #f0abfc; color: #a21caf; }
            .badge-defensa { background-color: #fef3c7; border-color: #fde047; color: #b45309; }
            .badge-centro { background-color: #dbeafe; border-color: #93c5fd; color: #1d4ed8; }
            .badge-delantero { background-color: #d1fae5; border-color: #6ee7b7; color: #047857; }
            .date-list {
              font-size: 11px;
              color: #64748b;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title-section">
              <h1>Camarma CF</h1>
              <h2>Informe Resumen de Plantilla</h2>
            </div>
            <div class="meta-date">
              <strong>Generado por:</strong> Directiva de Gestión Deportiva<br/>
              <strong>Fecha:</strong> ${new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Posición</th>
                <th class="text-center">Edad</th>
                <th class="text-center">Goles</th>
                <th class="text-center">Asistencias</th>
                <th class="text-center">Minutos</th>
                <th class="text-center">Faltas Entreno</th>
                <th>Detalle Faltas Entreno</th>
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

  // Eliminar un partido
  const handleDeleteMatch = async (matchId) => {
    if (window.confirm("¿Seguro que quieres eliminar este partido?")) {
      try {
        const matchToDelete = partidos.find(p => p.id === matchId);
        if (matchToDelete && matchToDelete.actaGuardada) {
          const stats = matchToDelete.statsJugadores || {};
          const mvpId = matchToDelete.mvpJugadorId || "";

          // Revertir las estadísticas en cada jugador
          for (const jugadorId of Object.keys(stats)) {
            const playerRef = doc(db, "jugadores", jugadorId);
            const pStats = stats[jugadorId];
            
            const updates = {};
            const minutos = pStats.minutos || 0;
            const goles = pStats.goles || 0;
            const golesContra = pStats.golesContra || 0;
            const asistencias = pStats.asistencias || 0;
            const amarillas = pStats.amarillas || 0;
            const rojas = pStats.rojas || 0;
            const convocado = pStats.convocado ? 1 : 0;

            if (minutos > 0) updates.minutosJugados = increment(-minutos);
            if (goles > 0) updates.golesFavor = increment(-goles);
            if (golesContra > 0) updates.golesContra = increment(-golesContra);
            if (asistencias > 0) updates.asistencias = increment(-asistencias);
            if (amarillas > 0) updates.tarjetasAmarillas = increment(-amarillas);
            if (rojas > 0) updates.tarjetasRojas = increment(-rojas);
            if (convocado > 0) updates.partidosConvocados = increment(-convocado);

            // Revertir MVP si este jugador fue elegido MVP
            if (mvpId === jugadorId) {
              updates.mvps = increment(-1);
            }

            if (Object.keys(updates).length > 0) {
              await updateDoc(playerRef, updates);
            }
          }
        }

        // Borrar el documento del partido
        await deleteDoc(doc(db, "partidos", matchId));
      } catch (err) {
        console.error("Error eliminando partido y revertiendo estadísticas:", err);
      }
    }
  };

  // Filtrar jugadores por término de búsqueda
  const filteredJugadores = jugadores.filter((j) =>
    j.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
    {/* Modal de Edición de Jugador */}
    {editingPlayer && (
      <EditPlayerModal
        player={editingPlayer}
        onClose={() => setEditingPlayer(null)}
      />
    )}
    <div className="flex-1 flex flex-col min-h-screen bg-slate-900 pb-20">
      
      {/* Cabecera Fija del Panel */}
      <header className="sticky top-0 z-40 bg-slate-800/95 backdrop-blur-md border-b border-slate-700/60 px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <img
            src="/img/escudo.webp"
            alt="Camarma CF Escudo"
            className="w-16 h-16 object-contain hover:scale-105 transition-transform duration-300 drop-shadow-[0_2px_8px_rgba(30,58,138,0.3)]"
          />
          <div>
            <h1 className="text-lg font-bold text-white font-sans tracking-tight">
              Camarma CF
            </h1>
            <p className="text-xs text-camarma-gold font-bold uppercase tracking-wider flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" />
              Directiva
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onViewPublic && (
            <button
              onClick={onViewPublic}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-750 hover:bg-slate-700 text-slate-250 hover:text-white border border-slate-700 hover:border-slate-650 transition-all cursor-pointer text-xs font-bold shadow-md active:scale-95"
              title="Ver Web Pública"
            >
              <Eye className="w-4 h-4 text-camarma-gold shrink-0" />
              <span>Ver Web</span>
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center p-3 rounded-full bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-900/40 transition-all cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Selector de pestañas táctil grande */}
      <div className="grid grid-cols-3 gap-1 p-2 bg-slate-800/80 border-b border-slate-700/50 sticky top-20 z-30 backdrop-blur-sm">
        <button
          onClick={() => setActiveTab("jugadores")}
          className={`flex items-center justify-center gap-1.5 py-4 px-1 rounded-xl text-xs sm:text-sm md:text-base font-bold transition-all cursor-pointer ${
            activeTab === "jugadores"
              ? "bg-camarma-blue text-white shadow-lg shadow-camarma-blue/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span className="hidden sm:inline">Plantilla</span>
          <span className="inline sm:hidden">Jug.</span>
          <span className="text-[10px] sm:text-xs opacity-80">({jugadores.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("partidos")}
          className={`flex items-center justify-center gap-1.5 py-4 px-1 rounded-xl text-xs sm:text-sm md:text-base font-bold transition-all cursor-pointer ${
            activeTab === "partidos"
              ? "bg-camarma-blue text-white shadow-lg shadow-camarma-blue/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span className="hidden sm:inline">Partidos</span>
          <span className="inline sm:hidden">Part.</span>
          <span className="text-[10px] sm:text-xs opacity-80">({partidos.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("entrenamientos")}
          className={`flex items-center justify-center gap-1.5 py-4 px-1 rounded-xl text-xs sm:text-sm md:text-base font-bold transition-all cursor-pointer ${
            activeTab === "entrenamientos"
              ? "bg-camarma-blue text-white shadow-lg shadow-camarma-blue/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span className="hidden sm:inline">Entrenamientos</span>
          <span className="inline sm:hidden">Entr.</span>
          <span className="text-[10px] sm:text-xs opacity-80">({entrenamientos.length})</span>
        </button>
      </div>

      {/* Contenido Principal */}
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        
        {/* Pestaña: JUGADORES */}
        {activeTab === "jugadores" && (
          <div className="space-y-6">
            
            {/* Barra de Búsqueda y Botón Fichar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar jugador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl pl-12 pr-4 py-4 text-base outline-none focus:border-camarma-blue"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={generatePDFReport}
                  className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-650 font-extrabold text-sm py-4 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                  title="Descargar PDF Resumen de Plantilla"
                >
                  <FileText className="w-5 h-5 text-camarma-gold" />
                  <span className="hidden sm:inline">Exportar PDF</span>
                </button>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-gradient-to-r from-camarma-gold to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-slate-950 font-extrabold text-base py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-camarma-gold/10 transition-all transform active:scale-95 cursor-pointer"
                >
                  <Plus className="w-5 h-5 stroke-[3px]" />
                  Fichar Jugador
                </button>
              </div>
            </div>

            {/* Formulario Añadir Jugador (desplegable) */}
            {showAddForm && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-200">
                <AddPlayerForm
                  onPlayerAdded={() => setShowAddForm(false)}
                  onClose={() => setShowAddForm(false)}
                />
              </div>
            )}

            {/* Spinner de carga inicial */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <svg className="animate-spin h-10 w-10 text-camarma-gold" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Cargando plantilla...</span>
              </div>
            ) : filteredJugadores.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/30 border border-slate-800 rounded-3xl text-slate-400">
                {searchTerm ? "No se encontró ningún jugador con ese nombre." : "No hay jugadores registrados en la plantilla."}
              </div>
            ) : (
              /* Lista de Jugadores - Acordeón Colapsable */
              <div className="space-y-3 animate-in fade-in duration-300">
                {filteredJugadores.map((player) => {
                  const isExpanded = expandedPlayerId === player.id;
                  
                  // Color del badge por posición
                  const getPosicionBadge = (pos) => {
                    switch (pos) {
                      case "Portero": return "bg-purple-950/40 text-purple-400 border border-purple-850/40";
                      case "Defensa": return "bg-amber-950/40 text-amber-400 border border-amber-850/40";
                      case "Centrocampista": return "bg-blue-950/40 text-blue-405 border border-blue-850/40";
                      case "Delantero": return "bg-emerald-950/40 text-emerald-405 border border-emerald-850/40";
                      default: return "bg-slate-805 text-slate-400 border border-slate-700";
                    }
                  };

                  return (
                    <div
                      key={player.id}
                      className={`bg-slate-800/60 border rounded-2xl overflow-hidden shadow-md transition-all duration-300 ${
                        isExpanded ? "border-slate-650 ring-1 ring-slate-700/50" : "border-slate-750/70 hover:border-slate-650"
                      }`}
                    >
                      {/* Cabecera del Acordeón */}
                      <div
                        onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                        className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-800/25 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Foto/Avatar */}
                          <div className="relative shrink-0">
                            <img
                              src={player.fotoUrl || "/placeholder-player.png"}
                              alt={player.nombre}
                              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-slate-800 shadow"
                            />
                            {player.isPortero && (
                              <span className="absolute -bottom-1 -right-1 bg-camarma-gold text-slate-950 text-[9px] font-black uppercase px-1 rounded border border-slate-900">
                                🧤
                              </span>
                            )}
                          </div>

                          {/* Nombre, edad y badge de posición */}
                          <div className="min-w-0">
                            <h4 className="text-sm sm:text-base font-extrabold text-white leading-tight font-sans truncate flex items-center gap-1.5">
                              {player.nombre}
                              {player.lesionado && (
                                <span className="text-[10px] bg-red-950/50 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 shrink-0">
                                  🩹 Lesionado
                                </span>
                              )}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="text-xs text-slate-400 font-medium">
                                {calcularEdad(player.fechaNacimiento)} años
                              </span>
                              <span className="text-slate-650 text-xs">•</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${getPosicionBadge(player.posicion)}`}>
                                {player.posicion || (player.isPortero ? "Portero" : "Jugador")}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Estadísticas rápidas en cabecera */}
                        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                          <div className="hidden sm:flex items-center gap-4 text-xs font-bold text-slate-400">
                            <div className="text-center min-w-[32px]">
                              <span className="block text-[8px] text-slate-500 uppercase tracking-widest leading-none mb-0.5">Gol</span>
                              <span className="text-white text-sm">{player.isPortero ? player.golesContra : player.golesFavor}</span>
                            </div>
                            <div className="text-center min-w-[40px]">
                              <span className="block text-[8px] text-slate-500 uppercase tracking-widest leading-none mb-0.5">Min</span>
                              <span className="text-slate-300 text-xs">{player.minutosJugados || 0}'</span>
                            </div>
                            <div className="text-center min-w-[28px]">
                              <span className="block text-[8px] text-slate-500 uppercase tracking-widest leading-none mb-0.5">Fal</span>
                              <span className="text-red-400 text-xs">{player.faltasEntrenamiento || 0}</span>
                            </div>
                          </div>

                          {/* Indicador de Desplegado */}
                          <div className="p-1 rounded-lg bg-slate-950/40 border border-slate-800/40 text-slate-400 transition-colors">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contenido Expandido */}
                      {isExpanded && (
                        <div className="p-4 border-t border-slate-850 bg-slate-950/20 animate-in slide-in-from-top-2">
                          {/* Ficha completa en grid */}
                          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center text-xs text-slate-400 bg-slate-950/60 rounded-xl p-3 border border-slate-800/40 mb-4">
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider text-slate-550 mb-0.5">Goles</span>
                              <strong className="text-sm font-bold text-white">
                                {player.isPortero ? `${player.golesContra} (Rec.)` : player.golesFavor}
                              </strong>
                            </div>
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider text-slate-555 mb-0.5">Asistencias</span>
                              <strong className="text-sm font-bold text-white">{player.asistencias || 0}</strong>
                            </div>
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider text-slate-555 mb-0.5">Minutos</span>
                              <strong className="text-sm font-bold text-white">{player.minutosJugados || 0}'</strong>
                            </div>
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider text-slate-555 mb-0.5">Convocado</span>
                              <strong className="text-sm font-bold text-white">{player.partidosConvocados || 0}</strong>
                            </div>
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider text-slate-555 mb-0.5">Faltas Ent.</span>
                              <strong className="text-sm font-bold text-red-400">{player.faltasEntrenamiento || 0}</strong>
                            </div>
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider text-slate-555 mb-0.5">Amarillas</span>
                              <strong className="text-sm font-bold text-yellow-500">{player.tarjetasAmarillas || 0}</strong>
                            </div>
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider text-slate-555 mb-0.5">Rojas</span>
                              <strong className="text-sm font-bold text-red-500">{player.tarjetasRojas || 0}</strong>
                            </div>
                          </div>

                          {/* Controles de edición táctil */}
                          <div className="space-y-3">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-900 pb-1">
                              Panel de Modificaciones
                            </span>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              
                              {/* Goles */}
                              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between items-center">
                                <span className="text-xs font-bold text-slate-300">
                                  ⚽ Goles {player.isPortero ? "Contra" : "Favor"}
                                </span>
                                <div className="flex gap-2 w-full mt-2">
                                  <button
                                    onClick={() => updateStat(player, player.isPortero ? "golesContra" : "golesFavor", -1)}
                                    className="flex-1 bg-red-650/20 hover:bg-red-650/30 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold py-2 rounded-lg cursor-pointer active:scale-95 transition-all text-xs"
                                  >
                                    -1
                                  </button>
                                  <button
                                    onClick={() => updateStat(player, player.isPortero ? "golesContra" : "golesFavor", 1)}
                                    className="flex-1 bg-emerald-650/20 hover:bg-emerald-650/30 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-450 font-bold py-2 rounded-lg cursor-pointer active:scale-95 transition-all text-xs"
                                  >
                                    +1
                                  </button>
                                </div>
                              </div>

                              {/* Asistencias */}
                              <div className="bg-slate-955 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between items-center">
                                <span className="text-xs font-bold text-slate-300">🪄 Asistencias</span>
                                <div className="flex gap-2 w-full mt-2">
                                  <button
                                    onClick={() => updateStat(player, "asistencias", -1)}
                                    className="flex-1 bg-red-650/20 hover:bg-red-650/30 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold py-2 rounded-lg cursor-pointer active:scale-95 transition-all text-xs"
                                  >
                                    -1
                                  </button>
                                  <button
                                    onClick={() => updateStat(player, "asistencias", 1)}
                                    className="flex-1 bg-emerald-650/20 hover:bg-emerald-650/30 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-450 font-bold py-2 rounded-lg cursor-pointer active:scale-95 transition-all text-xs"
                                  >
                                    +1
                                  </button>
                                </div>
                              </div>

                              {/* Minutos */}
                              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between items-center">
                                <span className="text-xs font-bold text-slate-300">⏱️ Minutos</span>
                                <div className="flex gap-2 w-full mt-2">
                                  <button
                                    onClick={() => updateStat(player, "minutosJugados", -15)}
                                    className="flex-1 bg-red-650/20 hover:bg-red-650/30 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold py-2 text-xs rounded-lg cursor-pointer active:scale-95 transition-all"
                                  >
                                    -15'
                                  </button>
                                  <button
                                    onClick={() => updateStat(player, "minutosJugados", 15)}
                                    className="flex-1 bg-emerald-650/20 hover:bg-emerald-650/30 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-455 font-bold py-2 text-xs rounded-lg cursor-pointer active:scale-95 transition-all"
                                  >
                                    +15'
                                  </button>
                                </div>
                              </div>

                              {/* Amarillas */}
                              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between items-center">
                                <span className="text-xs font-bold text-slate-300">🟨 Amarillas</span>
                                <div className="flex gap-2 w-full mt-2">
                                  <button
                                    onClick={() => updateStat(player, "tarjetasAmarillas", -1)}
                                    className="flex-1 bg-red-650/20 hover:bg-red-650/30 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold py-2 rounded-lg cursor-pointer active:scale-95 transition-all text-xs"
                                  >
                                    -
                                  </button>
                                  <button
                                    onClick={() => updateStat(player, "tarjetasAmarillas", 1)}
                                    className="flex-1 bg-yellow-500/20 hover:bg-yellow-550/30 border border-yellow-500/20 hover:border-yellow-500/45 text-yellow-400 font-bold py-2 rounded-lg cursor-pointer active:scale-95 transition-all text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Rojas */}
                              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between items-center">
                                <span className="text-xs font-bold text-slate-300">🟥 Rojas</span>
                                <div className="flex gap-2 w-full mt-2">
                                  <button
                                    onClick={() => updateStat(player, "tarjetasRojas", -1)}
                                    className="flex-1 bg-red-655/20 hover:bg-red-650/30 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold py-2 rounded-lg cursor-pointer active:scale-95 transition-all text-xs"
                                  >
                                    -
                                  </button>
                                  <button
                                    onClick={() => updateStat(player, "tarjetasRojas", 1)}
                                    className="flex-1 bg-red-655/20 hover:bg-red-650/30 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold py-2 rounded-lg cursor-pointer active:scale-95 transition-all text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Convocatorias */}
                              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between items-center">
                                <span className="text-xs font-bold text-slate-300">📋 Convocado</span>
                                <div className="flex gap-2 w-full mt-2">
                                  <button
                                    onClick={() => updateStat(player, "partidosConvocados", -1)}
                                    className="flex-1 bg-red-655/20 hover:bg-red-650/30 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold py-2 rounded-lg cursor-pointer active:scale-95 transition-all text-xs"
                                  >
                                    -
                                  </button>
                                  <button
                                    onClick={() => updateStat(player, "partidosConvocados", 1)}
                                    className="flex-1 bg-blue-650/20 hover:bg-blue-650/30 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 font-bold py-2 rounded-lg cursor-pointer active:scale-95 transition-all text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Faltas Entrenamiento */}
                              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between items-center">
                                <span className="text-xs font-bold text-red-400">❌ Falta Entreno</span>
                                <div className="flex gap-2 w-full mt-2">
                                  <button
                                    onClick={() => updateStat(player, "faltasEntrenamiento", -1)}
                                    className="flex-1 bg-slate-850 hover:bg-slate-800 active:scale-90 text-slate-400 font-bold py-2 rounded-lg cursor-pointer text-xs"
                                  >
                                    -
                                  </button>
                                  <button
                                    onClick={() => updateStat(player, "faltasEntrenamiento", 1)}
                                    className="flex-1 bg-orange-650/20 hover:bg-orange-650/30 border border-orange-500/20 hover:border-orange-500/40 text-orange-400 font-bold py-2 rounded-lg cursor-pointer active:scale-95 transition-all text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                            </div>

                            {/* Estado Físico / Lesión (Idea 2) */}
                            <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-4 mt-4 space-y-4 text-left">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-350 flex items-center gap-2">
                                  🏥 Estado Físico / Lesión
                                </span>
                                <label className="relative inline-flex items-center cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={player.lesionado || false}
                                    onChange={async (e) => {
                                      const isChecked = e.target.checked;
                                      await updateDoc(doc(db, "jugadores", player.id), {
                                        lesionado: isChecked,
                                        tipoLesion: isChecked ? (player.tipoLesion || "") : "",
                                        fechaRecuperacion: isChecked ? (player.fechaRecuperacion || "") : ""
                                      });
                                    }}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-slate-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                  <span className="ml-3 text-xs font-bold text-slate-400 peer-checked:text-amber-400">
                                    {player.lesionado ? "🤕 Lesionado" : "💪 Disponible"}
                                  </span>
                                </label>
                              </div>

                              {player.lesionado && (
                                <div className="space-y-3 pt-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Tipo de Lesión
                                      </label>
                                      <input
                                        type="text"
                                        value={player.tipoLesion || ""}
                                        onChange={async (e) => {
                                          await updateDoc(doc(db, "jugadores", player.id), {
                                            tipoLesion: e.target.value
                                          });
                                        }}
                                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-camarma-blue"
                                        placeholder="Ej. Esguince de tobillo"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Fecha Estimada de Alta
                                      </label>
                                      <input
                                        type="date"
                                        value={player.fechaRecuperacion === "pendiente" ? "" : (player.fechaRecuperacion || "")}
                                        onChange={async (e) => {
                                          await updateDoc(doc(db, "jugadores", player.id), {
                                            fechaRecuperacion: e.target.value
                                          });
                                        }}
                                        disabled={player.fechaRecuperacion === "pendiente"}
                                        className="w-full bg-slate-950 border border-slate-800 disabled:opacity-50 disabled:bg-slate-900 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-camarma-blue"
                                      />
                                    </div>
                                  </div>

                                  <label className="flex items-center gap-2 select-none cursor-pointer pt-1">
                                    <input
                                      type="checkbox"
                                      checked={player.fechaRecuperacion === "pendiente"}
                                      onChange={async (e) => {
                                        const isPending = e.target.checked;
                                        await updateDoc(doc(db, "jugadores", player.id), {
                                          fechaRecuperacion: isPending ? "pendiente" : ""
                                        });
                                      }}
                                      className="rounded border-slate-700 bg-slate-950 text-camarma-blue focus:ring-camarma-blue w-4 h-4 cursor-pointer"
                                    />
                                    <span className="text-xs text-slate-400">Sin fecha de alta (Pendiente de evolución)</span>
                                  </label>
                                </div>
                              )}
                            </div>

                            {/* Acciones del Jugador: Editar y Eliminar */}
                            <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-700/50 gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingPlayer(player); }}
                                className="flex items-center gap-1.5 bg-blue-950/20 hover:bg-blue-900/35 border border-blue-900/30 hover:border-blue-700/50 text-blue-400 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                              >
                                <Pencil className="w-4 h-4" />
                                Editar Jugador
                              </button>
                              <button
                                onClick={() => handleDeletePlayer(player)}
                                className="flex items-center gap-1.5 bg-red-950/20 hover:bg-red-900/35 border border-red-900/30 hover:border-red-700/50 text-red-400 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                                Despedir
                              </button>
                            </div>

                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pestaña: PARTIDOS */}
        {activeTab === "partidos" && (
          <div className="space-y-6">
            
            {/* Crear un partido */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-5 shadow-xl backdrop-blur-md">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-camarma-gold" />
                Programar Nuevo Partido
              </h3>
              
              <form onSubmit={handleAddMatch} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                {/* Rival */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Rival</label>
                  <input
                    type="text"
                    value={rival}
                    onChange={(e) => setRival(e.target.value)}
                    placeholder="Ej. CD Meco"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-camarma-blue"
                  />
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Fecha</label>
                  <div 
                    onClick={() => {
                      try {
                        if (matchDateInputRef.current) {
                          matchDateInputRef.current.showPicker();
                        }
                      } catch (err) {
                        console.log("showPicker not supported", err);
                      }
                    }}
                    className="relative cursor-pointer"
                  >
                    <input
                      type="date"
                      ref={matchDateInputRef}
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-4 pr-11 py-3 text-sm outline-none focus:border-camarma-blue cursor-pointer"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <CalendarDays className="w-5 h-5 text-camarma-gold" />
                    </div>
                  </div>
                </div>

                {/* Hora */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Hora (opcional)</label>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-camarma-blue"
                  />
                </div>

                {/* Local o Visitante */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">¿Local o Visitante?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCondicion("local")}
                      className={`py-3 px-3 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        condicion === "local"
                          ? "bg-camarma-blue text-white border-camarma-blue shadow-lg"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      🏠 Local
                    </button>
                    <button
                      type="button"
                      onClick={() => setCondicion("visitante")}
                      className={`py-3 px-3 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        condicion === "visitante"
                          ? "bg-orange-600 text-white border-orange-600 shadow-lg"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      ✈️ Visitante
                    </button>
                  </div>
                </div>

                {/* Botón Programar */}
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full bg-camarma-blue hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    Programar Partido
                  </button>
                </div>
              </form>
              {matchError && (
                <p className="text-red-400 text-xs mt-2">{matchError}</p>
              )}
            </div>

            {/* Listado de partidos */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
                Calendario de Partidos y Resultados
              </h3>

              {partidos.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/30 border border-slate-800 rounded-3xl text-slate-400 text-sm">
                  No hay partidos programados.
                </div>
              ) : (
                <div className="space-y-4">
                  {partidos.map((match) => (
                    <div
                      key={match.id}
                      className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-sm"
                    >
                      {/* Info: Fecha, Hora, Condición */}
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center min-w-[70px]">
                          <span className="block text-[10px] font-bold uppercase text-camarma-gold">
                            {new Date(match.fecha).toLocaleDateString("es-ES", { month: "short" })}
                          </span>
                          <span className="block text-xl font-extrabold text-white leading-none">
                            {new Date(match.fecha).toLocaleDateString("es-ES", { day: "numeric" })}
                          </span>
                          {match.hora && (
                            <span className="block text-[10px] font-semibold text-slate-400 mt-0.5">{match.hora}</span>
                          )}
                        </div>
                        <div>
                          {match.condicion && (
                            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${match.condicion === "local" ? "bg-camarma-blue/20 text-camarma-blue" : "bg-orange-600/20 text-orange-400"}`}>
                              {match.condicion === "local" ? "🏠 Local" : "✈️ Visitante"}
                            </span>
                          )}
                          <p className="text-sm font-semibold text-slate-400 mt-0.5">RIVAL</p>
                          <h4 className="text-base font-bold text-white">{match.rival}</h4>
                        </div>
                      </div>

                      {/* Marcador / Estado del Partido */}
                      <div className="flex items-center gap-6 justify-center w-full md:w-auto py-2 bg-slate-950/40 rounded-xl px-4 border border-slate-800/40">
                        {match.jugado ? (
                          <div className="flex items-center gap-4 text-center">
                            {match.condicion === "visitante" ? (
                              <>
                                <div>
                                  <span className="text-[10px] block font-bold text-slate-500">{match.rival.toUpperCase()}</span>
                                  <span className="text-2xl font-black text-white">{match.golesRival}</span>
                                </div>
                                <span className="text-slate-600 font-bold">-</span>
                                <div>
                                  <span className="text-[10px] block font-bold text-slate-500">CAMARMA</span>
                                  <span className="text-2xl font-black text-white">{match.golesCamarma}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <span className="text-[10px] block font-bold text-slate-500">CAMARMA</span>
                                  <span className="text-2xl font-black text-white">{match.golesCamarma}</span>
                                </div>
                                <span className="text-slate-600 font-bold">-</span>
                                <div>
                                  <span className="text-[10px] block font-bold text-slate-500">{match.rival.toUpperCase()}</span>
                                  <span className="text-2xl font-black text-white">{match.golesRival}</span>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-camarma-gold bg-camarma-gold/10 px-3 py-1 rounded-md border border-camarma-gold/20">
                            Pendiente
                          </span>
                        )}
                      </div>

                      {/* Botonera de acciones del partido */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        
                        {/* Si estamos editando el resultado */}
                        {editingMatchId === match.id ? (
                          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2 rounded-xl">
                            <div className="flex items-center gap-1 w-16">
                              <span className="text-xs text-slate-500">CF</span>
                              <input
                                type="number"
                                value={golesCamarma}
                                onChange={(e) => setGolesCamarma(parseInt(e.target.value) || 0)}
                                className="w-10 bg-slate-900 border border-slate-700 text-white text-center rounded py-1 text-sm outline-none"
                              />
                            </div>
                            <span className="text-slate-600">-</span>
                            <div className="flex items-center gap-1 w-16">
                              <input
                                type="number"
                                value={golesRival}
                                onChange={(e) => setGolesRival(parseInt(e.target.value) || 0)}
                                className="w-10 bg-slate-900 border border-slate-700 text-white text-center rounded py-1 text-sm outline-none"
                              />
                              <span className="text-xs text-slate-500">Riv</span>
                            </div>
                            <button
                              onClick={() => saveMatchResult(match.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditingMatchId(null)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1.5 px-2 rounded-lg cursor-pointer"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Botón Acta */}
                            <button
                              onClick={() => setActaMatch(match)}
                              className="flex items-center gap-1 bg-purple-900/30 hover:bg-purple-800/50 border border-purple-700/40 hover:border-purple-500/60 text-purple-300 font-bold text-xs py-2 px-3 rounded-xl cursor-pointer transition-all"
                            >
                              📋 Acta
                            </button>

                            {/* Botón para cambiar resultado o anularlo */}
                            {match.jugado ? (
                              <button
                                onClick={() => resetMatchPlayed(match.id)}
                                className="text-xs font-bold border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:text-white text-slate-400 py-2 px-3 rounded-xl cursor-pointer"
                              >
                                Anular Resultado
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingMatchId(match.id);
                                  setGolesCamarma(match.golesCamarma || 0);
                                  setGolesRival(match.golesRival || 0);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-md transition-all cursor-pointer"
                              >
                                Registrar Resultado
                              </button>
                            )}
                            
                            {/* Eliminar partido */}
                            <button
                              onClick={() => handleDeleteMatch(match.id)}
                              className="p-2 text-slate-600 hover:text-red-400 rounded-full hover:bg-slate-800 transition-all cursor-pointer"
                              title="Borrar partido"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pestaña: ENTRENAMIENTOS */}
        {activeTab === "entrenamientos" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Cabecera / Horarios */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md">
              <div>
                <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-camarma-gold" />
                  Entrenamientos Oficiales
                </h3>
                <p className="text-xs text-slate-400">
                  Horario habitual: Martes, Jueves y Viernes de 20:00 a 22:00.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingTrainingId(null);
                  setTrainingDate(new Date().toISOString().split("T")[0]); // Por defecto hoy
                  setTrainingNotes("");
                  setAbsentPlayerIds([]);
                  setShowAddTraining(!showAddTraining);
                }}
                className="bg-gradient-to-r from-camarma-gold to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-slate-950 font-extrabold text-sm py-3 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer transform active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3px]" />
                Registrar Sesión
              </button>
            </div>

            {/* Formulario Registrar/Editar Entrenamiento */}
            {showAddTraining && (
              <div className="bg-slate-800 border border-slate-700/60 rounded-3xl p-5 shadow-xl animate-in fade-in duration-200">
                <h4 className="text-sm font-bold text-white mb-4 border-b border-slate-700 pb-2">
                  {editingTrainingId ? "📝 Editar Sesión de Entrenamiento" : "⚽ Registrar Sesión de Entrenamiento"}
                </h4>
                
                <form onSubmit={handleSaveTraining} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Fecha */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Fecha del Entrenamiento</label>
                      <div 
                        onClick={() => {
                          try {
                            if (trainingDateInputRef.current) {
                              trainingDateInputRef.current.showPicker();
                            }
                          } catch (err) {
                            console.log("showPicker not supported", err);
                          }
                        }}
                        className="relative cursor-pointer"
                      >
                        <input
                          type="date"
                          ref={trainingDateInputRef}
                          value={trainingDate}
                          onChange={(e) => setTrainingDate(e.target.value)}
                          required
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-4 pr-11 py-3 text-sm outline-none focus:border-camarma-blue cursor-pointer"
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <CalendarDays className="w-5 h-5 text-camarma-gold" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notas del Entrenamiento (ej. contenido, lesiones, etc.)</label>
                    <textarea
                      value={trainingNotes}
                      onChange={(e) => setTrainingNotes(e.target.value)}
                      placeholder="Ej. Táctica ofensiva, partidillo final. Álvaro con molestias en la rodilla."
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-camarma-blue resize-none"
                    />
                  </div>

                  {/* Asistencia de Jugadores */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Control de Bajas / Ausencias (Haz clic para marcar a los que faltaron ❌)
                    </label>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {jugadores.map((player) => {
                        const isAbsent = absentPlayerIds.includes(player.id);
                        return (
                          <button
                            type="button"
                            key={player.id}
                            onClick={() => {
                              if (isAbsent) {
                                setAbsentPlayerIds(prev => prev.filter(id => id !== player.id));
                              } else {
                                setAbsentPlayerIds(prev => [...prev, player.id]);
                              }
                            }}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer select-none
                              ${isAbsent 
                                ? "bg-red-950/20 border-red-800 text-red-400 hover:bg-red-950/30" 
                                : "bg-slate-950 border-slate-800 text-slate-455 hover:text-white hover:border-slate-700"}`}
                          >
                            <span className="shrink-0 text-sm">
                              {isAbsent ? "❌" : "✔️"}
                            </span>
                            <span className="truncate">{player.nombre}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {trainingError && (
                    <p className="text-red-400 text-xs">{trainingError}</p>
                  )}

                  {/* Botones */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddTraining(false);
                        setEditingTrainingId(null);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingTraining}
                      className="bg-camarma-blue hover:bg-blue-700 disabled:bg-blue-900 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-5 rounded-xl cursor-pointer flex items-center gap-1.5"
                    >
                      {savingTraining ? "Guardando..." : (editingTrainingId ? "Guardar Cambios" : "Guardar Sesión")}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Listado Histórico */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
                Historial de Sesiones Registradas
              </h3>

              {entrenamientos.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/30 border border-slate-800 rounded-3xl text-slate-400 text-sm">
                  No hay entrenamientos registrados todavía.
                </div>
              ) : (
                <div className="space-y-4">
                  {entrenamientos.map((session) => {
                    const absents = session.faltas || [];
                    return (
                      <div
                        key={session.id}
                        className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-sm"
                      >
                        {/* Cabecera de sesión */}
                        <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                          <div className="flex items-center gap-3">
                            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center min-w-[65px]">
                              <span className="block text-[9px] font-bold uppercase text-camarma-gold leading-none">
                                {new Date(session.fecha + "T00:00:00").toLocaleDateString("es-ES", { month: "short" })}
                              </span>
                              <span className="block text-lg font-extrabold text-white leading-none mt-1">
                                {new Date(session.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric" })}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] bg-slate-955 border border-slate-800 px-2 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wider">
                                {new Date(session.fecha + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long" })}
                              </span>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Horario: 20:00 - 22:00
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleEditTraining(session)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] py-1.5 px-3 rounded-lg cursor-pointer"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteTraining(session)}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg cursor-pointer transition-all"
                              title="Borrar entrenamiento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Notas */}
                        {session.notas ? (
                          <div>
                            <span className="block text-[9px] font-extrabold uppercase text-slate-500 mb-0.5">Notas / Resumen</span>
                            <p className="text-xs text-slate-350 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850/40 leading-relaxed">
                              {session.notas}
                            </p>
                          </div>
                        ) : null}

                        {/* Ausencias */}
                        <div>
                          <span className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1">
                            Ausentes / Bajas ({absents.length})
                          </span>
                          {absents.length === 0 ? (
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/15 border border-emerald-900/20 px-2.5 py-1 rounded-lg">
                              ✔️ Asistencia 100% (Plantilla Completa)
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {absents.map(pid => {
                                const p = jugadores.find(j => j.id === pid);
                                return (
                                  <span
                                    key={pid}
                                    className="text-[10px] font-semibold bg-red-950/20 border border-red-900/30 text-red-400 px-2 py-0.5 rounded-md"
                                  >
                                    {p ? p.nombre : "Jugador eliminado"}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>

    {/* Modal de Acta de Partido (pantalla completa) */}
    {actaMatch && (
      <ActaPartido
        match={actaMatch}
        jugadores={jugadores}
        onClose={() => setActaMatch(null)}
      />
    )}
  </>
  );
}
