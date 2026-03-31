import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardService } from '../services/api'
import api from '../services/api'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function IngresosBajas() {
  const navigate = useNavigate()
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [sucursales, setSucursales] = useState([])
  const [sucursalFiltro, setSucursalFiltro] = useState('')
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const cargar = async () => {
    setCargando(true)
    try {
      const params = { mes, anio }
      if (sucursalFiltro) params.sucursal_id = sucursalFiltro
      const res = await api.get('/auth/ingresos-bajas', { params })
      setDatos(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (usuario.rol === 'directora' || usuario.rol === 'contadora') {
      api.get('/sucursales/').then(res => setSucursales(res.data))
    }
  }, [])

  useEffect(() => { cargar() }, [mes, anio, sucursalFiltro])

  const anios = []
  for (let y = hoy.getFullYear(); y >= hoy.getFullYear() - 3; y--) anios.push(y)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ingresos y Bajas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Alumnos que ingresaron o se dieron de baja en el mes</p>
        </div>
        <div className="flex gap-2">
          {(usuario.rol === 'directora' || usuario.rol === 'contadora') && sucursales.length > 0 && (
            <select
              value={sucursalFiltro}
              onChange={e => setSucursalFiltro(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          )}
          <select
            value={mes}
            onChange={e => setMes(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={anio}
            onChange={e => setAnio(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            {anios.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {cargando ? (
        <div className="flex justify-center py-20 text-gray-400">Cargando...</div>
      ) : datos ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Ingresos */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🟢</span>
                <h2 className="font-semibold text-gray-800">Ingresos</h2>
              </div>
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                {datos.ingresos.length} alumno{datos.ingresos.length !== 1 ? 's' : ''}
              </span>
            </div>
            {datos.ingresos.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">Sin ingresos este mes</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="px-4 py-2.5 text-left font-medium">Alumno</th>
                    <th className="px-4 py-2.5 text-left font-medium">Sucursal</th>
                    <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
                    <th className="px-4 py-2.5 text-left font-medium">Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {datos.ingresos.map(a => (
                    <tr
                      key={a.alumno_id}
                      onClick={() => navigate(`/alumnos/${a.alumno_id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{a.nombre}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.sucursal || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {a.fecha_ingreso
                          ? new Date(a.fecha_ingreso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{a.plan_pago || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Bajas */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔴</span>
                <h2 className="font-semibold text-gray-800">Bajas</h2>
              </div>
              <span className="bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                {datos.bajas.length} alumno{datos.bajas.length !== 1 ? 's' : ''}
              </span>
            </div>
            {datos.bajas.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">Sin bajas este mes</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="px-4 py-2.5 text-left font-medium">Alumno</th>
                    <th className="px-4 py-2.5 text-left font-medium">Sucursal</th>
                    <th className="px-4 py-2.5 text-left font-medium">Fecha baja</th>
                    <th className="px-4 py-2.5 text-left font-medium">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {datos.bajas.map(a => (
                    <tr
                      key={a.alumno_id}
                      onClick={() => navigate(`/alumnos/${a.alumno_id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{a.nombre}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.sucursal || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {a.fecha_baja
                          ? new Date(a.fecha_baja + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px] truncate">{a.motivo_baja || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      ) : null}
    </div>
  )
}
