import { useState, useEffect } from 'react'
import { pagosService, sucursalesService } from '../services/api'

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
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [pagos, setPagos] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalPago, setModalPago] = useState(null)
  const [tablero, setTablero] = useState({ por_vencer: [], con_recargo: [], bloqueados: [] })
  const [vistaTablero, setVistaTablero] = useState(false)
  const [filtroSituacionPago, setFiltroSituacionPago] = useState('')
  const [ultimoPago, setUltimoPago] = useState(null)
  const [sucursales, setSucursales] = useState([])
  const [filtroSucursal, setFiltroSucursal] = useState('')

  const puedeVerSucursales = usuario.rol === 'directora' || usuario.rol === 'contadora' || usuario.es_encargada_general || usuario.es_global

  useEffect(() => {
    if (puedeVerSucursales) {
      sucursalesService.getAll().then(res => setSucursales(res.data)).catch(() => {})
    }
  }, [])

  useEffect(() => {
    cargarDatos()
    cargarTablero()
  }, [mes, anio, filtroSucursal])

  const cargarTablero = async () => {
    try {
      const res = await pagosService.tablero({ mes, anio, sucursal_id: filtroSucursal || undefined })
      setTablero(res.data)
    } catch (err) {
      console.error('Error cargando tablero')
    }
  }

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [pagosRes, resumenRes] = await Promise.all([
        pagosService.getAll({ mes, anio, sucursal_id: filtroSucursal || undefined }),
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
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
    (filtroSituacionPago === '' || p.estado_color === filtroSituacionPago)
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Control de Pagos</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setVistaTablero(!vistaTablero)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              vistaTablero ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            {vistaTablero ? '← Vista normal' : '📊 Tablero de pagos'}
          </button>
          {puedeVerSucursales && (
            <select value={filtroSucursal} onChange={e => setFiltroSucursal(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
              <option value="">Todas las sucursales</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          )}
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

      {vistaTablero && (
        <div className="space-y-6 mb-6">
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-yellow-50">
              <h3 className="font-bold text-yellow-700">⏰ Por vencer en los próximos 7 días ({tablero.por_vencer.length})</h3>
            </div>
            {tablero.por_vencer.length === 0 ? (
              <p className="text-center text-gray-400 py-4 text-sm">Sin alumnos por vencer</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Alumno</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Día de pago</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Faltan</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tablero.por_vencer.map((a, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{a.nombre}</td>
                      <td className="px-4 py-3 text-gray-500">Día {a.dia_pago}</td>
                      <td className="px-4 py-3"><span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">{a.dias_para_pagar} días</span></td>
                      <td className="px-4 py-3 text-gray-500">${a.plan_pago}/mes</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-orange-50">
              <h3 className="font-bold text-orange-700">⚠️ Con recargo — 6 a 9 días ({tablero.con_recargo.length})</h3>
            </div>
            {tablero.con_recargo.length === 0 ? (
              <p className="text-center text-gray-400 py-4 text-sm">Sin alumnos con recargo</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Alumno</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Día de pago</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Días de retraso</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tablero.con_recargo.map((a, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{a.nombre}</td>
                      <td className="px-4 py-3 text-gray-500">Día {a.dia_pago}</td>
                      <td className="px-4 py-3"><span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">{a.dias} días</span></td>
                      <td className="px-4 py-3 text-gray-500">${a.plan_pago}/mes</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-red-50">
              <h3 className="font-bold text-red-700">🚫 Bloqueados — más de 10 días ({tablero.bloqueados.length})</h3>
            </div>
            {tablero.bloqueados.length === 0 ? (
              <p className="text-center text-gray-400 py-4 text-sm">Sin alumnos bloqueados</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Alumno</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Día de pago</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Días de retraso</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tablero.bloqueados.map((a, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-red-700">{a.nombre}</td>
                      <td className="px-4 py-3 text-gray-500">Día {a.dia_pago}</td>
                      <td className="px-4 py-3"><span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">{a.dias} días</span></td>
                      <td className="px-4 py-3 text-gray-500">${a.plan_pago}/mes</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {!vistaTablero && resumen && (
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

      {!vistaTablero && <>
      <div className="mb-4 flex gap-3 items-center">
        <input
          type="text"
          placeholder="Buscar alumno..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <select
          value={filtroSituacionPago}
          onChange={e => setFiltroSituacionPago(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          <option value="">Todos los estados</option>
          <option value="verde">✅ Pagado</option>
          <option value="amarillo">🟡 Por pagar</option>
          <option value="rojo">🔴 Atrasado</option>
          <option value="naranja">🟠 Con recargo</option>
          <option value="cafe">🟫 Bloqueado</option>
        </select>
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
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Comentarios</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Acción</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Acciones</th>
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
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color.bg} ${color.text}`}>
                        {color.label}
                        {!p.pagado && p.dias_retraso > 0 && ` (${p.dias_retraso} días)`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{p.comentarios || '—'}</td>
                    <td className="px-4 py-3">
                      {p.pagado ? (
                        <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                          ✓ Pagado {p.fecha_pago ? `el ${p.fecha_pago}` : ''}
                          {p.con_penalizacion && ' + $50'}
                          {p.pago_id && (
                            <button
                              onClick={() => setUltimoPago({
                                nombre: p.nombre,
                                monto: p.monto_pagado || p.plan_pago,
                                mes,
                                anio,
                                fecha_recepcion: p.fecha_recepcion,
                                registrado_por: usuario.nombre,
                                comentarios: p.comentarios,
                                con_penalizacion: p.con_penalizacion,
                                monto_penalizacion: p.monto_penalizacion,
                              })}
                              className="text-purple-600 hover:text-purple-800 text-xs font-medium ml-1"
                              title="Imprimir ticket"
                            >🖨️</button>
                          )}
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
                    <td className="px-4 py-3">
                      {p.pago_id && (
                        <button
                          onClick={async () => {
                            if (!window.confirm('¿Seguro que quieres revertir este pago?')) return
                            try {
                              await pagosService.eliminar(p.pago_id)
                              cargarDatos()
                            } catch (err) {
                              alert('Error al revertir el pago')
                            }
                          }}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          Revertir
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
      </>}

      {modalPago && (
        <ModalRegistrarPago
          alumno={modalPago}
          mes={mes}
          anio={anio}
          onClose={() => setModalPago(null)}
          onSuccess={() => { setModalPago(null); cargarDatos() }}
          onPagoRegistrado={setUltimoPago}
        />
      )}
      {ultimoPago && <TicketPago pago={ultimoPago} onClose={() => setUltimoPago(null)} />}
    </div>
  )
}

function ModalRegistrarPago({ alumno, mes, anio, onClose, onSuccess, onPagoRegistrado }) {
  const [comentarios, setComentarios] = useState('')
  const [fechaRecepcion, setFechaRecepcion] = useState('')
  const [montoPersonalizado, setMontoPersonalizado] = useState('')
  const [sinRecargo, setSinRecargo] = useState(false)
  const [metodoPago, setMetodoPago] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mesPagoSeleccionado, setMesPagoSeleccionado] = useState(null)
  const usuarioLocal = JSON.parse(localStorage.getItem('usuario') || '{}')

  const detectarMesAmbiguo = (alumno) => {
    if (!alumno) return false
    const hoy = new Date()
    const diaHoy = hoy.getDate()
    const diaPago = alumno?.dia_pago || 0
    return diaPago >= 26 && diaHoy <= 8
  }

  const conPenalizacion = alumno.dias_retraso > 5
  const monto = Number(alumno.plan_pago) || 0
  const montoTotal = monto + (conPenalizacion ? 50 : 0)

  const handlePagar = async () => {
    setLoading(true)
    setError('')
    try {
      const hoy = new Date()
      let mesEnviar = hoy.getMonth() + 1
      let anioEnviar = hoy.getFullYear()

      if (detectarMesAmbiguo(alumno) && mesPagoSeleccionado === 'anterior') {
        if (hoy.getMonth() === 0) {
          mesEnviar = 12
          anioEnviar = hoy.getFullYear() - 1
        } else {
          mesEnviar = hoy.getMonth()
          anioEnviar = hoy.getFullYear()
        }
      } else if (!detectarMesAmbiguo(alumno)) {
        mesEnviar = mes
        anioEnviar = anio
      }

      await pagosService.registrar({
        alumno_id: alumno.id,
        mes: mesEnviar,
        anio: anioEnviar,
        fecha_pago: fechaRecepcion || new Date().toISOString().split('T')[0],
        con_penalizacion: conPenalizacion,
        monto_penalizacion: conPenalizacion ? 50 : 0,
        comentarios,
        fecha_recepcion: fechaRecepcion || null,
        monto_recibido: montoPersonalizado ? parseFloat(montoPersonalizado) : undefined,
        sin_recargo: sinRecargo,
        metodo_pago: metodoPago || undefined,
      })
      onPagoRegistrado && onPagoRegistrado({
        nombre: alumno.nombre,
        monto: montoPersonalizado || alumno.plan_pago,
        mes: mesEnviar,
        anio: anioEnviar,
        fecha_recepcion: fechaRecepcion,
        registrado_por: usuarioLocal.nombre,
        comentarios,
        con_penalizacion: sinRecargo ? false : conPenalizacion,
        monto_penalizacion: sinRecargo ? 0 : (conPenalizacion ? 50 : 0),
        metodo_pago: metodoPago || undefined,
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

          {detectarMesAmbiguo(alumno) && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-3">
              <p className="text-sm font-medium text-yellow-800 mb-2">⚠️ ¿A qué mes corresponde este pago?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMesPagoSeleccionado('anterior')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${mesPagoSeleccionado === 'anterior' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-yellow-700 border-yellow-300'}`}
                >
                  {new Date().getMonth() === 0 ? 'Diciembre' : ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][new Date().getMonth()-1]}
                </button>
                <button
                  type="button"
                  onClick={() => setMesPagoSeleccionado('actual')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${mesPagoSeleccionado === 'actual' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-yellow-700 border-yellow-300'}`}
                >
                  {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][new Date().getMonth()]}
                </button>
              </div>
            </div>
          )}

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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de recepción del pago
            </label>
            <input
              type="date"
              value={fechaRecepcion}
              onChange={e => setFechaRecepcion(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <p className="text-xs text-gray-400 mt-1">Si se recibió en otra fecha diferente a hoy</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
              <option value="">Seleccionar</option>
              <option value="efectivo">💵 Efectivo</option>
              <option value="tarjeta">💳 Tarjeta</option>
              <option value="transferencia">🏦 Transferencia</option>
            </select>
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto recibido (opcional)
            </label>
            <input
              type="number"
              value={montoPersonalizado}
              onChange={e => setMontoPersonalizado(e.target.value)}
              placeholder={`Monto normal: $${alumno.plan_pago || ''}`}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <p className="text-xs text-gray-400 mt-1">Solo si el monto recibido es diferente al plan. No modifica el plan mensual.</p>
          </div>

          {conPenalizacion && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={sinRecargo} onChange={e => setSinRecargo(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded" />
              <span className="text-sm text-gray-700">Sin recargo (exentar penalización)</span>
            </label>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={handlePagar} disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white py-2 rounded-lg text-sm font-medium transition">
              {loading ? 'Guardando...' : 'Confirmar pago'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TicketPago({ pago, onClose }) {
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const imprimirTicket = () => {
    const ventana = window.open('', '_blank', 'width=300,height=500')
    ventana.document.write(`
      <html>
      <head>
        <title>Ticket de Pago</title>
        <style>
          body { font-family: monospace; font-size: 12px; width: 280px; margin: 0; padding: 10px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          h2 { margin: 5px 0; font-size: 16px; }
          h3 { margin: 3px 0; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2>LUDENS</h2>
          <h3>Centro Educativo</h3>
          <p>RECIBO DE PAGO</p>
        </div>
        <div class="line"></div>
        <div class="row"><span>Alumno:</span><span class="bold">${pago.nombre}</span></div>
        <div class="row"><span>Mes:</span><span>${MESES[(pago.mes||1)-1]} ${pago.anio}</span></div>
        <div class="row"><span>Fecha recepción:</span><span>${pago.fecha_recepcion || '—'}</span></div>
        <div class="line"></div>
        <div class="row"><span>Monto:</span><span class="bold">$${pago.monto}</span></div>
        ${pago.con_penalizacion ? `<div class="row"><span>Penalización:</span><span>$${pago.monto_penalizacion}</span></div>` : ''}
        ${pago.con_penalizacion ? `<div class="row"><span>Total:</span><span class="bold">$${parseFloat(pago.monto) + parseFloat(pago.monto_penalizacion || 0)}</span></div>` : ''}
        ${pago.metodo_pago ? `<div class="row"><span>Método:</span><span>${pago.metodo_pago}</span></div>` : ''}
        ${pago.comentarios ? `<div class="row"><span>Comentarios:</span><span>${pago.comentarios}</span></div>` : ''}
        <div class="line"></div>
        <div class="row"><span>Atendió:</span><span>${pago.registrado_por}</span></div>
        <div class="center" style="margin-top:10px">
          <p>¡Gracias por su pago!</p>
        </div>
      </body>
      </html>
    `)
    ventana.document.close()
    ventana.focus()
    ventana.print()
    ventana.close()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800">🧾 Pago registrado</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-2 text-sm">
          <p><span className="text-gray-500">Alumno:</span> <span className="font-medium">{pago.nombre}</span></p>
          <p><span className="text-gray-500">Monto:</span> <span className="font-bold text-green-600">${pago.monto}</span></p>
          {pago.con_penalizacion && <p><span className="text-gray-500">Penalización:</span> ${pago.monto_penalizacion}</p>}
          <p><span className="text-gray-500">Fecha recepción:</span> {pago.fecha_recepcion}</p>
          <p><span className="text-gray-500">Atendió:</span> {pago.registrado_por}</p>
          {pago.comentarios && <p><span className="text-gray-500">Comentarios:</span> {pago.comentarios}</p>}
        </div>
        <div className="p-5 pt-0 flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">
            Cerrar
          </button>
          <button onClick={imprimirTicket}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-medium">
            🖨️ Imprimir ticket
          </button>
        </div>
      </div>
    </div>
  )
}