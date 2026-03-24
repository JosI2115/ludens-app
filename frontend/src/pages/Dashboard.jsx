import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardService } from '../services/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const [stats, setStats] = useState(null)
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
    } catch (err) {
      console.error('Error cargando stats')
    } finally {
      setLoading(false)
    }
  }

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

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : stats && (
        <>
          <p className="text-sm text-gray-500 mb-4 font-medium">
            Resumen de {MESES[stats.mes - 1]} {stats.anio}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-purple-500">
              <p className="text-xs text-gray-500 mb-1">Alumnos activos</p>
              <p className="text-3xl font-bold text-gray-800">{stats.total_activos}</p>
              {stats.total_prospectos > 0 && (
                <p className="text-xs text-gray-400 mt-1">{stats.total_prospectos} prospectos</p>
              )}
            </div>
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
              <p className="text-xs text-gray-500 mb-1">Pagos al día</p>
              <p className="text-3xl font-bold text-gray-800">{stats.pagados}</p>
              <p className="text-xs text-gray-400 mt-1">de {stats.total_activos} alumnos</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-yellow-400">
              <p className="text-xs text-gray-500 mb-1">Pendientes</p>
              <p className="text-3xl font-bold text-gray-800">{stats.pendientes}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-orange-500">
              <p className="text-xs text-gray-500 mb-1">Con recargo</p>
              <p className="text-3xl font-bold text-gray-800">{stats.en_riesgo}</p>
              <p className="text-xs text-orange-400 mt-1">+$50 de penalización</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-red-600">
              <p className="text-xs text-gray-500 mb-1">Bloqueados</p>
              <p className="text-3xl font-bold text-gray-800">{stats.bloqueados}</p>
              <p className="text-xs text-red-400 mt-1">+10 días sin pagar</p>
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
              {stats.pendientes + stats.en_riesgo + stats.bloqueados > 0 && (
                <span className="text-xs text-red-500 font-medium">
                  {stats.pendientes + stats.en_riesgo + stats.bloqueados} sin pagar
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