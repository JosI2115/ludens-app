import { useState, useEffect } from 'react'
import { asistenciasService } from '../services/api'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function Asistencias() {
  const hoy = new Date().toISOString().split('T')[0]
  const [fecha, setFecha] = useState(hoy)
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState({})
  const [verTodos, setVerTodos] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [historial, setHistorial] = useState(null)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [historialInicio, setHistorialInicio] = useState('')
  const [historialFin, setHistorialFin] = useState('')
  const [historialAlumnoId, setHistorialAlumnoId] = useState('')

  useEffect(() => {
    cargarAlumnos()
  }, [fecha, verTodos])

  const cargarAlumnos = async () => {
    try {
      setLoading(true)
      const response = await asistenciasService.getDia(fecha, verTodos)
      setAlumnos(response.data)
    } catch (err) {
      console.error('Error cargando asistencias')
    } finally {
      setLoading(false)
    }
  }

  const registrar = async (alumno_id, asistio) => {
    const alumno = alumnos.find(a => a.id === alumno_id)
    setGuardando(g => ({ ...g, [alumno_id]: true }))
    try {
      if (alumno?.asistio === asistio) {
        await asistenciasService.eliminar(alumno_id, fecha)
        setAlumnos(prev => prev.map(a =>
          a.id === alumno_id ? { ...a, asistio: null } : a
        ))
      } else {
        await asistenciasService.registrar({ alumno_id, fecha, asistio })
        setAlumnos(prev => prev.map(a =>
          a.id === alumno_id ? { ...a, asistio } : a
        ))
      }
    } catch (err) {
      console.error('Error registrando asistencia')
    } finally {
      setGuardando(g => ({ ...g, [alumno_id]: false }))
    }
  }

  const verHistorial = (alumno_id) => {
    setHistorialAlumnoId(alumno_id)
    setHistorialInicio('')
    setHistorialFin('')
    setHistorial(null)
    setMostrarHistorial(true)
  }

  const buscarHistorial = async () => {
    if (!historialAlumnoId || !historialInicio || !historialFin) return
    setLoadingHistorial(true)
    try {
      const res = await asistenciasService.getHistorial(historialAlumnoId, historialInicio, historialFin)
      setHistorial(res.data)
    } catch (err) {
      console.error('Error')
    } finally {
      setLoadingHistorial(false)
    }
  }

  const alumnosFiltrados = alumnos.filter(a =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const presentes = alumnos.filter(a => a.asistio === true).length
  const ausentes = alumnos.filter(a => a.asistio === false).length
  const sinRegistro = alumnos.filter(a => a.asistio === null).length

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Asistencias</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Solo los de hoy</span>
            <button
              onClick={() => setVerTodos(!verTodos)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                verTodos ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                verTodos ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <span className="text-sm text-gray-600">Ver todos</span>
          </div>
          <input
            type="text"
            placeholder="Buscar alumno..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
          <p className="text-xs text-gray-500">Presentes</p>
          <p className="text-2xl font-bold text-gray-800">{presentes}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-500">
          <p className="text-xs text-gray-500">Ausentes</p>
          <p className="text-2xl font-bold text-gray-800">{ausentes}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-gray-300">
          <p className="text-xs text-gray-500">Sin registrar</p>
          <p className="text-2xl font-bold text-gray-800">{sinRegistro}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando alumnos...</div>
      ) : alumnos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No hay alumnos activos</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Alumno</th>
                <th className="text-center px-4 py-3 text-gray-600 font-medium">Asistencia</th>
                <th className="text-center px-4 py-3 text-gray-600 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alumnosFiltrados.map((alumno) => (
                <tr key={alumno.id} className={`hover:bg-gray-50 ${
                  alumno.asistio === true ? 'bg-green-50' :
                  alumno.asistio === false ? 'bg-red-50' : ''
                }`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{alumno.nombre}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => registrar(alumno.id, true)}
                        disabled={guardando[alumno.id]}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
                          alumno.asistio === true
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                        }`}
                      >
                        ✓ Asistió
                      </button>
                      <button
                        onClick={() => registrar(alumno.id, false)}
                        disabled={guardando[alumno.id]}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
                          alumno.asistio === false
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700'
                        }`}
                      >
                        ✗ Faltó
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => verHistorial(alumno.id)}
                      className="text-xs text-gray-400 hover:text-purple-600 transition"
                      title="Ver historial"
                    >
                      📅
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mostrarHistorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">
                📅 Historial — {historial?.alumno || ''}
              </h3>
              <button onClick={() => setMostrarHistorial(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
                  <input type="date" value={historialInicio} onChange={e => setHistorialInicio(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
                  <input type="date" value={historialFin} onChange={e => setHistorialFin(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
              <button onClick={buscarHistorial} disabled={loadingHistorial || !historialInicio || !historialFin}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white py-2 rounded-lg text-sm font-medium">
                {loadingHistorial ? 'Buscando...' : 'Buscar'}
              </button>

              {historial && (
                <div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-700">{historial.presentes}</p>
                      <p className="text-xs text-gray-500">Presentes</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-700">{historial.ausentes}</p>
                      <p className="text-xs text-gray-500">Ausentes</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-purple-700">{historial.porcentaje}%</p>
                      <p className="text-xs text-gray-500">Asistencia</p>
                    </div>
                  </div>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {historial.registros.map((r, i) => (
                      <div key={i} className={`flex justify-between px-3 py-1.5 rounded-lg text-sm ${r.asistio ? 'bg-green-50' : 'bg-red-50'}`}>
                        <span className="text-gray-600">{r.fecha}</span>
                        <span className={r.asistio ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {r.asistio ? '✓ Asistió' : '✗ Faltó'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}