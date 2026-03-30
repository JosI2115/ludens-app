import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const ESTADO_COLORES = {
  confirma_asiste:    { bg: 'bg-blue-600', text: 'text-white', label: 'Asiste' },
  prospecto:          { bg: 'bg-green-500', text: 'text-white', label: 'Prospecto' },
  confirma_no_asiste: { bg: 'bg-orange-400', text: 'text-white', label: 'No asiste' },
  nuevo_ingreso:      { bg: 'bg-purple-600', text: 'text-white', label: 'Nuevo ingreso' },
  sin_confirmar:      { bg: 'bg-transparent', text: 'text-gray-800', label: 'Sin confirmar' },
  recuperacion:       { bg: 'bg-yellow-400', text: 'text-gray-800', label: 'Recuperación' },
}

export default function Calendario() {
  const navigate = useNavigate()
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fechaInicio, setFechaInicio] = useState('')
  const [modalAlumno, setModalAlumno] = useState(null)
  const [modalRecup, setModalRecup] = useState(null)
  const [vistaActual, setVistaActual] = useState('general')
  const [datosMaestras, setDatosMaestras] = useState(null)
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    cargarCalendario()
    cargarCalendarioMaestras()
  }, [fechaInicio])

  const cargarCalendario = async () => {
    setLoading(true)
    try {
      const params = fechaInicio ? { fecha_inicio: fechaInicio } : {}
      const res = await api.get('/calendario/semana', { params })
      setDatos(res.data)
    } catch (err) {
      console.error('Error cargando calendario')
    } finally {
      setLoading(false)
    }
  }

  const cargarCalendarioMaestras = async () => {
    try {
      const params = fechaInicio ? { fecha_inicio: fechaInicio } : {}
      const res = await api.get('/calendario/maestras', { params })
      setDatosMaestras(res.data)
    } catch (err) {
      console.error('Error cargando calendario maestras')
    }
  }

  const confirmarAsistencia = async (alumno_id, fecha, confirmo) => {
    try {
      await api.post('/calendario/confirmar', { alumno_id, fecha, confirmo })
      cargarCalendario()
      setModalAlumno(null)
    } catch (err) {
      console.error('Error confirmando')
    }
  }

  const agendarRecuperacion = async (data) => {
    try {
      await api.post('/calendario/recuperacion', data)
      cargarCalendario()
      setModalRecup(null)
    } catch (err) {
      console.error('Error agendando recuperacion')
    }
  }

  const semanaAnterior = () => {
    const base = fechaInicio ? new Date(fechaInicio + 'T12:00:00') : new Date()
    base.setDate(base.getDate() - 7)
    setFechaInicio(base.toISOString().split('T')[0])
  }

  const semanaSiguiente = () => {
    const base = fechaInicio ? new Date(fechaInicio + 'T12:00:00') : new Date()
    base.setDate(base.getDate() + 7)
    setFechaInicio(base.toISOString().split('T')[0])
  }

  const semanaActual = () => setFechaInicio('')

  if (loading) return <div className="p-6 text-gray-400 text-center py-12">Cargando calendario...</div>
  if (!datos) return null

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Calendario semanal</h2>
        <div className="flex gap-2 items-center">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setVistaActual('general')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${vistaActual === 'general' ? 'bg-white shadow text-purple-700' : 'text-gray-600'}`}>
              👥 General
            </button>
            <button onClick={() => setVistaActual('maestras')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${vistaActual === 'maestras' ? 'bg-white shadow text-purple-700' : 'text-gray-600'}`}>
              👩‍🏫 Maestras
            </button>
          </div>
          <button onClick={semanaAnterior} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">← Anterior</button>
          <button onClick={semanaActual} className="px-3 py-1.5 bg-purple-100 text-purple-700 border border-purple-300 rounded-lg text-sm font-medium">Hoy</button>
          <button onClick={semanaSiguiente} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Siguiente →</button>
        </div>
      </div>

      {vistaActual === 'general' && (
      <div className="flex gap-3 mb-4 flex-wrap text-xs">
        {Object.entries(ESTADO_COLORES).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${val.bg} border border-gray-300`}></div>
            <span className="text-gray-600">{val.label}</span>
          </div>
        ))}
      </div>
      )}

      {vistaActual === 'general' && <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{minWidth: '900px'}}>
          <thead>
            <tr>
              <th className="w-24 px-2 py-3 text-left text-xs text-gray-500 font-medium bg-gray-50 border border-gray-200">Hora</th>
              {DIAS.map((dia, i) => (
                <th key={i} className="px-2 py-3 text-center text-xs font-medium bg-gray-50 border border-gray-200">
                  <p className="text-gray-700">{dia}</p>
                  <p className="text-gray-400 font-normal">{datos.semana[i]?.split('-').slice(1).reverse().join('/')}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.horas.map(hora => (
              <tr key={hora}>
                <td className="px-2 py-2 text-xs text-gray-500 font-medium bg-gray-50 border border-gray-200 align-top">
                  {hora}
                </td>
                {DIAS.map((_, diaIdx) => {
                  const alumnos = datos.calendario[hora]?.[String(diaIdx)] || []
                  const limite = alumnos.length >= 20
                  const casiBorde = alumnos.length >= 15 && alumnos.length < 20
                  return (
                    <td key={diaIdx}
                      className={`px-1 py-1 border border-gray-200 align-top min-w-28 ${
                        limite ? 'bg-red-50' : casiBorde ? 'bg-yellow-50' : 'bg-white'
                      }`}>
                      {limite && <p className="text-red-500 text-xs font-bold mb-1 text-center">⚠️ Límite</p>}
                      {casiBorde && <p className="text-yellow-600 text-xs font-medium mb-1 text-center">Casi lleno</p>}
                      <div className="space-y-0.5">
                        {alumnos.map((a, ai) => {
                          const color = ESTADO_COLORES[a.estado] || ESTADO_COLORES.sin_confirmar
                          return (
                            <div
                              key={ai}
                              onClick={() => setModalAlumno({ ...a, hora, fecha: datos.semana[diaIdx], diaIdx })}
                              className={`text-xs px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition border border-gray-200 ${color.bg} ${color.text}`}
                            >
                              {a.nombre}
                            </div>
                          )
                        })}
                      </div>
                      {alumnos.length > 0 && (
                        <p className="text-gray-300 text-xs text-right mt-1">{alumnos.length}</p>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>}

      {vistaActual === 'maestras' && datosMaestras && (
        <div className="overflow-x-auto">
          <div className="mb-4 flex gap-3 flex-wrap">
            {datosMaestras.maestras.map(m => (
              <div key={m.id} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: m.color}}></div>
                <span className="text-gray-600">{m.nombre}</span>
              </div>
            ))}
          </div>
          <table className="w-full border-collapse" style={{minWidth: '900px'}}>
            <thead>
              <tr>
                <th className="w-24 px-2 py-3 text-left text-xs text-gray-500 font-medium bg-gray-50 border border-gray-200">Hora</th>
                {DIAS.map((dia, i) => (
                  <th key={i} className="px-2 py-3 text-center text-xs font-medium bg-gray-50 border border-gray-200">
                    <p className="text-gray-700">{dia}</p>
                    <p className="text-gray-400 font-normal">{datosMaestras.semana[i]?.split('-').slice(1).reverse().join('/')}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datosMaestras.horas.map(hora => (
                <tr key={hora}>
                  <td className="px-2 py-2 text-xs text-gray-500 font-medium bg-gray-50 border border-gray-200 align-top">{hora}</td>
                  {DIAS.map((_, diaIdx) => {
                    const alumnos = datosMaestras.calendario[hora]?.[String(diaIdx)] || []
                    return (
                      <td key={diaIdx} className="px-1 py-1 border border-gray-200 align-top min-w-28 bg-white">
                        <div className="space-y-0.5">
                          {alumnos.map((a, ai) => (
                            <div key={ai}
                              className="text-xs px-1.5 py-0.5 rounded text-white cursor-pointer hover:opacity-80 transition"
                              style={{backgroundColor: a.color}}
                              title={`Maestra: ${a.maestra_nombre}`}
                            >
                              {a.nombre}
                            </div>
                          ))}
                        </div>
                        {alumnos.length > 0 && (
                          <p className="text-gray-300 text-xs text-right mt-1">{alumnos.length}</p>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAlumno && (
        <ModalAlumno
          alumno={modalAlumno}
          horas={datos.horas}
          semana={datos.semana}
          onClose={() => setModalAlumno(null)}
          onConfirmar={confirmarAsistencia}
          onRecuperacion={(data) => { setModalRecup(data); setModalAlumno(null) }}
          navigate={navigate}
        />
      )}

      {modalRecup && (
        <ModalRecuperacion
          alumno={modalRecup}
          horas={datos.horas}
          onClose={() => setModalRecup(null)}
          onAgendar={agendarRecuperacion}
        />
      )}
    </div>
  )
}

function ModalAlumno({ alumno, horas, semana, onClose, onConfirmar, onRecuperacion, navigate }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800">{alumno.nombre}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-500">📅 {alumno.fecha} · {alumno.hora}</p>
          <p className="text-sm font-medium text-gray-700">Confirmar asistencia:</p>
          <div className="flex gap-2">
            <button onClick={() => onConfirmar(alumno.alumno_id, alumno.fecha, true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">
              ✓ Asiste
            </button>
            <button onClick={() => onConfirmar(alumno.alumno_id, alumno.fecha, false)}
              className="flex-1 bg-orange-400 hover:bg-orange-500 text-white py-2 rounded-lg text-sm font-medium">
              ✗ No asiste
            </button>
            <button onClick={() => onConfirmar(alumno.alumno_id, alumno.fecha, null)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium">
              ? Sin confirmar
            </button>
          </div>
          <div className="pt-2 border-t flex gap-2">
            <button
              onClick={() => onRecuperacion({ alumno_id: alumno.alumno_id, nombre: alumno.nombre, fecha_original: alumno.fecha })}
              className="flex-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 py-2 rounded-lg text-sm font-medium">
              ⟳ Agendar recuperación
            </button>
            <button onClick={() => navigate(`/alumnos/${alumno.alumno_id}`)}
              className="flex-1 bg-purple-100 hover:bg-purple-200 text-purple-700 py-2 rounded-lg text-sm font-medium">
              Ver perfil
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalRecuperacion({ alumno, horas, onClose, onAgendar }) {
  const [fechaRecup, setFechaRecup] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')

  const handleAgendar = () => {
    if (!fechaRecup || !horaInicio) return
    onAgendar({
      alumno_id: alumno.alumno_id,
      fecha_original: alumno.fecha_original,
      fecha_recuperacion: fechaRecup,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800">⟳ Clase de recuperación</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">Alumno: <span className="font-medium">{alumno.nombre}</span></p>
          <p className="text-sm text-gray-500">Clase original: {alumno.fecha_original}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de recuperación</label>
            <input type="date" value={fechaRecup} onChange={e => setFechaRecup(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
              <select value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Seleccionar</option>
                {horas.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin</label>
              <select value={horaFin} onChange={e => setHoraFin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Seleccionar</option>
                {horas.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancelar</button>
            <button onClick={handleAgendar} disabled={!fechaRecup || !horaInicio}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white py-2 rounded-lg text-sm font-medium">
              Agendar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
