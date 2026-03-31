import { useState, useEffect } from 'react'
import api, { sucursalesService } from '../services/api'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const TIPO_COLORES = {
  inscrito: 'bg-green-100 text-green-700',
  tabulador: 'bg-blue-100 text-blue-700',
  permanencia: 'bg-purple-100 text-purple-700',
}

const TIPO_LABELS = {
  inscrito: '💰 Por inscrito',
  tabulador: '🏆 Tabulador',
  permanencia: '⭐ Permanencia',
}

export default function Comisiones() {
  const [datos, setDatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [sucursales, setSucursales] = useState([])
  const [filtroSucursal, setFiltroSucursal] = useState('')

  useEffect(() => {
    sucursalesService.getAll().then(r => setSucursales(r.data)).catch(() => {})
    cargarComisiones()
  }, [mes, anio, filtroSucursal])

  const cargarComisiones = async () => {
    setLoading(true)
    try {
      const res = await api.get('/comisiones/calcular', { params: { mes, anio, sucursal_id: filtroSucursal || undefined } })
      setDatos(res.data)
    } catch (err) {
      console.error('Error cargando comisiones')
    } finally {
      setLoading(false)
    }
  }

  const totalGeneral = datos.reduce((s, suc) => s + suc.total_sucursal, 0)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Comisiones</h2>
        <div className="flex gap-3">
          <select value={filtroSucursal} onChange={e => setFiltroSucursal(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="">Todas las sucursales</option>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-purple-600 text-white rounded-xl p-5 mb-6 flex justify-between items-center">
        <div>
          <p className="text-purple-200 text-sm">Total comisiones {MESES[mes-1]} {anio}</p>
          <p className="text-3xl font-bold">${totalGeneral.toLocaleString('es-MX')}</p>
        </div>
        <span className="text-4xl">💰</span>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Cargando...</p>
      ) : (
        <div className="space-y-6">
          {datos.map((suc, si) => (
            <div key={si} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-5 py-4 border-b flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-800">{suc.sucursal}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {suc.num_inscritos} inscritos · {suc.num_bajas} bajas
                    {suc.aplica_tabulador
                      ? <span className="text-green-600 ml-2">✓ Aplica tabulador</span>
                      : <span className="text-red-500 ml-2">✗ No aplica tabulador</span>
                    }
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total sucursal</p>
                  <p className="font-bold text-purple-700 text-lg">${suc.total_sucursal.toLocaleString('es-MX')}</p>
                </div>
              </div>

              {suc.comisiones.length === 0 ? (
                <p className="px-5 py-4 text-gray-400 text-sm">Sin comisiones este mes</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Tipo</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Persona</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Descripción</th>
                      <th className="text-right px-4 py-3 text-gray-500 font-medium">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {suc.comisiones.map((com, ci) => (
                      <tr key={ci} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${TIPO_COLORES[com.tipo]}`}>
                            {TIPO_LABELS[com.tipo]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-700">{com.usuario}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{com.descripcion}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">${com.monto.toLocaleString('es-MX')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
