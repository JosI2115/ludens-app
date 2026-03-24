import { useState, useEffect } from 'react'
import { pagosService } from '../services/api'

const COLORES = {
  verde:    { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Pagado' },
  amarillo: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Por pagar' },
  rojo:     { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Vencido' },
  naranja:  { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Recargo $50' },
  cafe:     { bg: 'bg-amber-200',  text: 'text-amber-900',  label: 'Bloqueado' },
  sin_fecha:{ bg: 'bg-gray-100',   text: 'text-gray-500',   label: 'Sin fecha' },
}

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

export default function Pagos() {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [pagos, setPagos] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalPago, setModalPago] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [mes, anio])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [pagosRes, resumenRes] = await Promise.all([
        pagosService.getAll({ mes, anio }),
        pagosService.resumen({ mes, anio }),
      ])
      setPagos(pagosRes.data)
      setResumen(resumenRes.data)
    } catch (err) {
      console.error('Error cargando pagos')
    } finally {
      setLoading(false)
    }
  }

  const pagosFiltrados = pagos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Control de pagos</h2>
        <div className="flex gap-2">
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            {MESES.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select value={anio} onChange={e => setAnio(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
      </div>

      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
            <p className="text-xs text-gray-500">Pagados</p>
            <p className="text-2xl font-bold text-gray-800">{resumen.pagados}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-yellow-400">
            <p className="text-xs text-gray-500">Pendientes</p>
            <p className="text-2xl font-bold text-gray-800">{resumen.pendientes}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-orange-500">
            <p className="text-xs text-gray-500">Con recargo</p>
            <p className="text-2xl font-bold text-gray-800">{resumen.en_riesgo}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-700">
            <p className="text-xs text-gray-500">Bloqueados</p>
            <p className="text-2xl font-bold text-gray-800">{resumen.bloqueados}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-500">
            <p className="text-xs text-gray-500">Recaudado</p>
            <p className="text-2xl font-bold text-gray-800">${resumen.total_recaudado.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-3 items-center">
        <input
          type="text"
          placeholder="Buscar alumno..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <div className="flex gap-2 text-xs">
          {Object.entries(COLORES).filter(([k]) => k !== 'sin_fecha').map(([key, val]) => (
            <span key={key} className={`px-2 py-1 rounded-full ${val.bg} ${val.text} font-medium`}>
              {val.label}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando pagos...</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Alumno</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Plan</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Día de pago</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagosFiltrados.map((p) => {
                const color = COLORES[p.estado_color] || COLORES.sin_fecha
                return (
                  <tr key={p.id} className={`${p.pagado ? '' : color.bg} hover:opacity-90`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.plan_pago ? `$${p.plan_pago}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      Día {p.dia_pago || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color.bg} ${color.text}`}>
                        {color.label}
                        {!p.pagado && p.dias_retraso > 0 && ` (${p.dias_retraso} días)`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.pagado ? (
                        <span className="text-green-600 text-xs font-medium">
                          ✓ Pagado {p.fecha_pago ? `el ${p.fecha_pago}` : ''}
                          {p.con_penalizacion && ' + $50'}
                        </span>
                      ) : (
                        <button
                          onClick={() => setModalPago(p)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition"
                        >
                          Registrar pago
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {pagosFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-400">No hay alumnos con pagos este mes</div>
          )}
        </div>
      )}

      {modalPago && (
        <ModalRegistrarPago
          alumno={modalPago}
          mes={mes}
          anio={anio}
          onClose={() => setModalPago(null)}
          onSuccess={() => { setModalPago(null); cargarDatos() }}
        />
      )}
    </div>
  )
}

function ModalRegistrarPago({ alumno, mes, anio, onClose, onSuccess }) {
  const [comentarios, setComentarios] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const conPenalizacion = alumno.dias_retraso > 5
  const monto = Number(alumno.plan_pago) || 0
  const montoTotal = monto + (conPenalizacion ? 50 : 0)

  const handlePagar = async () => {
    setLoading(true)
    setError('')
    try {
      await pagosService.registrar({
        alumno_id: alumno.id,
        monto: monto,
        mes,
        anio,
        fecha_pago: new Date().toISOString().split('T')[0],
        con_penalizacion: conPenalizacion,
        monto_penalizacion: conPenalizacion ? 50 : 0,
        comentarios,
      })
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrar pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Registrar pago</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium text-gray-800">{alumno.nombre}</p>
            <p className="text-sm text-gray-500">Día de pago: {alumno.dia_pago}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Mensualidad</span>
              <span className="font-medium">${monto.toLocaleString()}</span>
            </div>
            {conPenalizacion && (
              <div className="flex justify-between text-sm">
                <span className="text-orange-600">Penalización por retraso</span>
                <span className="font-medium text-orange-600">+$50</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t pt-2">
              <span>Total a cobrar</span>
              <span className="text-purple-700">${montoTotal.toLocaleString()}</span>
            </div>
          </div>

          {conPenalizacion && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700">
              Este alumno tiene {alumno.dias_retraso} días de retraso. Se aplica recargo de $50.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios (opcional)</label>
            <textarea
              value={comentarios}
              onChange={e => setComentarios(e.target.value)}
              rows={2}
              placeholder="Ej: Pagó con cheque, adelantó siguiente mes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={handlePagar} disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white py-2 rounded-lg text-sm font-medium transition">
              {loading ? 'Guardando...' : `Confirmar $${montoTotal.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}