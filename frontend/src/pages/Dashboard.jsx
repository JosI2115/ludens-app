import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardService } from '../services/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const [stats, setStats] = useState(null)
  const [pendientes, setPendientes] = useState([])
  const [cumpleanos, setCumpleanos] = useState([])
  const [mesCumple, setMesCumple] = useState(new Date().getMonth() + 1)
  const [loading, setLoading] = useState(true)

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  useEffect(() => {
    cargarStats()
  }, [])

  const cargarStats = async () => {
    try {
      const res = await dashboardService.stats()
      setStats(res.data)
      const pendientesRes = await dashboardService.pendientes()
      setPendientes(pendientesRes.data)
      const cumpleRes = await dashboardService.cumpleanos(new Date().getMonth() + 1)
      setCumpleanos(cumpleRes.data.alumnos)
    } catch (err) {
      console.error('Error cargando stats')
    } finally {
      setLoading(false)
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
              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Bajas este mes</p>
                <p className="text-3xl font-bold text-red-500">{stats.bajas_mes || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ingresos del mes</p>
                <p className="text-3xl font-bold text-blue-600">${(stats.total_ingresos || 0).toLocaleString('es-MX', {minimumFractionDigits: 0})}</p>
              </div>
            </div>

            {stats.por_sucursal && stats.por_sucursal.length > 0 && (
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

          {pendientes.length > 0 && (
            <div className="mb-8">
              <h3 className="text-base font-bold text-gray-700 mb-4">Pendientes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendientes.map((grupo, i) => (
                  <div key={i} className="bg-white rounded-xl shadow p-5">
                    <h4 className="font-bold text-gray-700 mb-3 text-sm">{grupo.categoria}</h4>
                    <div className="space-y-2">
                      {grupo.items.map((item, j) => (
                        <div key={j} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                          item.urgente ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
                        }`}>
                          {item.urgente && <span className="text-red-500 flex-shrink-0">⚠️</span>}
                          <span className="flex-1">{item.mensaje}</span>
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
            <button
              onClick={() => navigate('/pagos')}
              className="bg-white rounded-xl shadow p-5 text-center hover:shadow-md transition border border-transparent hover:border-purple-200"
            >
              <div className="text-3xl mb-2">💰</div>
              <p className="font-medium text-gray-800 text-sm">Pagos</p>
              {(stats.total_activos || 0) > 0 && (
                <span className="text-xs text-red-500 font-medium">
                  {stats.total_activos || 0} sin pagar
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/asistencias')}
              className="bg-white rounded-xl shadow p-5 text-center hover:shadow-md transition border border-transparent hover:border-purple-200"
            >
              <div className="text-3xl mb-2">📋</div>
              <p className="font-medium text-gray-800 text-sm">Asistencias</p>
            </button>
            <button
              onClick={() => navigate('/reportes')}
              className="bg-white rounded-xl shadow p-5 text-center hover:shadow-md transition border border-transparent hover:border-purple-200"
            >
              <div className="text-3xl mb-2">📊</div>
              <p className="font-medium text-gray-800 text-sm">Reportes</p>
            </button>
          </div>
        </>
      )}
    </div>
  )
}