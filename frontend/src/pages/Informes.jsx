import { useState, useEffect } from 'react'
import api from '../services/api'
import { sucursalesService, usuariosService } from '../services/api'

const SITUACIONES = [
  { value: 'informes', label: 'Informes', color: 'bg-gray-100 text-gray-700' },
  { value: 'seguimiento_1', label: 'Seguimiento 1', color: 'bg-blue-100 text-blue-700' },
  { value: 'seguimiento_2', label: 'Seguimiento 2', color: 'bg-blue-200 text-blue-800' },
  { value: 'seguimiento_3', label: 'Seguimiento 3', color: 'bg-blue-300 text-blue-900' },
  { value: 'agendo_diagnostico', label: 'Agendó diagnóstico', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'acudio_diagnostico', label: 'Acudió a diagnóstico', color: 'bg-orange-100 text-orange-700' },
  { value: 'no_contesta', label: 'No contesta / No le interesa', color: 'bg-red-100 text-red-700' },
  { value: 'pago_inscripcion', label: 'Pagó inscripción', color: 'bg-green-100 text-green-700' },
  { value: 'inscrito', label: 'Inscrito', color: 'bg-green-200 text-green-800' },
]

const MEDIOS = ['WhatsApp', 'Facebook', 'Sucursal', 'Llamada', 'Recomendación', 'Otro']

export default function Informes() {
  const [informes, setInformes] = useState([])
  const [resumen, setResumen] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroSucursal, setFiltroSucursal] = useState('')
  const [filtroSituacion, setFiltroSituacion] = useState('')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalEditar, setModalEditar] = useState(null)
  const [vistaActual, setVistaActual] = useState('lista')
  const [mesResumen, setMesResumen] = useState(new Date().getMonth() + 1)
  const [anioResumen, setAnioResumen] = useState(new Date().getFullYear())
  const [historicoSemanas, setHistoricoSemanas] = useState([])
  const [generandoSnapshot, setGenerandoSnapshot] = useState(false)
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    cargarDatos()
  }, [filtroSucursal, filtroSituacion])

  useEffect(() => {
    cargarHistorico()
  }, [mesResumen, anioResumen])

  const cargarHistorico = async () => {
    try {
      const res = await api.get('/informes/resumen/historico', { params: { mes: mesResumen, anio: anioResumen } })
      setHistoricoSemanas(res.data.semanas || [])
    } catch (err) {
      console.error('Error cargando histórico')
    }
  }

  const generarSnapshot = async () => {
    setGenerandoSnapshot(true)
    try {
      await api.post('/informes/resumen/generar-semana')
      cargarHistorico()
      alert('Snapshot de semana generado correctamente')
    } catch (err) {
      alert('Error generando snapshot')
    } finally {
      setGenerandoSnapshot(false)
    }
  }

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtroSucursal) params.sucursal_id = filtroSucursal
      if (filtroSituacion) params.situacion = filtroSituacion
      const [infRes, sucRes, usrRes] = await Promise.all([
        api.get('/informes/', { params }),
        sucursalesService.getAll(),
        usuariosService.getAll(),
      ])
      setInformes(infRes.data)
      setSucursales(sucRes.data)
      setUsuarios(usrRes.data)
    } catch (err) {
      console.error('Error cargando informes')
    } finally {
      setLoading(false)
    }
  }

  const cambiarSituacion = async (id, situacion) => {
    try {
      await api.put(`/informes/${id}`, { situacion, ultimo_contacto: new Date().toISOString().split('T')[0] })
      cargarDatos()
    } catch (err) {
      console.error('Error')
    }
  }

  const eliminarInforme = async (id) => {
    if (!window.confirm('¿Eliminar este informe?')) return
    try {
      await api.delete(`/informes/${id}`)
      cargarDatos()
    } catch (err) {
      console.error('Error')
    }
  }

  const getSituacion = (value) => SITUACIONES.find(s => s.value === value) || SITUACIONES[0]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Informes y Seguimiento</h2>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setVistaActual('lista')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${vistaActual === 'lista' ? 'bg-white shadow text-purple-700' : 'text-gray-600'}`}>
              📋 Lista
            </button>
            <button onClick={() => setVistaActual('resumen')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${vistaActual === 'resumen' ? 'bg-white shadow text-purple-700' : 'text-gray-600'}`}>
              📊 Resumen
            </button>
          </div>
          <button onClick={() => setModalNuevo(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Nuevo informe
          </button>
        </div>
      </div>

      {vistaActual === 'lista' && (
        <>
          <div className="flex gap-3 mb-4 flex-wrap">
            <select value={filtroSucursal} onChange={e => setFiltroSucursal(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
              <option value="">Todas las sucursales</option>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <select value={filtroSituacion} onChange={e => setFiltroSituacion(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
              <option value="">Todas las situaciones</option>
              {SITUACIONES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 py-12">Cargando...</p>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Contacto</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Medio</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Situación</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Sucursal</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Diagnóstico</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Comisión</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {informes.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin informes registrados</td></tr>
                  ) : informes.map(inf => {
                    const sit = getSituacion(inf.situacion)
                    return (
                      <tr key={inf.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{inf.nombre_contacto}</p>
                          {inf.nombre_nino && <p className="text-xs text-gray-400">Niño: {inf.nombre_nino}</p>}
                          <p className="text-xs text-gray-400">{inf.fecha_solicitud}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{inf.medio || '—'}</td>
                        <td className="px-4 py-3">
                          <select
                            value={inf.situacion}
                            onChange={e => cambiarSituacion(inf.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${sit.color}`}
                          >
                            {SITUACIONES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{inf.sucursal_nombre || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {inf.fecha_diagnostico ? (
                            <span>{inf.fecha_diagnostico} {inf.hora_diagnostico}</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {inf.comision_usuario1_nombre && <p>{inf.comision_usuario1_nombre}</p>}
                          {inf.comision_usuario2_nombre && <p>{inf.comision_usuario2_nombre}</p>}
                          {!inf.comision_usuario1_nombre && '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setModalEditar(inf)}
                            className="text-purple-600 hover:text-purple-800 text-xs font-medium mr-2">
                            Editar
                          </button>
                          {(usuario.rol === 'directora' || usuario.rol === 'encargada') && (
                            <button onClick={() => eliminarInforme(inf.id)}
                              className="text-red-400 hover:text-red-600 text-xs font-medium">
                              Eliminar
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {vistaActual === 'resumen' && (
        <div>
          <div className="flex gap-3 mb-4 items-center flex-wrap justify-between">
            <div className="flex gap-3">
              <select value={mesResumen} onChange={e => setMesResumen(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m,i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
              <select value={anioResumen} onChange={e => setAnioResumen(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {(usuario.rol === 'directora' || usuario.es_encargada_general) && (
              <button onClick={generarSnapshot} disabled={generandoSnapshot}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-4 py-2 rounded-lg text-sm font-medium">
                {generandoSnapshot ? 'Generando...' : '📸 Guardar semana actual'}
              </button>
            )}
          </div>

          {historicoSemanas.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
              <p className="text-lg font-medium">Sin datos para este mes</p>
              <p className="text-sm mt-1">Genera el snapshot de la semana actual para empezar a registrar el historial</p>
            </div>
          ) : (
            <div className="space-y-6">
              {historicoSemanas.map((semana, si) => (
                <div key={si} className="bg-white rounded-xl shadow overflow-hidden">
                  <div className="px-4 py-3 bg-purple-600 text-white font-bold text-sm flex justify-between">
                    <span>Semana {semana.numero_semana}</span>
                    <span className="font-normal text-purple-200">{semana.semana_inicio} al {semana.semana_fin}</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 text-gray-500 font-medium">Sucursal</th>
                        <th className="text-center px-3 py-2 text-gray-500 font-medium">Alumnos activos</th>
                        <th className="text-center px-3 py-2 text-gray-500 font-medium">Total informes</th>
                        <th className="text-center px-3 py-2 text-gray-500 font-medium">Citas agendadas</th>
                        <th className="text-center px-3 py-2 text-gray-500 font-medium">Inscritos</th>
                        <th className="text-center px-3 py-2 text-gray-500 font-medium">Bajas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {semana.sucursales.map((suc, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 font-medium text-gray-800">{suc.sucursal}</td>
                          <td className="px-3 py-2 text-center font-bold text-purple-700">{suc.alumnos_totales}</td>
                          <td className="px-3 py-2 text-center text-gray-700">{suc.inf_whatsapp + suc.inf_llamadas + suc.inf_sucursal + suc.inf_redes + suc.inf_extras}</td>
                          <td className="px-3 py-2 text-center text-yellow-700">{suc.diagnosticos}</td>
                          <td className="px-3 py-2 text-center text-green-700">{suc.nuevos_ingresos}</td>
                          <td className="px-3 py-2 text-center text-red-700">{suc.bajas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalNuevo && (
        <ModalInforme
          sucursales={sucursales}
          usuarios={usuarios}
          onClose={() => setModalNuevo(false)}
          onSuccess={() => { setModalNuevo(false); cargarDatos() }}
        />
      )}

      {modalEditar && (
        <ModalInforme
          informe={modalEditar}
          sucursales={sucursales}
          usuarios={usuarios}
          onClose={() => setModalEditar(null)}
          onSuccess={() => { setModalEditar(null); cargarDatos() }}
        />
      )}
    </div>
  )
}

function ModalInforme({ informe, sucursales, usuarios, onClose, onSuccess }) {
  const [form, setForm] = useState({
    nombre_contacto: informe?.nombre_contacto || '',
    medio: informe?.medio || '',
    situacion: informe?.situacion || 'informes',
    fecha_solicitud: informe?.fecha_solicitud || new Date().toISOString().split('T')[0],
    sucursal_id: informe?.sucursal_id || '',
    comision_usuario1_id: informe?.comision_usuario1_id || '',
    comision_usuario2_id: informe?.comision_usuario2_id || '',
    nombre_nino: informe?.nombre_nino || '',
    edad_nino: informe?.edad_nino || '',
    grado_nino: informe?.grado_nino || '',
    comentarios: informe?.comentarios || '',
    fecha_diagnostico: informe?.fecha_diagnostico || '',
    hora_diagnostico: informe?.hora_diagnostico || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleGuardar = async () => {
    if (!form.nombre_contacto.trim()) {
      setError('El nombre del contacto es obligatorio')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = { ...form }
      if (!data.sucursal_id) data.sucursal_id = null
      if (!data.comision_usuario1_id) data.comision_usuario1_id = null
      if (!data.comision_usuario2_id) data.comision_usuario2_id = null
      if (!data.fecha_diagnostico) data.fecha_diagnostico = null
      if (!data.edad_nino) data.edad_nino = null

      if (informe) {
        await api.put(`/informes/${informe.id}`, data)
      } else {
        await api.post('/informes/', data)
      }
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const mostrarDiagnostico = ['agendo_diagnostico', 'acudio_diagnostico', 'pago_inscripcion', 'inscrito'].includes(form.situacion)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">{informe ? 'Editar informe' : 'Nuevo informe'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del contacto *</label>
            <input name="nombre_contacto" value={form.nombre_contacto} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medio</label>
              <select name="medio" value={form.medio} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Seleccionar</option>
                {MEDIOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Situación</label>
              <select name="situacion" value={form.situacion} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                {SITUACIONES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha solicitud</label>
              <input name="fecha_solicitud" type="date" value={form.fecha_solicitud} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal de interés</label>
              <select name="sucursal_id" value={form.sucursal_id} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Seleccionar</option>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comisión — persona 1</label>
              <select name="comision_usuario1_id" value={form.comision_usuario1_id} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Sin asignar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comisión — persona 2</label>
              <select name="comision_usuario2_id" value={form.comision_usuario2_id} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Sin asignar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
          </div>

          {mostrarDiagnostico && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Datos del diagnóstico</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del niño</label>
                    <input name="nombre_nino" value={form.nombre_nino} onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Edad</label>
                    <input name="edad_nino" type="number" value={form.edad_nino} onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Grado</label>
                    <input name="grado_nino" value={form.grado_nino} onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Fecha diagnóstico</label>
                    <input name="fecha_diagnostico" type="date" value={form.fecha_diagnostico} onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hora diagnóstico</label>
                    <select name="hora_diagnostico" value={form.hora_diagnostico} onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                      <option value="">Seleccionar</option>
                      {['9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'].map(h => (
                        <option key={h} value={h}>{h} hrs</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Comentarios</label>
                    <input name="comentarios" value={form.comentarios} onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium">
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white py-2 rounded-lg text-sm font-medium">
              {loading ? 'Guardando...' : informe ? 'Guardar cambios' : 'Registrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
