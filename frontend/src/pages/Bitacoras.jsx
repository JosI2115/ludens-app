import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { bitacorasService, usuariosService } from '../services/api'

const COLORES_MAESTRA = {
  default: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-400' },
}

const ESTADO_OPCIONES = [
  { value: '', label: '— Sin registrar' },
  { value: 'Logrado', label: '✅ Logrado' },
  { value: 'No Logrado', label: '❌ No Logrado' },
  { value: 'Tarea', label: '📤 Tarea' },
  { value: 'En Proceso', label: '🔄 En Proceso' },
  { value: 'Ya impresa', label: '🖨️ Ya impresa' },
]

const ESTADO_COLORES = {
  'Logrado': 'bg-green-100 text-green-700',
  'No Logrado': 'bg-red-100 text-red-700',
  'Tarea': 'bg-yellow-100 text-yellow-700',
  'En Proceso': 'bg-blue-100 text-blue-700',
  'Ya impresa': 'bg-gray-100 text-gray-600',
}

export default function Bitacoras() {
  const navigate = useNavigate()
  const [alumnos, setAlumnos] = useState([])
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null)
  const [bitacora, setBitacora] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingBitacora, setLoadingBitacora] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState({})
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    cargarAlumnos()
  }, [])

  const cargarAlumnos = async () => {
    try {
      const res = await bitacorasService.getVistaMaestra()
      setAlumnos(res.data)
    } catch (err) {
      console.error('Error cargando alumnos')
    } finally {
      setLoading(false)
    }
  }

  const cargarBitacora = async (alumno) => {
    setAlumnoSeleccionado(alumno)
    setLoadingBitacora(true)
    try {
      const res = await bitacorasService.getAlumno(alumno.id)
      setBitacora(res.data)
    } catch (err) {
      console.error('Error cargando bitácora')
    } finally {
      setLoadingBitacora(false)
    }
  }

  const actualizarRegistro = async (nomenclatura, campo, valor) => {
    if (!alumnoSeleccionado) return
    setGuardando(g => ({ ...g, [nomenclatura]: true }))
    try {
      await bitacorasService.actualizarRegistro(alumnoSeleccionado.id, nomenclatura, {
        [campo]: valor,
        registrado_por_nombre: usuario.nombre
      })
      setBitacora(prev => ({
        ...prev,
        programas: prev.programas.map(prog => ({
          ...prog,
          actividades: prog.actividades.map(act =>
            act.nomenclatura === nomenclatura
              ? { ...act, [campo]: valor, registrado_por_nombre: usuario.nombre }
              : act
          )
        }))
      }))
    } catch (err) {
      console.error('Error guardando')
    } finally {
      setGuardando(g => ({ ...g, [nomenclatura]: false }))
    }
  }

  const alumnosFiltrados = alumnos.filter(a =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const sinPrograma = alumnosFiltrados.filter(a => !a.programa_lectura && !a.programa_matematicas)
  const conPrograma = alumnosFiltrados.filter(a => a.programa_lectura || a.programa_matematicas)

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Bitácoras</h2>
          <input
            type="text"
            placeholder="Buscar alumno..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-4">Cargando...</p>
          ) : (
            <>
              {conPrograma.map(alumno => (
                <button
                  key={alumno.id}
                  onClick={() => cargarBitacora(alumno)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition text-sm ${
                    alumnoSeleccionado?.id === alumno.id
                      ? 'bg-purple-100 text-purple-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <p className="font-medium">{alumno.nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {alumno.programa_lectura || '—'} · {alumno.programa_matematicas || '—'}
                  </p>
                </button>
              ))}
              {sinPrograma.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 px-2 mb-2">Sin programa asignado</p>
                  {sinPrograma.map(alumno => (
                    <button
                      key={alumno.id}
                      onClick={() => navigate(`/alumnos/${alumno.id}`)}
                      className="w-full text-left px-3 py-2 rounded-lg mb-1 hover:bg-gray-50 text-sm text-gray-500"
                    >
                      <p>{alumno.nombre}</p>
                      <p className="text-xs text-orange-400">Asignar programa →</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50">
        {!alumnoSeleccionado ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-3">📒</p>
              <p className="text-lg font-medium">Selecciona un alumno</p>
              <p className="text-sm mt-1">para ver su bitácora</p>
            </div>
          </div>
        ) : loadingBitacora ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Cargando bitácora...</p>
          </div>
        ) : bitacora ? (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{bitacora.nombre}</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {bitacora.programas.map(p => p.programa).join(' · ')}
                </p>
              </div>
            </div>

            {bitacora.programas.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                <p className="text-yellow-700 font-medium">Este alumno no tiene programa asignado</p>
                <button
                  onClick={() => navigate(`/alumnos/${alumnoSeleccionado.id}`)}
                  className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Asignar programa
                </button>
              </div>
            ) : (
              bitacora.programas.map((prog, pi) => (
                <div key={pi} className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-bold text-gray-700">{prog.programa}</h3>
                    <span className="text-xs text-gray-400 capitalize">{prog.tipo}</span>
                    {prog.drive_url && (
                      <a
                        href={prog.drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-full transition"
                      >
                        📁 Ver en Drive
                      </a>
                    )}
                  </div>

                  <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 text-gray-500 font-medium w-8">Sem</th>
                          <th className="text-left px-4 py-3 text-gray-500 font-medium">Nomenclatura</th>
                          <th className="text-left px-4 py-3 text-gray-500 font-medium w-36">Estado</th>
                          <th className="text-left px-4 py-3 text-gray-500 font-medium w-36">Fecha</th>
                          <th className="text-left px-4 py-3 text-gray-500 font-medium w-20">Ejercicios</th>
                          <th className="text-left px-4 py-3 text-gray-500 font-medium">Comentario</th>
                          <th className="text-left px-4 py-3 text-gray-500 font-medium w-24">Registró</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {prog.actividades.map((act, ai) => (
                          <tr key={ai} className={`hover:bg-gray-50 ${act.estado ? '' : ''}`}>
                            <td className="px-4 py-2 text-gray-400 text-xs">{act.semana === 9 ? 'Ex' : act.semana}</td>
                            <td className="px-4 py-2">
                              <span className="font-mono text-xs text-gray-600">{act.nomenclatura}</span>
                              {act.actividad && <p className="text-xs text-gray-400 mt-0.5">{act.actividad}</p>}
                            </td>
                            <td className="px-2 py-1.5">
                              <select
                                value={act.estado || ''}
                                onChange={e => actualizarRegistro(act.nomenclatura, 'estado', e.target.value)}
                                disabled={guardando[act.nomenclatura]}
                                className={`w-full text-xs border border-gray-200 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400 ${
                                  act.estado ? ESTADO_COLORES[act.estado] || '' : 'text-gray-400'
                                }`}
                              >
                                {ESTADO_OPCIONES.map(op => (
                                  <option key={op.value} value={op.value}>{op.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={act.fecha || ''}
                                placeholder="Semana..."
                                onBlur={e => actualizarRegistro(act.nomenclatura, 'fecha', e.target.value)}
                                onChange={e => {
                                  setBitacora(prev => ({
                                    ...prev,
                                    programas: prev.programas.map((p, pii) =>
                                      pii === pi ? {
                                        ...p,
                                        actividades: p.actividades.map((a, aii) =>
                                          aii === ai ? { ...a, fecha: e.target.value } : a
                                        )
                                      } : p
                                    )
                                  }))
                                }}
                                className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={act.ejercicios || ''}
                                placeholder="0"
                                onBlur={e => actualizarRegistro(act.nomenclatura, 'ejercicios', e.target.value ? parseInt(e.target.value) : null)}
                                onChange={e => {
                                  setBitacora(prev => ({
                                    ...prev,
                                    programas: prev.programas.map((p, pii) =>
                                      pii === pi ? {
                                        ...p,
                                        actividades: p.actividades.map((a, aii) =>
                                          aii === ai ? { ...a, ejercicios: e.target.value } : a
                                        )
                                      } : p
                                    )
                                  }))
                                }}
                                className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={act.comentario || ''}
                                placeholder="Observaciones..."
                                onBlur={e => actualizarRegistro(act.nomenclatura, 'comentario', e.target.value)}
                                onChange={e => {
                                  setBitacora(prev => ({
                                    ...prev,
                                    programas: prev.programas.map((p, pii) =>
                                      pii === pi ? {
                                        ...p,
                                        actividades: p.actividades.map((a, aii) =>
                                          aii === ai ? { ...a, comentario: e.target.value } : a
                                        )
                                      } : p
                                    )
                                  }))
                                }}
                                className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                              />
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-400">{act.registrado_por_nombre || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
