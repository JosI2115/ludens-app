import { useState, useEffect } from 'react'
import { asistenciasService } from '../services/api'

export default function Asistencias() {
  const hoy = new Date().toISOString().split('T')[0]
  const [fecha, setFecha] = useState(hoy)
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState({})

  useEffect(() => {
    cargarAlumnos()
  }, [fecha])

  const cargarAlumnos = async () => {
    try {
      setLoading(true)
      const response = await asistenciasService.getDia(fecha)
      setAlumnos(response.data)
    } catch (err) {
      console.error('Error cargando asistencias')
    } finally {
      setLoading(false)
    }
  }

  const registrar = async (alumno_id, asistio) => {
    setGuardando(g => ({ ...g, [alumno_id]: true }))
    try {
      await asistenciasService.registrar({ alumno_id, fecha, asistio })
      setAlumnos(prev => prev.map(a =>
        a.id === alumno_id ? { ...a, asistio } : a
      ))
    } catch (err) {
      console.error('Error registrando asistencia')
    } finally {
      setGuardando(g => ({ ...g, [alumno_id]: false }))
    }
  }

  const presentes = alumnos.filter(a => a.asistio === true).length
  const ausentes = alumnos.filter(a => a.asistio === false).length
  const sinRegistro = alumnos.filter(a => a.asistio === null).length

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Asistencias</h2>
        <input
          type="date"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alumnos.map((alumno) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}