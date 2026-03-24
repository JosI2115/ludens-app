import { useState, useEffect } from 'react'
import { alumnosService } from '../services/api'

const SITUACION_COLORES = {
  prospecto: 'bg-gray-100 text-gray-700',
  inscripcion: 'bg-blue-100 text-blue-700',
  activo: 'bg-green-100 text-green-700',
  pendiente: 'bg-yellow-100 text-yellow-700',
  en_riesgo: 'bg-orange-100 text-orange-700',
  bloqueado: 'bg-red-100 text-red-700',
  baja: 'bg-red-200 text-red-800',
}

const SITUACION_LABELS = {
  prospecto: 'Prospecto',
  inscripcion: 'Inscripción',
  activo: 'Activo',
  pendiente: 'Pendiente',
  en_riesgo: 'En riesgo',
  bloqueado: 'Bloqueado',
  baja: 'Baja',
}

export default function Alumnos() {
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroSituacion, setFiltroSituacion] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null)
  const [error, setError] = useState('')

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    cargarAlumnos()
  }, [filtroSituacion])

  const cargarAlumnos = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filtroSituacion) params.situacion = filtroSituacion
      const response = await alumnosService.getAll(params)
      setAlumnos(response.data)
    } catch (err) {
      setError('Error al cargar alumnos')
    } finally {
      setLoading(false)
    }
  }

  const alumnosFiltrados = alumnos.filter(a =>
    `${a.nombre} ${a.apellido}`.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.nombre_tutor?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Alumnos</h2>
        <button
          onClick={() => { setAlumnoSeleccionado(null); setModalAbierto(true) }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + Nuevo alumno
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o tutor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <select
          value={filtroSituacion}
          onChange={(e) => setFiltroSituacion(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          <option value="">Todos</option>
          <option value="prospecto">Prospecto</option>
          <option value="activo">Activo</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_riesgo">En riesgo</option>
          <option value="bloqueado">Bloqueado</option>
          <option value="baja">Baja</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando alumnos...</div>
      ) : alumnosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No hay alumnos registrados</p>
          <p className="text-sm mt-1">Agrega el primer alumno con el botón de arriba</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Alumno</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Tutor</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Materias</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Plan</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Situación</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alumnosFiltrados.map((alumno) => (
                <tr key={alumno.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{alumno.nombre} {alumno.apellido}</p>
                    <p className="text-gray-400 text-xs">{alumno.grado} · {alumno.edad} años</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{alumno.nombre_tutor}</p>
                    <p className="text-gray-400 text-xs">{alumno.telefono_tutor}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{alumno.materias || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {alumno.plan_pago ? `$${alumno.plan_pago}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${SITUACION_COLORES[alumno.situacion]}`}>
                      {SITUACION_LABELS[alumno.situacion]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setAlumnoSeleccionado(alumno); setModalAbierto(true) }}
                      className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <FormularioAlumno
          alumno={alumnoSeleccionado}
          onClose={() => setModalAbierto(false)}
          onSuccess={() => { setModalAbierto(false); cargarAlumnos() }}
        />
      )}
    </div>
  )
}

function FormularioAlumno({ alumno, onClose, onSuccess }) {
  const [form, setForm] = useState({
    nombre: alumno?.nombre || '',
    apellido: alumno?.apellido || '',
    edad: alumno?.edad || '',
    grado: alumno?.grado || '',
    diagnostico: alumno?.diagnostico || '',
    nombre_tutor: alumno?.nombre_tutor || '',
    telefono_tutor: alumno?.telefono_tutor || '',
    telefono_emergencia: alumno?.telefono_emergencia || '',
    sucursal_id: alumno?.sucursal_id || '',
    situacion: alumno?.situacion || 'prospecto',
    plan_pago: alumno?.plan_pago || '',
    materias: alumno?.materias || '',
    horas_semana: alumno?.horas_semana || '',
    dia_pago: alumno?.dia_pago || '',
    tiene_descuento_hermano: alumno?.tiene_descuento_hermano || false,
    horario: alumno?.horario || '',
    fecha_diagnostico: alumno?.fecha_diagnostico || '',
    fecha_ingreso: alumno?.fecha_ingreso || '',
  })
  const [sucursales, setSucursales] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    cargarSucursales()
    if (!alumno && usuario.sucursal_id) {
      setForm(f => ({ ...f, sucursal_id: usuario.sucursal_id }))
    }
  }, [])

  const cargarSucursales = async () => {
    try {
      const { default: api } = await import('../services/api')
      const response = await api.get('/sucursales/')
      setSucursales(response.data)
    } catch (err) {
      console.error('Error cargando sucursales')
    }
  }

  useEffect(() => {
    if (!alumno && usuario.sucursal_id) {
      setForm(f => ({ ...f, sucursal_id: usuario.sucursal_id }))
    }
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = { ...form }
      
      if (!data.edad) delete data.edad
      if (!data.dia_pago) delete data.dia_pago
      if (!data.horas_semana) delete data.horas_semana
      if (!data.fecha_diagnostico) delete data.fecha_diagnostico
      if (!data.fecha_ingreso) delete data.fecha_ingreso
      if (!data.sucursal_id) delete data.sucursal_id
      if (!data.maestra_id) delete data.maestra_id
      if (!data.plan_pago) delete data.plan_pago
      if (!data.materias) delete data.materias
      if (!data.grado) delete data.grado
      if (!data.horario) delete data.horario
      if (!data.diagnostico) delete data.diagnostico
      if (!data.telefono_emergencia) delete data.telefono_emergencia

      if (alumno) {
        await alumnosService.actualizar(alumno.id, data)
      } else {
        await alumnosService.crear(data)
      }
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">
            {alumno ? 'Editar alumno' : 'Nuevo alumno'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
              <input name="apellido" value={form.apellido} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
              <input name="edad" type="number" value={form.edad} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grado</label>
              <select name="grado" value={form.grado} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Seleccionar</option>
                <option>Preescolar 3</option>
                <option>Primaria 1</option>
                <option>Primaria 2</option>
                <option>Primaria 3</option>
                <option>Primaria 4</option>
                <option>Primaria 5</option>
                <option>Primaria 6</option>
                <option>Secundaria 1</option>
                <option>Secundaria 2</option>
                <option>Secundaria 3</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico</label>
            <textarea name="diagnostico" value={form.diagnostico} onChange={handleChange} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del tutor *</label>
              <input name="nombre_tutor" value={form.nombre_tutor} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono tutor *</label>
              <input name="telefono_tutor" value={form.telefono_tutor} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tel. emergencia</label>
              <input name="telefono_emergencia" value={form.telefono_emergencia} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Situación</label>
              <select name="situacion" value={form.situacion} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="prospecto">Prospecto</option>
                <option value="inscripcion">Inscripción</option>
                <option value="activo">Activo</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_riesgo">En riesgo</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal *</label>
              <select name="sucursal_id" value={form.sucursal_id} onChange={handleChange} required
                disabled={usuario.rol !== 'directora' && usuario.rol !== 'contadora'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-100">
                <option value="">Seleccionar sucursal</option>
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan de pago</label>
              <select name="plan_pago" value={form.plan_pago} onChange={(e) => {
                const val = e.target.value
                setForm(f => ({
                  ...f,
                  plan_pago: val,
                  materias: val === '1200' || val === '1500' ? 'Lectura y Matematicas' : f.materias,
                  horas_semana: val === '900' ? 2 : val === '1200' ? 2 : val === '1500' ? 4 : f.horas_semana
                }))
              }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Seleccionar</option>
                <option value="900">$900 - 2hrs/1 materia</option>
                <option value="1200">$1,200 - 2hrs/2 materias</option>
                <option value="1500">$1,500 - 4hrs/2 materias</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Materias</label>
              <select name="materias" value={form.materias} onChange={handleChange}
                disabled={form.plan_pago === '1200' || form.plan_pago === '1500'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-100">
                <option value="">Seleccionar</option>
                <option value="Lectura">Lectura</option>
                <option value="Matematicas">Matemáticas</option>
                <option value="Lectura y Matematicas">Lectura y Matemáticas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Día de pago</label>
              <input name="dia_pago" type="number" min="1" max="31" value={form.dia_pago} onChange={handleChange}
                placeholder="Ej: 15"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha diagnóstico</label>
              <input name="fecha_diagnostico" type="date" value={form.fecha_diagnostico} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha ingreso</label>
              <input name="fecha_ingreso" type="date" value={form.fecha_ingreso} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horario</label>
            <input name="horario" value={form.horario} onChange={handleChange}
              placeholder="Ej: Lunes y Miércoles 11:00 - 12:00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>

          <div className="flex items-center gap-2">
            <input name="tiene_descuento_hermano" type="checkbox"
              checked={form.tiene_descuento_hermano} onChange={handleChange}
              className="w-4 h-4 text-purple-600" />
            <label className="text-sm text-gray-700">Tiene descuento por hermano</label>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white py-2 rounded-lg text-sm font-medium transition">
              {loading ? 'Guardando...' : alumno ? 'Actualizar' : 'Crear alumno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}