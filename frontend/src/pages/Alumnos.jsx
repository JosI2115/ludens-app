import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroPor, setFiltroPor] = useState('nombre')
  const [filtroGrado, setFiltroGrado] = useState('')
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

  const alumnosFiltrados = alumnos.filter(a => {
    const termino = busqueda.toLowerCase()
    const coincideBusqueda = filtroPor === 'nombre'
      ? `${a.nombre} ${a.apellido}`.toLowerCase().includes(termino)
      : filtroPor === 'maestra'
      ? (a.maestra_nombre || '').toLowerCase().includes(termino)
      : filtroPor === 'grado'
      ? (a.grado || '').toLowerCase().includes(termino)
      : true
    const coincideGrado = filtroGrado ? a.grado === filtroGrado : true
    const coincideSituacion = filtroSituacion ? a.situacion === filtroSituacion : true
    return coincideBusqueda && coincideGrado && coincideSituacion
  })

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

        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="flex flex-1 min-w-48">
            <select
              value={filtroPor}
              onChange={e => setFiltroPor(e.target.value)}
              className="border border-gray-300 rounded-l-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400 border-r-0"
            >
              <option value="nombre">Nombre</option>
              <option value="maestra">Maestra</option>
              <option value="grado">Grado</option>
            </select>
            <input
              type="text"
              placeholder={`Buscar por ${filtroPor}...`}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <select
            value={filtroGrado}
            onChange={e => setFiltroGrado(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">Todos los grados</option>
            <option value="Preescolar 3">Preescolar 3</option>
            <option value="Primaria 1">Primaria 1</option>
            <option value="Primaria 2">Primaria 2</option>
            <option value="Primaria 3">Primaria 3</option>
            <option value="Primaria 4">Primaria 4</option>
            <option value="Primaria 5">Primaria 5</option>
            <option value="Primaria 6">Primaria 6</option>
            <option value="Secundaria 1">Secundaria 1</option>
            <option value="Secundaria 2">Secundaria 2</option>
            <option value="Secundaria 3">Secundaria 3</option>
          </select>
          <select
            value={filtroSituacion}
            onChange={e => setFiltroSituacion(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">Todas las situaciones</option>
            <option value="prospecto">Prospecto</option>
            <option value="inscripcion">Inscripción</option>
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
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Maestra</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Plan</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Situación</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alumnosFiltrados.map((alumno) => (
                <tr key={alumno.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/alumnos/${alumno.id}`)}>
                    <p className="font-medium text-purple-600 hover:text-purple-800">{alumno.nombre} {alumno.apellido}</p>
                    <p className="text-gray-400 text-xs">{alumno.grado} · {alumno.edad} años</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{alumno.nombre_tutor}</p>
                    <p className="text-gray-400 text-xs">{alumno.telefono_tutor}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{alumno.materias || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{alumno.maestra_nombre || '—'}</td>
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
    maestra_id: alumno?.maestra_id || '',
    situacion: alumno?.situacion || 'prospecto',
    plan_pago: alumno?.plan_pago || '',
    materias: alumno?.materias || '',
    horas_semana: alumno?.horas_semana || '',
    dia_pago: alumno?.dia_pago || '',
    tiene_descuento_hermano: alumno?.tiene_descuento_hermano || false,
    numero_hermano: alumno?.numero_hermano || 1,
    horario: alumno?.horario || '',
    fecha_diagnostico: alumno?.fecha_diagnostico || '',
    fecha_ingreso: alumno?.fecha_ingreso || '',
    programa_lectura: alumno?.programa_lectura || '',
    programa_matematicas: alumno?.programa_matematicas || '',
    domicilio: alumno?.domicilio || '',
    escuela_procedencia: alumno?.escuela_procedencia || '',
    condicion_medica: alumno?.condicion_medica || '',
    permiso_fotos: alumno?.permiso_fotos || false,
    objetivos: alumno?.objetivos || '',
  })
  const [diasSeleccionados, setDiasSeleccionados] = useState(alumno?.horario_dias || [])
  const [horaInicio, setHoraInicio] = useState(alumno?.hora_inicio || '')
  const [horaFin, setHoraFin] = useState(alumno?.hora_fin || '')
  const [sucursales, setSucursales] = useState([])
  const [maestras, setMaestras] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    cargarSucursales()
    if (!alumno && usuario.sucursal_id) {
      setForm(f => ({ ...f, sucursal_id: usuario.sucursal_id }))
      cargarMaestras(usuario.sucursal_id)
    }
    if (alumno?.sucursal_id) {
      cargarMaestras(alumno.sucursal_id)
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

  const cargarMaestras = async (sucursal_id) => {
    if (!sucursal_id) return
    try {
      const { maestrasService } = await import('../services/api')
      const response = await maestrasService.getPorSucursal(sucursal_id)
      setMaestras(response.data)
    } catch (err) {
      console.error('Error cargando maestras')
    }
  }

  useEffect(() => {
    if (!alumno && usuario.sucursal_id) {
      setForm(f => ({ ...f, sucursal_id: usuario.sucursal_id }))
    }
  }, [])

  const toggleDia = (dia) => {
    setDiasSeleccionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Validaciones
    const errores = []
    if (!form.nombre.trim()) errores.push('El nombre es obligatorio')
    if (!form.apellido.trim()) errores.push('El apellido es obligatorio')
    if (!form.nombre_tutor.trim()) errores.push('El nombre del tutor es obligatorio')
    if (!form.telefono_tutor.trim()) errores.push('El teléfono del tutor es obligatorio')
    if (!form.sucursal_id) errores.push('Debes seleccionar una sucursal')
    if (!form.plan_pago) errores.push('Debes seleccionar un plan de pago')
    if (!form.dia_pago) errores.push('El día de pago es obligatorio')
    if (!form.fecha_ingreso) errores.push('La fecha de ingreso es obligatoria')
    if (form.telefono_tutor && !/^\d{7,15}$/.test(form.telefono_tutor.replace(/\s/g, ''))) {
      errores.push('El teléfono del tutor debe tener entre 7 y 15 dígitos')
    }

    if (errores.length > 0) {
      setError(errores.join(' · '))
      return
    }

    setLoading(true)
    setError('')
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

      if (diasSeleccionados.length > 0 && horaInicio && horaFin) {
        data.horario = `${diasSeleccionados.join(' y ')} ${horaInicio} - ${horaFin}`
      }
      console.log('Datos a enviar:', JSON.stringify(data))
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
              <input name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={(e) => {
                const fecha = e.target.value
                let edad = ''
                if (fecha) {
                  const hoy = new Date()
                  const nac = new Date(fecha)
                  edad = hoy.getFullYear() - nac.getFullYear()
                  const m = hoy.getMonth() - nac.getMonth()
                  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
                }
                setForm(f => ({ ...f, fecha_nacimiento: fecha, edad: edad.toString() }))
              }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Edad (calculada)</label>
              <input name="edad" type="number" value={form.edad} readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
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
              <select name="sucursal_id" value={form.sucursal_id} onChange={(e) => {
                const val = e.target.value
                setForm(f => ({ ...f, sucursal_id: val, maestra_id: '' }))
                cargarMaestras(val)
              }} required
                disabled={usuario.rol !== 'directora' && usuario.rol !== 'contadora'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-100">
                <option value="">Seleccionar sucursal</option>
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maestra asignada</label>
              <select name="maestra_id" value={form.maestra_id} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Sin asignar</option>
                {maestras.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre} ({m.rol})</option>
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
                {form.plan_pago !== '900' && (
                  <option value="Lectura y Matematicas">Lectura y Matemáticas</option>
                )}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Horario</label>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-2">Días de clase</p>
                <div className="flex gap-2 flex-wrap">
                  {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map(dia => (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => toggleDia(dia)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        diasSeleccionados.includes(dia)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {dia}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Hora inicio</p>
                  <select value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                    <option value="">Seleccionar</option>
                    {['8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'].map(h => (
                      <option key={h} value={h}>{h} hrs</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Hora fin</p>
                  <select value={horaFin} onChange={e => setHoraFin(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                    <option value="">Seleccionar</option>
                    {['9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'].map(h => (
                      <option key={h} value={h}>{h} hrs</option>
                    ))}
                  </select>
                </div>
              </div>
              {diasSeleccionados.length > 0 && horaInicio && horaFin && (
                <p className="text-xs text-purple-600 bg-purple-50 px-3 py-2 rounded-lg">
                  📅 {diasSeleccionados.join(' y ')} de {horaInicio} a {horaFin} hrs
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Programa de Lectura</label>
              <select name="programa_lectura" value={form.programa_lectura || ''} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Sin programa</option>
                <optgroup label="Preescolar">
                  <option value="LPREEA">LPREEA</option>
                  <option value="LPREEB">LPREEB</option>
                  <option value="LPREEC">LPREEC</option>
                  <option value="LPREED">LPREED</option>
                  <option value="LPREER">LPREER</option>
                </optgroup>
                <optgroup label="Primaria 1">
                  <option value="L1A">L1A</option><option value="L1B">L1B</option><option value="L1C">L1C</option>
                  <option value="L1D">L1D</option><option value="L1E">L1E</option><option value="L1R">L1R</option>
                </optgroup>
                <optgroup label="Primaria 2">
                  <option value="L2A">L2A</option><option value="L2B">L2B</option><option value="L2C">L2C</option>
                  <option value="L2D">L2D</option><option value="L2E">L2E</option><option value="L2R">L2R</option>
                </optgroup>
                <optgroup label="Primaria 3">
                  <option value="L3A">L3A</option><option value="L3B">L3B</option><option value="L3C">L3C</option>
                  <option value="L3D">L3D</option><option value="L3E">L3E</option><option value="L3R">L3R</option>
                </optgroup>
                <optgroup label="Primaria 4">
                  <option value="L4A">L4A</option><option value="L4B">L4B</option><option value="L4C">L4C</option>
                  <option value="L4D">L4D</option><option value="L4E">L4E</option><option value="L4R">L4R</option>
                </optgroup>
                <optgroup label="Primaria 5">
                  <option value="L5A">L5A</option><option value="L5B">L5B</option><option value="L5C">L5C</option>
                  <option value="L5D">L5D</option><option value="L5E">L5E</option><option value="L5R">L5R</option>
                </optgroup>
                <optgroup label="Primaria 6">
                  <option value="L6A">L6A</option><option value="L6B">L6B</option><option value="L6C">L6C</option>
                  <option value="L6D">L6D</option><option value="L6E">L6E</option><option value="L6R">L6R</option>
                </optgroup>
              </select>
              {alumno?.programa_lectura && form.programa_lectura !== alumno.programa_lectura && form.programa_lectura && (
                <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-1">
                  ⚠️ Cambiando de {alumno.programa_lectura} → {form.programa_lectura}. El anterior quedará en historial.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Programa de Matemáticas</label>
              <select name="programa_matematicas" value={form.programa_matematicas || ''} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Sin programa</option>
                <optgroup label="Preescolar">
                  <option value="MATPREEA">MATPREEA</option>
                  <option value="MATPREEB">MATPREEB</option>
                  <option value="MATPREEC">MATPREEC</option>
                  <option value="MATPREED">MATPREED</option>
                  <option value="MATPREER">MATPREER</option>
                </optgroup>
                <optgroup label="Primaria 1">
                  <option value="MAT1A">MAT1A</option><option value="MAT1B">MAT1B</option><option value="MAT1C">MAT1C</option>
                  <option value="MAT1D">MAT1D</option><option value="MAT1E">MAT1E</option><option value="MAT1R">MAT1R</option>
                </optgroup>
                <optgroup label="Primaria 2">
                  <option value="MAT2A">MAT2A</option><option value="MAT2B">MAT2B</option><option value="MAT2C">MAT2C</option>
                  <option value="MAT2D">MAT2D</option><option value="MAT2E">MAT2E</option><option value="MAT2R">MAT2R</option>
                </optgroup>
                <optgroup label="Primaria 3">
                  <option value="MAT3A">MAT3A</option><option value="MAT3B">MAT3B</option><option value="MAT3C">MAT3C</option>
                  <option value="MAT3D">MAT3D</option><option value="MAT3E">MAT3E</option><option value="MAT3R">MAT3R</option>
                </optgroup>
                <optgroup label="Primaria 4">
                  <option value="MAT4A">MAT4A</option><option value="MAT4B">MAT4B</option><option value="MAT4C">MAT4C</option>
                  <option value="MAT4D">MAT4D</option><option value="MAT4E">MAT4E</option><option value="MAT4R">MAT4R</option>
                </optgroup>
                <optgroup label="Primaria 5">
                  <option value="MAT5A">MAT5A</option><option value="MAT5B">MAT5B</option><option value="MAT5C">MAT5C</option>
                  <option value="MAT5D">MAT5D</option><option value="MAT5E">MAT5E</option><option value="MAT5R">MAT5R</option>
                </optgroup>
                <optgroup label="Primaria 6">
                  <option value="MAT6A">MAT6A</option><option value="MAT6B">MAT6B</option><option value="MAT6C">MAT6C</option>
                  <option value="MAT6D">MAT6D</option><option value="MAT6E">MAT6E</option><option value="MAT6R">MAT6R</option>
                </optgroup>
                <optgroup label="Secundaria 1">
                  <option value="MATSEC1A">MATSEC1A</option><option value="MATSEC1B">MATSEC1B</option><option value="MATSEC1C">MATSEC1C</option>
                  <option value="MATSEC1D">MATSEC1D</option><option value="MATSEC1E">MATSEC1E</option><option value="MATSEC1R">MATSEC1R</option>
                </optgroup>
                <optgroup label="Secundaria 2">
                  <option value="MATSEC2A">MATSEC2A</option><option value="MATSEC2B">MATSEC2B</option><option value="MATSEC2C">MATSEC2C</option>
                  <option value="MATSEC2D">MATSEC2D</option><option value="MATSEC2E">MATSEC2E</option><option value="MATSEC2R">MATSEC2R</option>
                </optgroup>
                <optgroup label="Secundaria 3">
                  <option value="MATSEC3A">MATSEC3A</option><option value="MATSEC3B">MATSEC3B</option><option value="MATSEC3C">MATSEC3C</option>
                  <option value="MATSEC3D">MATSEC3D</option><option value="MATSEC3E">MATSEC3E</option><option value="MATSEC3R">MATSEC3R</option>
                </optgroup>
              </select>
              {alumno?.programa_matematicas && form.programa_matematicas !== alumno.programa_matematicas && form.programa_matematicas && (
                <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-1">
                  ⚠️ Cambiando de {alumno.programa_matematicas} → {form.programa_matematicas}. El anterior quedará en historial.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domicilio</label>
            <input name="domicilio" value={form.domicilio} onChange={handleChange}
              placeholder="Calle, número, colonia"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Escuela de procedencia</label>
            <input name="escuela_procedencia" value={form.escuela_procedencia} onChange={handleChange}
              placeholder="Nombre de la escuela a la que asiste"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condición médica o alergias</label>
            <textarea name="condicion_medica" value={form.condicion_medica} onChange={handleChange}
              rows={2} placeholder="¿Tiene alguna condición médica, alergia o situación de salud que debamos conocer?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objetivos de trabajo</label>
            <textarea name="objetivos" value={form.objetivos} onChange={handleChange}
              rows={2} placeholder="¿Cuáles son los objetivos principales de trabajo con este alumno?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>

          <div className="flex items-center gap-2">
            <input name="permiso_fotos" type="checkbox"
              checked={form.permiso_fotos} onChange={handleChange}
              className="w-4 h-4 text-purple-600" />
            <label className="text-sm text-gray-700">Autoriza uso de fotos en redes sociales</label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input name="tiene_descuento_hermano" type="checkbox"
                checked={form.tiene_descuento_hermano} onChange={handleChange}
                className="w-4 h-4 text-purple-600" />
              <label className="text-sm text-gray-700">Tiene descuento por hermano</label>
            </div>

            {form.tiene_descuento_hermano && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de hermano</label>
                <select name="numero_hermano" value={form.numero_hermano} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                  <option value={2}>Hermano 2 (30% descuento)</option>
                  <option value={3}>Hermano 3 (15% descuento)</option>
                  <option value={4}>Hermano 4 (5% descuento)</option>
                </select>
                {form.plan_pago && form.numero_hermano > 1 && (
                  <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700">
                    {form.numero_hermano == 2 && `Paga: $${form.plan_pago == '900' ? '630' : form.plan_pago == '1200' ? '840' : '1050'}/mes (30% desc)`}
                    {form.numero_hermano == 3 && `Paga: $${form.plan_pago == '900' ? '765' : form.plan_pago == '1200' ? '1020' : '1275'}/mes (15% desc)`}
                    {form.numero_hermano == 4 && `Paga: $${form.plan_pago == '900' ? '855' : form.plan_pago == '1200' ? '1140' : '1425'}/mes (5% desc)`}
                  </div>
                )}
              </div>
            )}
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