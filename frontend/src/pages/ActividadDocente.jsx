import { useState, useEffect } from 'react'
import api from '../services/api'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const INCIDENCIAS = [
  { value: '', label: '— Normal' },
  { value: 'falta', label: '❌ Falta' },
  { value: 'vacaciones', label: '🏖️ Vacaciones' },
  { value: 'cita_medica', label: '🏥 Cita médica' },
  { value: 'permiso', label: '📋 Permiso' },
]

const INCIDENCIA_COLORES = {
  falta: 'bg-red-100 text-red-700',
  vacaciones: 'bg-blue-100 text-blue-700',
  cita_medica: 'bg-yellow-100 text-yellow-700',
  permiso: 'bg-purple-100 text-purple-700',
}

export default function ActividadDocente() {
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fechaInicio, setFechaInicio] = useState('')
  const [guardando, setGuardando] = useState({})
  const [editando, setEditando] = useState({})
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const puedeVerTodas = usuario.rol === 'directora' || usuario.es_encargada_general

  useEffect(() => {
    cargarActividades()
  }, [fechaInicio])

  const cargarActividades = async () => {
    setLoading(true)
    try {
      const params = fechaInicio ? { semana: fechaInicio } : {}
      const res = await api.get('/docentes/actividad', { params })
      setDatos(res.data)
    } catch (err) {
      console.error('Error cargando actividades')
    } finally {
      setLoading(false)
    }
  }

  const guardarActividad = async (usuario_id, fecha, actividad, incidencia) => {
    const key = `${usuario_id}_${fecha}`
    setGuardando(g => ({ ...g, [key]: true }))
    try {
      await api.put(`/docentes/actividad/${usuario_id}/${fecha}`, { actividad, incidencia })
      setEditando(e => ({ ...e, [key]: false }))
      cargarActividades()
    } catch (err) {
      console.error('Error guardando')
    } finally {
      setGuardando(g => ({ ...g, [key]: false }))
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

  if (loading) return <div className="p-6 text-center text-gray-400">Cargando...</div>
  if (!datos) return null

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Actividad Docente</h2>
        <div className="flex gap-2">
          <button onClick={semanaAnterior} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">← Anterior</button>
          <button onClick={() => setFechaInicio('')} className="px-3 py-1.5 bg-purple-100 text-purple-700 border border-purple-300 rounded-lg text-sm font-medium">Esta semana</button>
          <button onClick={semanaSiguiente} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Siguiente →</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{minWidth: '900px'}}>
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 w-32">Docente</th>
              {DIAS.map((dia, i) => (
                <th key={i} className="px-2 py-3 text-center text-xs font-medium bg-gray-50 border border-gray-200">
                  <p className="text-gray-700">{dia}</p>
                  <p className="text-gray-400 font-normal">{datos.semana[i]?.split('-').slice(1).reverse().join('/')}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.maestras.map((maestra, mi) => (
              <tr key={mi}>
                <td className="px-4 py-3 border border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2">
                    {maestra.color && (
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor: maestra.color}}></div>
                    )}
                    <span className="text-sm font-medium text-gray-700">{maestra.nombre}</span>
                  </div>
                </td>
                {maestra.dias.map((dia, di) => {
                  const key = `${maestra.usuario_id}_${dia.fecha}`
                  const puedEditar = puedeVerTodas || maestra.usuario_id === usuario.id
                  const estaEditando = editando[key]

                  return (
                    <td key={di} className={`border border-gray-200 align-top p-1 min-w-40 ${dia.bloqueado ? 'bg-gray-100' : 'bg-white'}`}>
                      {dia.bloqueado ? (
                        <div className={`text-xs px-2 py-1 rounded font-medium ${INCIDENCIA_COLORES[dia.incidencia] || 'bg-gray-200 text-gray-600'}`}>
                          {INCIDENCIAS.find(i => i.value === dia.incidencia)?.label || dia.incidencia}
                          {puedEditar && (
                            <button onClick={() => guardarActividad(maestra.usuario_id, dia.fecha, null, '')}
                              className="ml-2 text-gray-400 hover:text-gray-600">✕</button>
                          )}
                        </div>
                      ) : estaEditando ? (
                        <EditarDia
                          dia={dia}
                          onGuardar={(actividad, incidencia) => guardarActividad(maestra.usuario_id, dia.fecha, actividad, incidencia)}
                          onCancelar={() => setEditando(e => ({ ...e, [key]: false }))}
                          guardando={guardando[key]}
                        />
                      ) : (
                        <div
                          onClick={() => puedEditar && setEditando(e => ({ ...e, [key]: true }))}
                          className={`min-h-16 text-xs text-gray-600 p-1 rounded ${puedEditar ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                        >
                          {dia.actividad ? (
                            <p className="leading-relaxed">{dia.actividad}</p>
                          ) : (
                            puedEditar && <p className="text-gray-300 italic">Clic para agregar...</p>
                          )}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EditarDia({ dia, onGuardar, onCancelar, guardando }) {
  const [actividad, setActividad] = useState(dia.actividad || '')
  const [incidencia, setIncidencia] = useState(dia.incidencia || '')

  return (
    <div className="space-y-1">
      <select value={incidencia} onChange={e => setIncidencia(e.target.value)}
        className="w-full text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400">
        {INCIDENCIAS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
      </select>
      {!incidencia && (
        <textarea
          value={actividad}
          onChange={e => setActividad(e.target.value)}
          placeholder="Describe las actividades del día..."
          rows={4}
          className="w-full text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none"
        />
      )}
      <div className="flex gap-1">
        <button onClick={() => onGuardar(actividad, incidencia)}
          disabled={guardando}
          className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white py-1 rounded text-xs font-medium">
          {guardando ? '...' : 'Guardar'}
        </button>
        <button onClick={onCancelar}
          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs">
          ✕
        </button>
      </div>
    </div>
  )
}
