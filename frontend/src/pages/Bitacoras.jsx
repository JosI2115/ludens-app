import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { bitacorasService, maestrasService, usuariosService } from '../services/api'

const COLORES_MAESTRA = {
  default: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-400' },
}

const ESTADO_OPCIONES = [
  { value: '', label: '— Sin registrar' },
  { value: 'Logrado', label: '✅ Logrado' },
  { value: 'No Logrado', label: '❌ No Logrado' },
  { value: 'Tarea', label: '📤 Tarea' },
  { value: 'En Proceso', label: '🔄 En Proceso' },
  { value: 'Imprimir', label: '🖨️ Imprimir' },
  { value: 'Ya impresa', label: '✔️ Ya impresa' },
]

const ESTADO_COLORES = {
  'Logrado': 'bg-green-100 text-green-700',
  'No Logrado': 'bg-red-100 text-red-700',
  'Tarea': 'bg-yellow-100 text-yellow-700',
  'En Proceso': 'bg-blue-100 text-blue-700',
  'Imprimir': 'bg-purple-100 text-purple-700',
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
  const [fechaGlobal, setFechaGlobal] = useState('')
  const [filtraMaestra, setFiltraMaestra] = useState('')
  const [maestras, setMaestras] = useState([])
  const [mostrarImpresion, setMostrarImpresion] = useState(false)
  const [pendientesImpresion, setPendientesImpresion] = useState({})
  const [programasColapsados, setProgramasColapsados] = useState({})
  const [seleccionadas, setSeleccionadas] = useState({})
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [estadoMasivo, setEstadoMasivo] = useState('')
  const [fechaMasiva, setFechaMasiva] = useState('')
  const [mostrarUrls, setMostrarUrls] = useState(false)
  const [programasLista, setProgramasLista] = useState([])
  const [urlsEditadas, setUrlsEditadas] = useState({})
  const [guardandoUrls, setGuardandoUrls] = useState(false)
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    cargarAlumnos()
    cargarMaestras()
  }, [])

  const cargarMaestras = async () => {
    try {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
      let res
      if (usuario.rol === 'directora' || usuario.rol === 'contadora') {
        res = await usuariosService.getAll()
        setMaestras(res.data.filter(u => u.rol === 'maestra' || u.rol === 'encargada'))
      } else {
        res = await maestrasService.getPorSucursal(usuario.sucursal_id)
        setMaestras(res.data)
      }
    } catch (err) {
      console.error('Error cargando maestras')
    }
  }

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

  const cargarPendientesImpresion = async () => {
    try {
      const res = await bitacorasService.getPendientesImpresion()
      setPendientesImpresion(res.data)
      setMostrarImpresion(true)
    } catch (err) {
      console.error('Error')
    }
  }

  const aplicarFechaGlobal = async () => {
    if (!fechaGlobal || !alumnoSeleccionado || !bitacora) return
    const promesas = []
    bitacora.programas.forEach(prog => {
      prog.actividades.forEach(act => {
        if (!act.fecha) {
          promesas.push(actualizarRegistro(act.nomenclatura, 'fecha', fechaGlobal))
        }
      })
    })
    await Promise.all(promesas)
  }

  const toggleSeleccion = (nomenclatura) => {
    setSeleccionadas(prev => ({
      ...prev,
      [nomenclatura]: !prev[nomenclatura]
    }))
  }

  const seleccionarTodas = (actividades) => {
    const nuevas = {}
    actividades.forEach(a => { nuevas[a.nomenclatura] = true })
    setSeleccionadas(prev => ({ ...prev, ...nuevas }))
  }

  const limpiarSeleccion = () => {
    setSeleccionadas({})
    setEstadoMasivo('')
    setFechaMasiva('')
  }

  const aplicarMasivo = async () => {
    const seleccionadasList = Object.keys(seleccionadas).filter(k => seleccionadas[k])
    if (seleccionadasList.length === 0) return
    if (!estadoMasivo && !fechaMasiva) return

    const promesas = seleccionadasList.map(nomenclatura => {
      const data = {}
      if (estadoMasivo) data.estado = estadoMasivo
      if (fechaMasiva) data.fecha = fechaMasiva
      return actualizarRegistro(nomenclatura, Object.keys(data)[0], Object.values(data)[0])
    })

    await Promise.all(promesas)

    if (estadoMasivo && fechaMasiva) {
      const promesas2 = seleccionadasList.map(n => actualizarRegistro(n, 'fecha', fechaMasiva))
      await Promise.all(promesas2)
    }

    limpiarSeleccion()
    setModoSeleccion(false)
  }

  const togglePrograma = (programa) => {
    setProgramasColapsados(prev => ({
      ...prev,
      [programa]: !prev[programa]
    }))
  }

  const cargarProgramasLista = async () => {
    try {
      const res = await bitacorasService.getProgramasLista()
      setProgramasLista(res.data)
      const urls = {}
      res.data.forEach(p => { urls[p.programa] = p.drive_url || '' })
      setUrlsEditadas(urls)
      setMostrarUrls(true)
    } catch (err) {
      console.error('Error')
    }
  }

  const guardarUrls = async () => {
    setGuardandoUrls(true)
    try {
      const promesas = Object.entries(urlsEditadas).map(([prog, url]) =>
        bitacorasService.actualizarUrlPrograma(prog, url)
      )
      await Promise.all(promesas)
      setMostrarUrls(false)
      alert('URLs guardadas correctamente')
    } catch (err) {
      alert('Error guardando URLs')
    } finally {
      setGuardandoUrls(false)
    }
  }

  const agruparRangos = (items) => {
    if (!items || items.length === 0) return []

    const grupos = {}
    items.forEach(item => {
      const partes = item.nomenclatura.split('.')
      const numero = parseInt(partes[partes.length - 1])
      const base = partes.slice(0, -1).join('.')
      if (!grupos[base]) grupos[base] = { base, numeros: [], items: [] }
      grupos[base].numeros.push(numero)
      grupos[base].items.push(item)
    })

    return Object.values(grupos).map(grupo => {
      const nums = grupo.numeros.sort((a, b) => a - b)
      const min = nums[0]
      const max = nums[nums.length - 1]
      const esRango = max - min === nums.length - 1
      return {
        rango: esRango && nums.length > 1
          ? `${grupo.base}.${min} a ${grupo.base}.${max}`
          : nums.map(n => `${grupo.base}.${n}`).join(', '),
        drive_url: grupo.items[0].drive_url,
        alumno: grupo.items[0].alumno,
        alumno_id: grupo.items[0].alumno_id,
        count: nums.length
      }
    })
  }

  const alumnosFiltrados = alumnos.filter(a =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
    (filtraMaestra === '' || a.maestra_id === filtraMaestra)
  )

  const sinPrograma = alumnosFiltrados.filter(a => !a.programa_lectura && !a.programa_matematicas)
  const conPrograma = alumnosFiltrados.filter(a => a.programa_lectura || a.programa_matematicas)

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-800">Bitácoras</h2>
            <div className="flex gap-1">
              {usuario.rol === 'directora' && (
                <button
                  onClick={cargarProgramasLista}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg transition"
                >
                  ⚙️
                </button>
              )}
              <button
                onClick={cargarPendientesImpresion}
                className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded-lg transition"
              >
                🖨️ Imprimir
              </button>
            </div>
          </div>
          <input
            type="text"
            placeholder="Buscar alumno..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <select
            value={filtraMaestra}
            onChange={e => setFiltraMaestra(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 mt-2"
          >
            <option value="">Todas las maestras</option>
            {maestras.map(m => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
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
                {bitacora.objetivo && (
                  <div className="mt-2 bg-purple-50 border border-purple-100 rounded-lg px-4 py-2">
                    <p className="text-xs text-purple-500 font-medium uppercase tracking-wide">Objetivo</p>
                    <p className="text-sm text-purple-800 mt-0.5">{bitacora.objetivo}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 items-center mb-6 bg-white rounded-xl shadow p-4">
              <span className="text-xs text-gray-400 flex-shrink-0">Enter = Logrado</span>
              <button
                onClick={() => { setModoSeleccion(!modoSeleccion); limpiarSeleccion() }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex-shrink-0 ${
                  modoSeleccion ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {modoSeleccion ? '✕ Cancelar' : '☑️ Seleccionar'}
              </button>
            </div>

            {modoSeleccion && (
              <div className="flex gap-3 items-center mb-4 bg-purple-50 border border-purple-200 rounded-xl p-4 flex-wrap">
                <span className="text-sm text-purple-700 font-medium flex-shrink-0">
                  {Object.values(seleccionadas).filter(Boolean).length} seleccionadas
                </span>
                <select value={estadoMasivo} onChange={e => setEstadoMasivo(e.target.value)}
                  className="border border-purple-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                  <option value="">— Estado —</option>
                  {ESTADO_OPCIONES.filter(o => o.value).map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
                <input type="text" value={fechaMasiva} onChange={e => setFechaMasiva(e.target.value)}
                  placeholder="Fecha (ej: 24 al 29 de Marzo)"
                  className="border border-purple-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 flex-1 min-w-32" />
                <button onClick={aplicarMasivo}
                  disabled={Object.values(seleccionadas).filter(Boolean).length === 0 || (!estadoMasivo && !fechaMasiva)}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-4 py-1.5 rounded-lg text-sm font-medium flex-shrink-0">
                  Aplicar a seleccionadas
                </button>
              </div>
            )}

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
                  <div
                    className="flex items-center gap-3 mb-4 cursor-pointer select-none"
                    onClick={() => togglePrograma(prog.programa)}
                  >
                    <span className="text-gray-400 text-sm">
                      {programasColapsados[prog.programa] ? '▶' : '▼'}
                    </span>
                    <h3 className="text-lg font-bold text-gray-700">{prog.programa}</h3>
                    <span className="text-xs text-gray-400 capitalize">{prog.tipo}</span>
                    {prog.drive_url && (
                      <a
                        href={prog.drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-full transition"
                      >
                        📁 Ver en Drive
                      </a>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">
                      {prog.actividades.filter(a => a.estado).length}/{prog.actividades.length} registradas
                    </span>
                  </div>

                  {!programasColapsados[prog.programa] && (
                  <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {modoSeleccion && <th className="px-2 py-3 w-8"></th>}
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
                            {modoSeleccion && (
                              <td className="px-2 py-1.5">
                                <input type="checkbox"
                                  checked={!!seleccionadas[act.nomenclatura]}
                                  onChange={() => toggleSeleccion(act.nomenclatura)}
                                  className="w-4 h-4 text-purple-600 rounded"
                                />
                              </td>
                            )}
                            <td className="px-4 py-2 text-gray-400 text-xs">{act.semana === 9 ? 'Ex' : act.semana}</td>
                            <td className="px-4 py-2">
                              <span className="font-mono text-xs text-gray-600">{act.nomenclatura}</span>
                              {act.actividad && <p className="text-xs text-gray-400 mt-0.5">{act.actividad}</p>}
                            </td>
                            <td className="px-2 py-1.5">
                              <select
                                value={act.estado || ''}
                                onChange={e => actualizarRegistro(act.nomenclatura, 'estado', e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    actualizarRegistro(act.nomenclatura, 'estado', 'Logrado')
                                  }
                                }}
                                disabled={guardando[act.nomenclatura]}
                                tabIndex={0}
                                className={`w-full text-xs border border-gray-200 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer ${
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
                  )}
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
      {mostrarImpresion && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">🖨️ Pendientes de impresión</h3>
            <button onClick={() => setMostrarImpresion(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <div className="p-6">
            {Object.keys(pendientesImpresion).length === 0 ? (
              <p className="text-center text-gray-400 py-8">No hay actividades pendientes de impresión</p>
            ) : (
              Object.entries(pendientesImpresion).map(([maestra, items]) => (
                <div key={maestra} className="mb-6">
                  <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>
                    {maestra}
                    <span className="text-xs text-gray-400 font-normal">({items.length} actividades)</span>
                  </h4>
                  <div className="space-y-2">
                    {agruparRangos(items).map((grupo, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{grupo.alumno}</p>
                        <p className="text-xs text-gray-500 font-mono">{grupo.rango}</p>
                        <p className="text-xs text-gray-400">{grupo.count} actividades</p>
                      </div>
                      {grupo.drive_url ? (
                        <a href={grupo.drive_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-full transition flex-shrink-0">
                          📁 Abrir Drive
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">Sin URL</span>
                      )}
                    </div>
                  ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}
      {mostrarUrls && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">⚙️ URLs de Drive por programa</h3>
              <button onClick={() => setMostrarUrls(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-3">
              {programasLista.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-gray-700 w-24 flex-shrink-0">{p.programa}</span>
                  <input
                    type="text"
                    value={urlsEditadas[p.programa] || ''}
                    onChange={e => setUrlsEditadas(prev => ({ ...prev, [p.programa]: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setMostrarUrls(false)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm">
                Cancelar
              </button>
              <button onClick={guardarUrls} disabled={guardandoUrls}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-4 py-2 rounded-lg text-sm font-medium">
                {guardandoUrls ? 'Guardando...' : 'Guardar todas las URLs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
