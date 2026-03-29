import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function Calendario() {
  const navigate = useNavigate()
  const [calendario, setCalendario] = useState({})
  const [loading, setLoading] = useState(true)
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDay() === 0 ? 1 : new Date().getDay() - 1)

  useEffect(() => {
    cargarCalendario()
  }, [])

  const cargarCalendario = async () => {
    try {
      const res = await api.get('/auth/calendario')
      setCalendario(res.data)
    } catch (err) {
      console.error('Error cargando calendario')
    } finally {
      setLoading(false)
    }
  }

  const alumnosHoy = calendario[diaSeleccionado] || []

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Calendario semanal</h2>
        <p className="text-sm text-gray-500">{alumnosHoy.length} alumnos hoy</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {DIAS.map((dia, i) => (
          <button key={i} onClick={() => setDiaSeleccionado(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex-1 min-w-20 ${
              diaSeleccionado === i
                ? 'bg-purple-600 text-white shadow'
                : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
            }`}>
            <p>{dia}</p>
            <p className={`text-xs mt-0.5 ${diaSeleccionado === i ? 'text-purple-200' : 'text-gray-400'}`}>
              {(calendario[i] || []).length} alumnos
            </p>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Cargando...</p>
      ) : alumnosHoy.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-lg font-medium">Sin alumnos este día</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Hora</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Alumno</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Grado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alumnosHoy.map((a, i) => (
                <tr key={i} className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/alumnos/${a.alumno_id}`)}>
                  <td className="px-4 py-3">
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
                      {a.hora || 'Sin hora'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-purple-600">{a.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{a.grado || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
