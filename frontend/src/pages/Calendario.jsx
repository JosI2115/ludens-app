import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const ESTADO_COLORES = {
  confirma_asiste:    { bg: 'bg-blue-600', text: 'text-white', label: 'Asiste' },
  prospecto:          { bg: 'bg-green-500', text: 'text-white', label: 'Prospecto' },
  confirma_no_asiste: { bg: 'bg-orange-400', text: 'text-white', label: 'No asiste' },
  nuevo_ingreso:      { bg: 'bg-purple-600', text: 'text-white', label: 'Nuevo ingreso' },
  sin_confirmar:      { bg: 'bg-transparent', text: 'text-gray-800', label: 'Sin confirmar' },
  recuperacion:       { bg: 'bg-yellow-400', text: 'text-gray-800', label: 'Recuperación' },
}

export default function Calendario() {
  const navigate = useNavigate()
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fechaInicio, setFechaInicio] = useState('')
  const [modalAlumno, setModalAlumno] = useState(null)
  const [modalRecup, setModalRecup] = useState(null)
  const [vistaActual, setVistaActual] = useState('general')
  const [datosMaestras, setDatosMaestras] = useState(null)
  const [sucursales, setSucursales] = useState([])
  const [sucursalFiltro, setSucursalFiltro] = useState('')
  const [nuevosAlumnos, setNuevosAlumnos] = useState([])
  const [prospectos, setProspectos] = useState([])
  const [modalProspecto, setModalProspecto] = useState(null)
  const [modalVerProspecto, setModalVerProspecto] = useState(null)
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    if (usuario.rol === 'directora' || usuario.rol === 'contadora') {
      api.get('/sucursales/').then(res => setSucursales(res.data))
    }
    cargarCalendario()
    cargarCalendarioMaestras()
    cargarNuevosAlumnos()
    cargarProspectos()
  }, [fechaInicio, sucursalFiltro])

  const cargarProspectos = async () => {
    try {
      const params = {}
      if (fechaInicio) params.fecha_inicio = fechaInicio
      if (sucursalFiltro) params.sucursal_id = sucursalFiltro
      const res = await api.get('/calendario/prospectos', { params })
      setProspectos(res.data)
    } catch (err) {
      console.error('Error cargando prospectos')
    }
  }

  const eliminarProspecto = async (id) => {
    if (!window.confirm('¿Eliminar este prospecto?')) return
    try {
      await api.delete(`/calendario/prospectos/${id}`)
      cargarProspectos()
      setModalVerProspecto(null)
    } catch (err) {
      console.error('Error')
    }
  }

  const cargarNuevosAlumnos = async () => {
    try {
      const params = {}
      if (fechaInicio) params.fecha_inicio = fechaInicio
      if (sucursalFiltro) params.sucursal_id = sucursalFiltro
      const res = await api.get('/calendario/nuevos', { params })
      setNuevosAlumnos(res.data)
    } catch (err) {
      console.error('Error cargando nuevos alumnos')
    }
  }

  const cargarCalendario = async () => {
    setLoading(true)
    try {
      const params = {}
      if (fechaInicio) params.fecha_inicio = fechaInicio
      if (sucursalFiltro) params.sucursal_id = sucursalFiltro
      const res = await api.get('/calendario/semana', { params })
      setDatos(res.data)
    } catch (err) {
      console.error('Error cargando calendario')
    } finally {
      setLoading(false)
    }
  }

  const cargarCalendarioMaestras = async () => {
    try {
      const params = {}
      if (fechaInicio) params.fecha_inicio = fechaInicio
      if (sucursalFiltro) params.sucursal_id = sucursalFiltro
      const res = await api.get('/calendario/maestras', { params })
      setDatosMaestras(res.data)
    } catch (err) {
      console.error('Error cargando calendario maestras')
    }
  }

  const confirmarAsistencia = async (alumno_id, fecha, confirmo) => {
    try {
      await api.post('/calendario/confirmar', { alumno_id, fecha, confirmo })
      cargarCalendario()
      setModalAlumno(null)
    } catch (err) {
      console.error('Error confirmando')
    }
  }

  const agendarRecuperacion = async (data) => {
    try {
      await api.post('/calendario/recuperacion', data)
      cargarCalendario()
      setModalRecup(null)
    } catch (err) {
      console.error('Error agendando recuperacion')
    }
  }

  const semanaAnterior = () => {
    const base = fechaInicio ? new Date(fechaInicio + 'T12:00:00') : new Date()
    base.setDate(base.getDate() - 7)
    setFechaInicio(base.toISOString().split('T')[0])
  }

  const semanaSiguiente = () => {
    const base = fechaInicio ? new Date(fechaInicio + 'T12:00:00') : new Date()
    base.setDate(base.getDate() + 7)
    setFechaInicio(base.toISOString().split('T')[0])
  }

  const semanaActual = () => setFechaInicio('')

  if (loading) return <div className="p-6 text-gray-400 text-center py-12">Cargando calendario...</div>
  if (!datos) return null

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Calendario semanal</h2>
        <div className="flex gap-2 items-center">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setVistaActual('general')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${vistaActual === 'general' ? 'bg-white shadow text-purple-700' : 'text-gray-600'}`}>
              👥 General
            </button>
            <button onClick={() => setVistaActual('maestras')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${vistaActual === 'maestras' ? 'bg-white shadow text-purple-700' : 'text-gray-600'}`}>
              👩‍🏫 Maestras
            </button>
          </div>
          {(usuario.rol === 'directora' || usuario.rol === 'contadora') && (
            <select
              value={sucursalFiltro}
              onChange={e => setSucursalFiltro(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setModalProspecto(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            ＋ Prospecto
          </button>
          <button onClick={semanaAnterior} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">← Anterior</button>
          <button onClick={semanaActual} className="px-3 py-1.5 bg-purple-100 text-purple-700 border border-purple-300 rounded-lg text-sm font-medium">Hoy</button>
          <button onClick={semanaSiguiente} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Siguiente →</button>
        </div>
      </div>

      {vistaActual === 'general' && (
      <div className="flex gap-3 mb-4 flex-wrap text-xs">
        {Object.entries(ESTADO_COLORES).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${val.bg} border border-gray-300`}></div>
            <span className="text-gray-600">{val.label}</span>
          </div>
        ))}
      </div>
      )}

      {vistaActual === 'general' && <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{minWidth: '900px'}}>
          <thead>
            <tr>
              <th className="w-24 px-2 py-3 text-left text-xs text-gray-500 font-medium bg-gray-50 border border-gray-200">Hora</th>
              {DIAS.map((dia, i) => (
                <th key={i} className="px-2 py-3 text-center text-xs font-medium bg-gray-50 border border-gray-200">
                  <p className="text-gray-700">{dia}</p>
                  <p className="text-gray-400 font-normal">{datos.semana[i]?.split('-').slice(1).reverse().join('/')}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.horas.map(hora => (
              <tr key={hora}>
                <td className="px-2 py-2 text-xs text-gray-500 font-medium bg-gray-50 border border-gray-200 align-top">
                  {hora}
                </td>
                {DIAS.map((_, diaIdx) => {
                  const alumnos = datos.calendario[hora]?.[String(diaIdx)] || []
                  const limite = alumnos.length >= 20
                  const casiBorde = alumnos.length >= 15 && alumnos.length < 20
                  return (
                    <td key={diaIdx}
                      className={`px-1 py-1 border border-gray-200 align-top min-w-28 ${
                        limite ? 'bg-red-50' : casiBorde ? 'bg-yellow-50' : 'bg-white'
                      }`}>
                      {limite && <p className="text-red-500 text-xs font-bold mb-1 text-center">⚠️ Límite</p>}
                      {casiBorde && <p className="text-yellow-600 text-xs font-medium mb-1 text-center">Casi lleno</p>}
                      <div className="space-y-0.5">
                        {alumnos.map((a, ai) => {
                          const color = ESTADO_COLORES[a.estado] || ESTADO_COLORES.sin_confirmar
                          return (
                            <div
                              key={ai}
                              onClick={() => setModalAlumno({ ...a, hora, fecha: datos.semana[diaIdx], diaIdx })}
                              className={`text-xs px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition border border-gray-200 ${color.bg} ${color.text}`}
                            >
                              {a.nombre}
                            </div>
                          )
                        })}
                        {prospectos
                          .filter(p => {
                            const diaSemana = new Date(p.fecha + 'T12:00:00').getDay()
                            const diaIdx2 = diaSemana === 0 ? 6 : diaSemana - 1
                            return diaIdx2 === diaIdx && p.hora === hora
                          })
                          .map((p, pi) => (
                            <div key={pi}
                              onClick={() => setModalVerProspecto(p)}
                              className="text-xs px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition border border-dashed border-green-400 bg-green-50 text-green-700"
                            >
                              🔍 {p.nombre_nino} {p.grado ? `(${p.grado})` : ''}
                            </div>
                          ))
                        }
                      </div>
                      {alumnos.length > 0 && (
                        <p className="text-gray-300 text-xs text-right mt-1">{alumnos.length}</p>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>}

      {vistaActual === 'maestras' && datosMaestras && (
        <div className="overflow-x-auto">
          <div className="mb-4 flex gap-3 flex-wrap">
            {datosMaestras.maestras.map(m => (
              <div key={m.id} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: m.color}}></div>
                <span className="text-gray-600">{m.nombre}</span>
              </div>
            ))}
          </div>
          <table className="w-full border-collapse" style={{minWidth: '900px'}}>
            <thead>
              <tr>
                <th className="w-24 px-2 py-3 text-left text-xs text-gray-500 font-medium bg-gray-50 border border-gray-200">Hora</th>
                {DIAS.map((dia, i) => (
                  <th key={i} className="px-2 py-3 text-center text-xs font-medium bg-gray-50 border border-gray-200">
                    <p className="text-gray-700">{dia}</p>
                    <p className="text-gray-400 font-normal">{datosMaestras.semana[i]?.split('-').slice(1).reverse().join('/')}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datosMaestras.horas.map(hora => (
                <tr key={hora}>
                  <td className="px-2 py-2 text-xs text-gray-500 font-medium bg-gray-50 border border-gray-200 align-top">{hora}</td>
                  {DIAS.map((_, diaIdx) => {
                    const alumnos = datosMaestras.calendario[hora]?.[String(diaIdx)] || []
                    return (
                      <td key={diaIdx} className="px-1 py-1 border border-gray-200 align-top min-w-28 bg-white">
                        <div className="space-y-0.5">
                          {alumnos.map((a, ai) => (
                            <div key={ai}
                              className="text-xs px-1.5 py-0.5 rounded text-white cursor-pointer hover:opacity-80 transition"
                              style={{backgroundColor: a.color}}
                              title={`Maestra: ${a.maestra_nombre}`}
                            >
                              {a.nombre}
                            </div>
                          ))}
                        </div>
                        {alumnos.length > 0 && (
                          <p className="text-gray-300 text-xs text-right mt-1">{alumnos.length}</p>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAlumno && (
        <ModalAlumno
          alumno={modalAlumno}
          horas={datos.horas}
          semana={datos.semana}
          onClose={() => setModalAlumno(null)}
          onConfirmar={confirmarAsistencia}
          onRecuperacion={(data) => { setModalRecup(data); setModalAlumno(null) }}
          navigate={navigate}
        />
      )}

      {modalRecup && (
        <ModalRecuperacion
          alumno={modalRecup}
          horas={datos.horas}
          onClose={() => setModalRecup(null)}
          onAgendar={agendarRecuperacion}
        />
      )}

      {modalProspecto && (
        <ModalNuevoProspecto
          horas={datos?.horas || []}
          semana={datos?.semana || []}
          onClose={() => setModalProspecto(null)}
          onGuardar={async (data) => {
            await api.post('/calendario/prospectos', data)
            cargarProspectos()
            setModalProspecto(null)
          }}
        />
      )}

      {modalVerProspecto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800">🔍 Prospecto</h3>
              <button onClick={() => setModalVerProspecto(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-2 text-sm">
              <p><span className="text-gray-500">Nombre:</span> <span className="font-medium">{modalVerProspecto.nombre_nino}</span></p>
              <p><span className="text-gray-500">Grado:</span> <span className="font-medium">{modalVerProspecto.grado || '—'}</span></p>
              <p><span className="text-gray-500">Edad:</span> <span className="font-medium">{modalVerProspecto.edad || '—'}</span></p>
              <p><span className="text-gray-500">Tutor:</span> <span className="font-medium">{modalVerProspecto.nombre_tutor || '—'}</span></p>
              <p><span className="text-gray-500">Teléfono:</span> <span className="font-medium">{modalVerProspecto.telefono_tutor || '—'}</span></p>
              <p><span className="text-gray-500">Fecha:</span> <span className="font-medium">{modalVerProspecto.fecha}</span></p>
              <p><span className="text-gray-500">Hora:</span> <span className="font-medium">{modalVerProspecto.hora}</span></p>
              <div className="pt-3">
                <button onClick={() => eliminarProspecto(modalVerProspecto.id)}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-lg text-sm font-medium">
                  🗑️ Eliminar prospecto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {nuevosAlumnos.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold text-gray-700 mb-3">🆕 Nuevos alumnos esta semana ({nuevosAlumnos.length})</h3>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Materias</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Prog. Lectura</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Prog. Matemáticas</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Fecha ingreso</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Maestra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {nuevosAlumnos.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-purple-600">{a.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{a.materias || '—'}</td>
                    <td className="px-4 py-3 font-mono text-blue-600 text-xs">{a.programa_lectura || '—'}</td>
                    <td className="px-4 py-3 font-mono text-red-600 text-xs">{a.programa_matematicas || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{a.fecha_ingreso}</td>
                    <td className="px-4 py-3 text-gray-500">{a.maestra_nombre || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ModalAlumno({ alumno, horas, semana, onClose, onConfirmar, onRecuperacion, navigate }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800">{alumno.nombre}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-500">📅 {alumno.fecha} · {alumno.hora}</p>
          <p className="text-sm font-medium text-gray-700">Confirmar asistencia:</p>
          <div className="flex gap-2">
            <button onClick={() => onConfirmar(alumno.alumno_id, alumno.fecha, true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">
              ✓ Asiste
            </button>
            <button onClick={() => onConfirmar(alumno.alumno_id, alumno.fecha, false)}
              className="flex-1 bg-orange-400 hover:bg-orange-500 text-white py-2 rounded-lg text-sm font-medium">
              ✗ No asiste
            </button>
            <button onClick={() => onConfirmar(alumno.alumno_id, alumno.fecha, null)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium">
              ? Sin confirmar
            </button>
          </div>
          <div className="pt-2 border-t flex gap-2">
            <button
              onClick={() => onRecuperacion({ alumno_id: alumno.alumno_id, nombre: alumno.nombre, fecha_original: alumno.fecha })}
              className="flex-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 py-2 rounded-lg text-sm font-medium">
              ⟳ Agendar recuperación
            </button>
            <button onClick={() => navigate(`/alumnos/${alumno.alumno_id}`)}
              className="flex-1 bg-purple-100 hover:bg-purple-200 text-purple-700 py-2 rounded-lg text-sm font-medium">
              Ver perfil
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalNuevoProspecto({ horas, semana, onClose, onGuardar }) {
  const [form, setForm] = useState({
    nombre_nino: '', grado: '', edad: '', nombre_tutor: '',
    telefono_tutor: '', fecha: '', hora: ''
  })

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleGuardar = async () => {
    if (!form.nombre_nino || !form.fecha || !form.hora) return
    await onGuardar({ ...form, edad: form.edad ? parseInt(form.edad) : null })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800">＋ Agendar prospecto</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del niño *</label>
              <input name="nombre_nino" value={form.nombre_nino} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Grado</label>
              <input name="grado" value={form.grado} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Edad</label>
              <input name="edad" type="number" value={form.edad} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del tutor</label>
              <input name="nombre_tutor" value={form.nombre_tutor} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono tutor</label>
              <input name="telefono_tutor" value={form.telefono_tutor} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha *</label>
              <input name="fecha" type="date" value={form.fecha} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Hora *</label>
            <select name="hora" value={form.hora} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="">Seleccionar hora</option>
              {horas.map(h => <option key={h} value={h}>{h} hrs</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancelar</button>
            <button onClick={handleGuardar} disabled={!form.nombre_nino || !form.fecha || !form.hora}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-2 rounded-lg text-sm font-medium">
              Agendar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalRecuperacion({ alumno, horas, onClose, onAgendar }) {
  const [fechaRecup, setFechaRecup] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')

  const handleAgendar = () => {
    if (!fechaRecup || !horaInicio) return
    onAgendar({
      alumno_id: alumno.alumno_id,
      fecha_original: alumno.fecha_original,
      fecha_recuperacion: fechaRecup,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800">⟳ Clase de recuperación</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">Alumno: <span className="font-medium">{alumno.nombre}</span></p>
          <p className="text-sm text-gray-500">Clase original: {alumno.fecha_original}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de recuperación</label>
            <input type="date" value={fechaRecup} onChange={e => setFechaRecup(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
              <select value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Seleccionar</option>
                {horas.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin</label>
              <select value={horaFin} onChange={e => setHoraFin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Seleccionar</option>
                {horas.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancelar</button>
            <button onClick={handleAgendar} disabled={!fechaRecup || !horaInicio}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white py-2 rounded-lg text-sm font-medium">
              Agendar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
