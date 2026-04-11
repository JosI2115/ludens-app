import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardService } from '../services/api'
import api from '../services/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const [stats, setStats] = useState(null)
  const [pendientes, setPendientes] = useState([])
  const [cumpleanos, setCumpleanos] = useState([])
  const [mesCumple, setMesCumple] = useState(new Date().getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [avisos, setAvisos] = useState([])
  const [nuevoAviso, setNuevoAviso] = useState('')
  const [mostrarFormAviso, setMostrarFormAviso] = useState(false)
  const [pendientesPersonales, setPendientesPersonales] = useState([])
  const [nuevoPendiente, setNuevoPendiente] = useState('')

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  useEffect(() => {
    cargarStats()
    cargarAvisos()
    cargarPendientesPersonales()
  }, [])

  const cargarPendientes = async () => {
    try {
      const res = await api.get('/auth/dashboard/pendientes')
      setPendientes(res.data)
    } catch (err) {
      console.error('Error pendientes')
    }
  }

  const cargarStats = async () => {
    try {
      const res = await dashboardService.stats()
      setStats(res.data)
      cargarPendientes()
      const cumpleRes = await dashboardService.cumpleanos(new Date().getMonth() + 1)
      setCumpleanos(cumpleRes.data.alumnos)
    } catch (err) {
      console.error('Error cargando stats')
    } finally {
      setLoading(false)
    }
  }

  const cargarPendientesPersonales = async () => {
    try {
      const res = await api.get('/auth/pendientes-personales')
      setPendientesPersonales(res.data)
    } catch (err) {
      console.error('Error')
    }
  }

  const agregarPendiente = async () => {
    if (!nuevoPendiente.trim()) return
    try {
      await api.post('/auth/pendientes-personales', { texto: nuevoPendiente })
      setNuevoPendiente('')
      cargarPendientesPersonales()
    } catch (err) {
      console.error('Error')
    }
  }

  const completarPendiente = async (id) => {
    try {
      await api.delete(`/auth/pendientes-personales/${id}`)
      cargarPendientesPersonales()
    } catch (err) {
      console.error('Error')
    }
  }

  const cargarAvisos = async () => {
    try {
      const res = await api.get('/auth/avisos')
      setAvisos(res.data)
    } catch (err) {
      console.error('Error cargando avisos')
    }
  }

  const publicarAviso = async () => {
    if (!nuevoAviso.trim()) return
    try {
      await api.post('/auth/avisos', { mensaje: nuevoAviso })
      setNuevoAviso('')
      setMostrarFormAviso(false)
      cargarAvisos()
    } catch (err) {
      console.error('Error publicando aviso')
    }
  }

  const eliminarAviso = async (id) => {
    try {
      await api.delete(`/auth/avisos/${id}`)
      cargarAvisos()
    } catch (err) {
      console.error('Error eliminando aviso')
    }
  }

  const cumpleanosHoy = cumpleanos.filter(a => {
    const hoy = new Date()
    const fecha = new Date(a.fecha_nacimiento + 'T12:00:00')
    return fecha.getDate() === hoy.getDate() && fecha.getMonth() === hoy.getMonth()
  })

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">
          Bienvenida, {usuario.nombre}
        </h2>
        <p className="text-gray-400 text-sm mt-1 capitalize">
          {usuario.rol} {usuario.sucursal_nombre ? `· ${usuario.sucursal_nombre}` : '· Todas las sucursales'}
        </p>
      </div>

      {cumpleanosHoy.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎂</span>
            <div>
              <p className="font-bold text-lg">
                {cumpleanosHoy.length === 1
                  ? `¡Hoy cumple años ${cumpleanosHoy[0].nombre}!`
                  : `¡Hoy cumplen años ${cumpleanosHoy.length} alumnos!`}
              </p>
              {cumpleanosHoy.length > 1 && (
                <p className="text-purple-100 text-sm mt-0.5">
                  {cumpleanosHoy.map(a => a.nombre).join(', ')}
                </p>
              )}
              {cumpleanosHoy.length === 1 && (
                <p className="text-purple-100 text-sm mt-0.5">
                  Cumple {cumpleanosHoy[0].edad_cumple} años hoy 🎉
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : stats && (
        <>
          <p className="text-sm text-gray-500 mb-4 font-medium">
            Resumen de {MESES[stats.mes - 1]} {stats.anio}
          </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Alumnos activos</p>
                <p className="text-3xl font-bold text-purple-600">{stats.total_activos || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Nuevos este mes</p>
                <p className="text-3xl font-bold text-green-600">{stats.nuevos_mes || 0}</p>
              </div>
              {usuario.rol !== 'maestra' && (
                <div className="bg-white rounded-xl shadow p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Bajas este mes</p>
                  <p className="text-3xl font-bold text-red-500">{stats.bajas_mes || 0}</p>
                </div>
              )}
              {usuario.rol !== 'maestra' && (
                <div className="bg-white rounded-xl shadow p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ingresos del mes</p>
                  <p className="text-3xl font-bold text-blue-600">${(stats.total_ingresos || 0).toLocaleString('es-MX', {minimumFractionDigits: 0})}</p>
                </div>
              )}
            </div>

            {(usuario.rol === 'directora' || usuario.es_encargada_general || usuario.rol === 'contadora') && stats.por_sucursal && stats.por_sucursal.length > 0 && (
              <div className="bg-white rounded-xl shadow p-5 mb-8">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Alumnos por sucursal</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {stats.por_sucursal.map((s, i) => (
                    <div key={i} className="bg-purple-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-purple-600">{s.total}</p>
                      <p className="text-xs text-gray-500 mt-1">{s.sucursal}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {avisos.length > 0 && (
            <div className="mb-6">
              {avisos.map((a, i) => (
                <div key={i} className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-2">
                  <span className="text-blue-500 text-lg flex-shrink-0">📢</span>
                  <div className="flex-1">
                    <p className="text-sm text-blue-800">{a.mensaje}</p>
                    <p className="text-xs text-blue-400 mt-1">{a.autor} · {a.created_at?.split('T')[0]}</p>
                  </div>
                  {(usuario.rol === 'directora' || usuario.rol === 'recepcionista' || usuario.rol === 'encargada') && (
                    <button onClick={() => eliminarAviso(a.id)} className="text-blue-300 hover:text-blue-500 text-xs">✕</button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mb-6 bg-white rounded-xl shadow p-5">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">✅ Mis pendientes</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={nuevoPendiente}
                onChange={e => setNuevoPendiente(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && agregarPendiente()}
                placeholder="Agregar pendiente..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button onClick={agregarPendiente}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                + Agregar
              </button>
            </div>
            {pendientesPersonales.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">Sin pendientes</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {pendientesPersonales.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">{p.texto}</span>
                    <button onClick={() => completarPendiente(p.id)}
                      className="text-green-500 hover:text-green-700 text-xs font-medium ml-3">
                      ✓ Listo
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(usuario.rol === 'directora' || usuario.rol === 'recepcionista' || usuario.rol === 'encargada') && (
            <div className="mb-6">
              {!mostrarFormAviso ? (
                <button onClick={() => setMostrarFormAviso(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  + Publicar aviso
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nuevoAviso}
                    onChange={e => setNuevoAviso(e.target.value)}
                    placeholder="Escribe el aviso para todo el equipo..."
                    className="flex-1 border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    onKeyDown={e => e.key === 'Enter' && publicarAviso()}
                  />
                  <button onClick={publicarAviso}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Publicar
                  </button>
                  <button onClick={() => setMostrarFormAviso(false)}
                    className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          {pendientes.length > 0 && (
            <div className="mb-8">
              <h3 className="text-base font-bold text-gray-700 mb-4">Pendientes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendientes.map((grupo, i) => (
                  <div key={i} className="bg-white rounded-xl shadow p-5">
                    <h4 className="font-bold text-gray-700 mb-3 text-sm">{grupo.categoria}</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {grupo.items.map((item, j) => (
                        <div key={j} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                          item.urgente ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
                        }`}>
                          {item.urgente && <span className="text-red-500 flex-shrink-0">⚠️</span>}
                          <span className="flex-1">{item.mensaje}</span>
                          {item.tipo === 'seguimiento_informe' && (
                            <button
                              onClick={async () => {
                                try {
                                  await api.put(`/informes/${item.informe_id}`, {
                                    situacion: item.nueva_etapa,
                                    ultimo_contacto: new Date().toISOString().split('T')[0]
                                  })
                                  cargarPendientes()
                                } catch (err) {
                                  console.error('Error')
                                }
                              }}
                              className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded font-medium flex-shrink-0"
                            >
                              ✓ Listo
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-gray-700">🎂 Cumpleaños</h3>
              <select
                value={mesCumple}
                onChange={async e => {
                  const mes = parseInt(e.target.value)
                  setMesCumple(mes)
                  const res = await dashboardService.cumpleanos(mes)
                  setCumpleanos(res.data.alumnos)
                }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="bg-white rounded-xl shadow p-5">
              {cumpleanos.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">Sin cumpleaños este mes</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {cumpleanos.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 bg-purple-50 rounded-lg px-4 py-3">
                      <div className="text-2xl font-bold text-purple-600 w-8 text-center">{a.dia}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{a.nombre}</p>
                        <p className="text-xs text-gray-500">Cumple {a.edad_cumple} años</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <h3 className="text-base font-bold text-gray-700 mb-4">Accesos rápidos</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/alumnos')}
              className="bg-white rounded-xl shadow p-5 text-center hover:shadow-md transition border border-transparent hover:border-purple-200"
            >
              <div className="text-3xl mb-2">👨‍🎓</div>
              <p className="font-medium text-gray-800 text-sm">Alumnos</p>
            </button>
            {usuario.rol !== 'maestra' && (
              <button
                onClick={() => navigate('/pagos')}
                className="bg-white rounded-xl shadow p-5 text-center hover:shadow-md transition border border-transparent hover:border-purple-200"
              >
                <div className="text-3xl mb-2">💰</div>
                <p className="font-medium text-gray-800 text-sm">Pagos</p>
              </button>
            )}
            {usuario.rol !== 'contadora' && (
              <button
                onClick={() => navigate('/asistencias')}
                className="bg-white rounded-xl shadow p-5 text-center hover:shadow-md transition border border-transparent hover:border-purple-200"
              >
                <div className="text-3xl mb-2">📋</div>
                <p className="font-medium text-gray-800 text-sm">Asistencias</p>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}