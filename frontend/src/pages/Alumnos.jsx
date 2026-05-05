import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { alumnosService, sucursalesService } from '../services/api'

const SITUACION_COLORES = {
  prospecto: 'bg-gray-100 text-gray-700',
  inscripcion: 'bg-blue-100 text-blue-700',
  activo: 'bg-green-100 text-green-700',
  pendiente: 'bg-yellow-100 text-yellow-700',
  en_riesgo: 'bg-orange-100 text-orange-700',
  bloqueado: 'bg-red-100 text-red-700',
  baja: 'bg-red-200 text-red-800',
  becado: 'bg-indigo-100 text-indigo-700',
}

const SITUACION_LABELS = {
  prospecto: 'Prospecto',
  inscripcion: 'Inscripción',
  activo: 'Activo',
  pendiente: 'Pendiente',
  en_riesgo: 'En riesgo',
  bloqueado: 'Bloqueado',
  baja: 'Baja',
  becado: 'Becado',
}

export default function Alumnos() {
  const navigate = useNavigate()
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroPor, setFiltroPor] = useState('nombre')
  const [filtroGrado, setFiltroGrado] = useState('')
  const [filtroSituacion, setFiltroSituacion] = useState('')
  const [sucursales, setSucursales] = useState([])
  const [filtroSucursal, setFiltroSucursal] = useState('')
  const [verBajas, setVerBajas] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null)
  const [error, setError] = useState('')
  const [modalBaja, setModalBaja] = useState(null)
  const [fechaBaja, setFechaBaja] = useState(new Date().toISOString().split('T')[0])
  const [motivoBaja, setMotivoBaja] = useState('')

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    cargarAlumnos()
    cargarSucursales()
  }, [filtroSituacion, verBajas])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('nuevo') === '1') {
      setAlumnoSeleccionado(null)
      setModalAbierto(true)
    }
  }, [])

  const iniciarBaja = (alumno) => {
    setModalBaja(alumno)
    setFechaBaja(new Date().toISOString().split('T')[0])
    setMotivoBaja('')
  }

  const confirmarBaja = async () => {
    if (!motivoBaja.trim()) {
      alert('El motivo de baja es obligatorio')
      return
    }
    try {
      await alumnosService.darBaja(modalBaja.id, motivoBaja, fechaBaja)
      setModalBaja(null)
      cargarAlumnos()
    } catch (err) {
      alert('Error al dar de baja')
    }
  }

  const cargarSucursales = async () => {
    try {
      const res = await sucursalesService.getAll()
      setSucursales(res.data)
    } catch (err) {
      console.error('Error cargando sucursales')
    }
  }

  const cargarAlumnos = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filtroSituacion) params.situacion = filtroSituacion
      if (verBajas) params.incluir_bajas = true
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
      ? (
          (a.maestra_nombre || '').toLowerCase().includes(termino) ||
          (a.maestra_lectura_nombre || '').toLowerCase().includes(termino) ||
          (a.maestra_matematicas_nombre || '').toLowerCase().includes(termino)
        )
      : filtroPor === 'grado'
      ? (a.grado || '').toLowerCase().includes(termino)
      : true
    const coincideGrado = filtroGrado ? a.grado === filtroGrado : true
    const coincideSituacion = filtroSituacion ? a.situacion === filtroSituacion : true
    const coincideSucursal = filtroSucursal ? a.sucursal_id === filtroSucursal : true
    return coincideBusqueda && coincideGrado && coincideSituacion && coincideSucursal
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
          <select
            value={filtroSucursal}
            onChange={e => setFiltroSucursal(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">Todas las sucursales</option>
            {sucursales.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
          <button
            onClick={() => setVerBajas(!verBajas)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              verBajas ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {verBajas ? '✕ Ocultar bajas' : '📋 Ver bajas'}
          </button>
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
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {alumno.maestra_lectura_nombre && <p>L: {alumno.maestra_lectura_nombre}</p>}
                    {alumno.maestra_matematicas_nombre && <p>M: {alumno.maestra_matematicas_nombre}</p>}
                    {!alumno.maestra_lectura_nombre && !alumno.maestra_matematicas_nombre && '—'}
                  </td>
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
                    {(usuario.rol === 'directora' || usuario.rol === 'encargada' || usuario.rol === 'recepcionista') && alumno.situacion !== 'baja' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); iniciarBaja(alumno) }}
                        className="text-orange-500 hover:text-orange-700 text-xs font-medium ml-2"
                      >
                        Dar de baja
                      </button>
                    )}
                    {(usuario.rol === 'directora' || usuario.rol === 'encargada' || usuario.rol === 'recepcionista') && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!window.confirm(`¿Eliminar completamente a ${alumno.nombre} ${alumno.apellido}? Esta acción no se puede deshacer.`)) return
                          try {
                            await alumnosService.eliminarCompleto(alumno.id)
                            cargarAlumnos()
                          } catch (err) {
                            alert('Error eliminando alumno')
                          }
                        }}
                        className="text-red-500 hover:text-red-700 text-xs font-medium ml-2"
                      >
                        Eliminar
                      </button>
                    )}
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

      {modalBaja && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Dar de baja a {modalBaja.nombre} {modalBaja.apellido}</h3>
              <button onClick={() => setModalBaja(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de baja *</label>
                <input type="date" value={fechaBaja} onChange={e => setFechaBaja(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de baja *</label>
                <textarea value={motivoBaja} onChange={e => setMotivoBaja(e.target.value)}
                  placeholder="Ej: Se cambió de escuela, No siguió pagando..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalBaja(null)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancelar</button>
                <button onClick={confirmarBaja}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium">
                  Dar de baja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FormularioAlumno({ alumno, onClose, onSuccess }) {
  const urlParams = new URLSearchParams(window.location.search)
  const informeIdParam = urlParams.get('informe_id')
  const [alumnoEnBaja, setAlumnoEnBaja] = useState(null)
  const [form, setForm] = useState({
    nombre: alumno?.nombre || urlParams.get('nombre') || '',
    apellido: alumno?.apellido || urlParams.get('apellido') || '',
    edad: alumno?.edad || '',
    fecha_nacimiento: alumno?.fecha_nacimiento || '',
    grado: alumno?.grado || urlParams.get('grado') || '',
    diagnostico: alumno?.diagnostico || '',
    nombre_tutor: alumno?.nombre_tutor || urlParams.get('tutor') || '',
    telefono_tutor: alumno?.telefono_tutor || urlParams.get('telefono') || '',
    telefono_emergencia: alumno?.telefono_emergencia || '',
    sucursal_id: alumno?.sucursal_id || urlParams.get('sucursal_id') || '',
    maestra_id: alumno?.maestra_id || '',
    maestra_lectura_id: alumno?.maestra_lectura_id || '',
    maestra_matematicas_id: alumno?.maestra_matematicas_id || '',
    materia_maestra1: alumno?.materia_maestra1 || 'lectura',
    materia_maestra2: alumno?.materia_maestra2 || 'matematicas',
    situacion: alumno?.situacion || 'prospecto',
    plan_pago: alumno?.plan_pago || '',
    monto_personalizado: '',
    materias: alumno?.materias || '',
    horas_semana: alumno?.horas_semana || '',
    dia_pago: alumno?.dia_pago || '',
    tiene_descuento_hermano: alumno?.tiene_descuento_hermano || false,
    numero_hermano: alumno?.numero_hermano || 1,
    horario: alumno?.horario || '',
    horario_json: alumno?.horario_json ? JSON.parse(alumno.horario_json) : [],
    fecha_diagnostico: alumno?.fecha_diagnostico || urlParams.get('fecha_diagnostico') || '',
    fecha_ingreso: alumno?.fecha_ingreso || '',
    programa_lectura: alumno?.programa_lectura || '',
    programa_matematicas: alumno?.programa_matematicas || '',
    programa_personalizado_lectura: alumno?.programa_personalizado_lectura || false,
    programa_personalizado_matematicas: alumno?.programa_personalizado_matematicas || false,
    domicilio: alumno?.domicilio || '',
    escuela_procedencia: alumno?.escuela_procedencia || '',
    condicion_medica: alumno?.condicion_medica || '',
    permiso_fotos: alumno?.permiso_fotos || false,
    objetivos: alumno?.objetivos || '',
  })
  const [franjas, setFranjas] = useState([{ dias: [], inicio: '', fin: '' }])
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
    if (alumno?.horario) {
      setFranjas([{ dias: [], inicio: '', fin: '', texto: alumno.horario }])
    }
  }, [])

  const calcularHorasTotales = () => {
    return franjas.reduce((total, franja) => {
      if (!franja.inicio || !franja.fin || franja.dias.length === 0) return total
      const inicio = parseInt(franja.inicio.split(':')[0])
      const fin = parseInt(franja.fin.split(':')[0])
      const horasPorDia = fin - inicio
      return total + (horasPorDia * franja.dias.length)
    }, 0)
  }

  const agregarFranja = () => {
    setFranjas(prev => [...prev, { dias: [], inicio: '', fin: '' }])
  }

  const eliminarFranja = (index) => {
    setFranjas(prev => prev.filter((_, i) => i !== index))
  }

  const actualizarFranja = (index, campo, valor) => {
    setFranjas(prev => prev.map((f, i) => i === index ? { ...f, [campo]: valor } : f))
  }

  const toggleDiaFranja = (index, dia) => {
    setFranjas(prev => prev.map((f, i) => {
      if (i !== index) return f
      const dias = f.dias.includes(dia) ? f.dias.filter(d => d !== dia) : [...f.dias, dia]
      return { ...f, dias }
    }))
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name === 'sucursal_id') {
      setForm(f => ({ ...f, sucursal_id: value, maestra_lectura_id: '', maestra_matematicas_id: '', plan_pago: '' }))
      cargarMaestras(value)
      return
    }
    if (name === 'plan_pago') {
      const sucursal = sucursales.find(s => s.id === form.sucursal_id)
      const esValleReal = sucursal && sucursal.nombre.toLowerCase().includes('valle')
      let materias = form.materias
      if (esValleReal) {
        if (value === '1650' || value === '2300') {
          materias = 'Lectura y Matematicas'
        } else if (value === '1200') {
          materias = ''
        }
      } else {
        if (value === '1200' || value === '1500') {
          materias = 'Lectura y Matematicas'
        } else if (value === '900') {
          materias = ''
        }
      }
      setForm(f => ({ ...f, [name]: value, materias }))
      return
    }
    if (name === 'nombre' || name === 'apellido') {
      const nombreCompleto = name === 'nombre' ? `${value} ${form.apellido}` : `${form.nombre} ${value}`
      buscarAlumnoEnBaja(nombreCompleto)
    }
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const buscarAlumnoEnBaja = async (nombre) => {
    if (nombre.trim().length < 3) { setAlumnoEnBaja(null); return }
    try {
      const res = await alumnosService.getAll({ incluir_bajas: true })
      console.log('Buscando:', nombre, 'Total alumnos:', res.data.length)
      const encontrado = res.data.find(a =>
        a.situacion === 'baja' &&
        `${a.nombre} ${a.apellido}`.toLowerCase().includes(nombre.toLowerCase())
      )
      console.log('Encontrado:', encontrado)
      setAlumnoEnBaja(encontrado || null)
    } catch (err) {
      console.error('Error buscando:', err)
    }
  }

  const getPlanesPago = (sucursalId) => {
    const sucursal = sucursales.find(s => s.id === sucursalId)
    if (sucursal && sucursal.nombre.toLowerCase().includes('valle')) {
      return [
        { value: '1200', label: '$1,200 — 1 materia, 2 hrs/sem' },
        { value: '1650', label: '$1,650 — 2 materias, 2 hrs/sem' },
        { value: '2300', label: '$2,300 — 2 materias, 4 hrs/sem' },
        { value: 'personalizado', label: 'Personalizado' },
      ]
    }
    return [
      { value: '900', label: '$900 — 1 materia, 2 hrs/sem' },
      { value: '1200', label: '$1,200 — 2 materias, 2 hrs/sem' },
      { value: '1500', label: '$1,500 — 2 materias, 4 hrs/sem' },
      { value: 'personalizado', label: 'Personalizado' },
    ]
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Validaciones
    const errores = []
    if (!form.nombre.trim()) errores.push('El nombre del alumno es obligatorio')
    if (!form.nombre_tutor.trim()) errores.push('El nombre del tutor es obligatorio')
    if (!form.telefono_tutor.trim()) errores.push('El teléfono del tutor es obligatorio')
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
      if (!data.fecha_nacimiento) delete data.fecha_nacimiento
      if (!data.fecha_diagnostico) delete data.fecha_diagnostico
      if (!data.fecha_ingreso) delete data.fecha_ingreso
      if (!data.sucursal_id) delete data.sucursal_id
      if (!data.maestra_id) delete data.maestra_id
      if (data.plan_pago === 'personalizado') {
        if (!data.monto_personalizado || isNaN(parseInt(data.monto_personalizado))) {
          setError('Debes ingresar un monto personalizado válido')
          return
        }
        data.plan_pago = data.monto_personalizado.toString()
      }
      delete data.monto_personalizado
      if (!data.plan_pago) delete data.plan_pago
      if (!data.materias) delete data.materias
      if (!data.grado) delete data.grado
      if (!data.horario) delete data.horario
      if (!data.diagnostico) delete data.diagnostico
      if (!data.telefono_emergencia) delete data.telefono_emergencia

      const horasTotalesHorario = (form.horario_json || []).reduce((total, franja) => {
        const inicio = parseInt(franja.hora_inicio.split(':')[0])
        const fin = parseInt(franja.hora_fin.split(':')[0])
        return total + (fin - inicio)
      }, 0)
      if (form.plan_pago !== 'personalizado') {
        const horasPermitidasPlan = parseInt(form.plan_pago) >= 1500 ? 4 : 2
        if (horasTotalesHorario > horasPermitidasPlan) {
          setError(`El horario tiene ${horasTotalesHorario} horas pero el plan solo permite ${horasPermitidasPlan} horas`)
          return
        }

        // Validar que no haya dos franjas el mismo día y hora
        const franjas = form.horario_json || []
        const combinaciones = franjas.map(f => `${f.dia}_${f.hora_inicio}`)
        const duplicados = combinaciones.filter((c, i) => combinaciones.indexOf(c) !== i)
        if (duplicados.length > 0) {
          setError('No puede haber dos clases el mismo día a la misma hora')
          return
        }
      }

      if (!data.maestra_lectura_id) data.maestra_lectura_id = null
      if (!data.maestra_matematicas_id) data.maestra_matematicas_id = null

      const DIAS_ABREV = { Lunes: 'Lun', Martes: 'Mar', Miércoles: 'Mié', Jueves: 'Jue', Viernes: 'Vie', Sábado: 'Sáb' }
      const horarioTexto = (form.horario_json || []).map(f =>
        `${DIAS_ABREV[f.dia] || f.dia} ${f.hora_inicio}-${f.hora_fin}`
      ).join(' | ')
      const dataEnviar = {
        ...data,
        horario: horarioTexto || data.horario,
        horario_json: JSON.stringify(form.horario_json || [])
      }
      if (!dataEnviar.horario) delete dataEnviar.horario
      console.log('Datos a enviar:', JSON.stringify(dataEnviar))
      if (alumno) {
        await alumnosService.actualizar(alumno.id, dataEnviar)
      } else {
        const resultado = await alumnosService.crear(dataEnviar)
        if (informeIdParam) {
          try {
            const { default: apiInstance } = await import('../services/api')
            await apiInstance.put(`/informes/${informeIdParam}`, {
              situacion: 'acudio_diagnostico',
              alumno_id: resultado.data.id,
              ultimo_contacto: new Date().toISOString().split('T')[0]
            })
          } catch (err) {
            console.error('Error ligando informe')
          }
        }
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
          </div>
          {alumnoEnBaja && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm">
              <p className="text-yellow-800 font-medium">⚠️ Posible reingreso</p>
              <p className="text-yellow-700">"{alumnoEnBaja.nombre} {alumnoEnBaja.apellido}" está actualmente en baja. Motivo: {alumnoEnBaja.motivo_baja || 'No especificado'}</p>
              <p className="text-yellow-600 text-xs mt-1">Considera reactivar ese alumno en lugar de crear uno nuevo.</p>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm(`¿Reactivar a ${alumnoEnBaja.nombre} ${alumnoEnBaja.apellido}?`)) return
                  try {
                    await alumnosService.actualizar(alumnoEnBaja.id, { situacion: 'activo', fecha_baja: null, motivo_baja: null })
                    alert(`${alumnoEnBaja.nombre} ${alumnoEnBaja.apellido} reactivado correctamente`)
                    onClose()
                    window.location.reload()
                  } catch (err) {
                    console.error('Error reactivando:', err.response?.data || err.message)
                    alert('Error reactivando alumno')
                  }
                }}
                className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
              >
                Reactivar a {alumnoEnBaja.nombre}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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
                <option value="becado">Becado</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal *</label>
              <select name="sucursal_id" value={form.sucursal_id} onChange={handleChange} required
                disabled={false}
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
            {form.situacion === 'becado' ? (
              <div className="space-y-2">
                <input
                  name="plan_pago"
                  type="number"
                  value={form.plan_pago}
                  onChange={handleChange}
                  placeholder="Monto personalizado (puede ser 0)"
                  className="w-full border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <p className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                  🎓 Alumno becado — ingresa el monto mensual (0 si es beca completa)
                </p>
              </div>
            ) : (
              <select name="plan_pago" value={form.plan_pago} onChange={(e) => {
                const val = e.target.value
                let materias = form.materias
                let horas = form.horas_semana
                if (val === '1200') { materias = 'Lectura y Matematicas'; horas = 2 }
                if (val === '1500') { materias = 'Lectura y Matematicas'; horas = 4 }
                if (val === '900') { horas = 2 }
                setForm(f => ({ ...f, plan_pago: val, materias, horas_semana: horas }))
              }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Seleccionar plan</option>
                {getPlanesPago(form.sucursal_id).map(plan => (
                  <option key={plan.value} value={plan.value}>{plan.label}</option>
                ))}
              </select>
            )}
            {form.plan_pago === 'personalizado' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto personalizado</label>
                <input
                  name="monto_personalizado"
                  type="number"
                  value={form.monto_personalizado || ''}
                  onChange={handleChange}
                  placeholder="Ej: 450, 750, 630..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <p className="text-xs text-gray-400 mt-1">Este monto se usará como plan de pago mensual</p>
              </div>
            )}
          </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Materias</label>
              {(() => {
                const esValleReal = sucursales.find(s => s.id === form.sucursal_id)?.nombre?.toLowerCase().includes('valle')
                const planDos = esValleReal ? ['1650','2300'].includes(form.plan_pago) : ['1200','1500'].includes(form.plan_pago)
                const es1Materia = esValleReal ? form.plan_pago === '1200' : form.plan_pago === '900'
                return (
                  <select name="materias" value={form.materias} onChange={handleChange} disabled={planDos}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-100">
                    <option value="">Seleccionar</option>
                    <option value="Lectura">Lectura</option>
                    <option value="Matematicas">Matemáticas</option>
                    {!es1Materia && <option value="Lectura y Matematicas">Lectura y Matemáticas</option>}
                  </select>
                )
              })()}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de ingreso</label>
              <input
                name="fecha_ingreso"
                type="date"
                value={form.fecha_ingreso}
                onChange={(e) => {
                  const nuevaFecha = e.target.value
                  if (alumno?.fecha_ingreso && nuevaFecha !== alumno.fecha_ingreso) {
                    if (!window.confirm('⚠️ Si cambias la fecha de ingreso se borrarán todas las asistencias registradas anteriores a esa fecha y se reiniciará el conteo de riesgo/baja. ¿Continuar?')) {
                      return
                    }
                  }
                  setForm(f => ({ ...f, fecha_ingreso: nuevaFecha }))
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maestra 1</label>
              <select name="maestra_lectura_id" value={form.maestra_lectura_id || ''} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Sin asignar</option>
                {maestras.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            {(form.plan_pago === '1200' || form.plan_pago === '1500' || parseInt(form.plan_pago) >= 1200 || (form.plan_pago === 'personalizado' && form.materias && form.materias.includes('y'))) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maestra 2</label>
                <select name="maestra_matematicas_id" value={form.maestra_matematicas_id || ''} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                  <option value="">Sin asignar</option>
                  {maestras.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
            )}
          </div>

          <EditorHorario
            franjas={form.horario_json || []}
            onChange={(nuevas) => setForm(f => ({ ...f, horario_json: nuevas }))}
            maestraLecturaId={form.maestra_lectura_id}
            maestraMatematicasId={form.maestra_matematicas_id}
            maestras={maestras}
            planPago={form.plan_pago}
            horasSemana={parseInt(form.horas_semana) || 2}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico</label>
            <textarea name="diagnostico" value={form.diagnostico} onChange={handleChange} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Programa de Lectura</label>
              <select name="programa_lectura" value={form.programa_lectura || ''} onChange={handleChange}
                disabled={form.programa_personalizado_lectura}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-100">
                <option value="">{form.programa_personalizado_lectura ? 'Programa personalizado activado' : 'Sin programa'}</option>
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
              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox"
                  checked={form.programa_personalizado_lectura || false}
                  onChange={e => setForm(f => ({
                    ...f,
                    programa_personalizado_lectura: e.target.checked,
                    programa_lectura: e.target.checked ? '' : f.programa_lectura
                  }))}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <label className="text-xs text-gray-500">Agregar programa personalizado de lectura</label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Programa de Matemáticas</label>
              <select name="programa_matematicas" value={form.programa_matematicas || ''} onChange={handleChange}
                disabled={form.programa_personalizado_matematicas}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-100">
                <option value="">{form.programa_personalizado_matematicas ? 'Programa personalizado activado' : 'Sin programa'}</option>
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
              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox"
                  checked={form.programa_personalizado_matematicas || false}
                  onChange={e => setForm(f => ({
                    ...f,
                    programa_personalizado_matematicas: e.target.checked,
                    programa_matematicas: e.target.checked ? '' : f.programa_matematicas
                  }))}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <label className="text-xs text-gray-500">Agregar programa personalizado de matemáticas</label>
              </div>
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

function EditorHorario({ franjas, onChange, maestraLecturaId, maestraMatematicasId, maestras, planPago, horasSemana }) {
  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const HORAS = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']
  const tiene2Materias = parseInt(planPago) >= 1200 || planPago === 'personalizado'

  const calcularHorasTotales = () => {
    return franjas.reduce((total, franja) => {
      const inicio = parseInt(franja.hora_inicio.split(':')[0])
      const fin = parseInt(franja.hora_fin.split(':')[0])
      return total + (fin - inicio)
    }, 0)
  }

  const horasPermitidas = planPago === 'personalizado' ? (horasSemana || 4) : (parseInt(planPago) >= 1500 ? 4 : 2)
  const horasTotales = calcularHorasTotales()
  const horasOk = horasTotales === horasPermitidas
  const horasExcedidas = horasTotales > horasPermitidas

  const hayDuplicados = () => {
    const combinaciones = franjas.map(f => `${f.dia}_${f.hora_inicio}`)
    return combinaciones.some((c, i) => combinaciones.indexOf(c) !== i)
  }

  const agregarFranja = () => {
    onChange([...franjas, { dia: 'Lunes', hora_inicio: '9:00', hora_fin: '10:00', materia: 'lectura', maestra_id: maestraLecturaId || '' }])
  }

  const eliminarFranja = (i) => {
    onChange(franjas.filter((_, idx) => idx !== i))
  }

  const actualizarFranja = (i, campo, valor) => {
    const nuevas = [...franjas]
    nuevas[i] = { ...nuevas[i], [campo]: valor }
    if (campo === 'materia') {
      if (valor === 'lectura') {
        nuevas[i].maestra_id = maestraLecturaId || maestraMatematicasId || ''
      } else {
        nuevas[i].maestra_id = maestraMatematicasId || maestraLecturaId || ''
      }
    }
    onChange(nuevas)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-gray-700">Horario</label>
        <button type="button" onClick={agregarFranja}
          className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded-lg font-medium">
          + Agregar franja
        </button>
      </div>
      {franjas.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
          💡 Ejemplo: Agrega una franja → Lunes, 11:00 a 12:00, Lectura. Si tiene 2 materias agrega otra franja para Matemáticas.
        </div>
      )}
      <div className="space-y-2">
        {franjas.map((franja, i) => (
          <div key={i} className="flex gap-2 items-center bg-gray-50 rounded-lg p-2 flex-wrap">
            <select value={franja.dia} onChange={e => actualizarFranja(i, 'dia', e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400">
              {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={franja.hora_inicio} onChange={e => actualizarFranja(i, 'hora_inicio', e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400">
              {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="text-xs text-gray-500">a</span>
            <select value={franja.hora_fin} onChange={e => actualizarFranja(i, 'hora_fin', e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400">
              {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            {tiene2Materias && (
              <select value={franja.materia} onChange={e => actualizarFranja(i, 'materia', e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400">
                <option value="lectura">📚 Lectura</option>
                <option value="matematicas">🔢 Matemáticas</option>
              </select>
            )}
            <span className="text-xs text-gray-400">
              {maestras.find(m => m.id === franja.maestra_id)?.nombre || 'Sin maestra'}
            </span>
            <button type="button" onClick={() => eliminarFranja(i)}
              className="text-red-400 hover:text-red-600 text-xs ml-auto">✕</button>
          </div>
        ))}
      </div>
      {franjas.length > 0 && planPago !== 'personalizado' && (
        <div className={`mt-2 text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
          horasExcedidas ? 'bg-red-50 text-red-700 border border-red-200' :
          horasOk ? 'bg-green-50 text-green-700 border border-green-200' :
          'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`}>
          {horasExcedidas ? '⚠️' : horasOk ? '✓' : 'ℹ️'}
          <span>
            {horasTotales} hora{horasTotales !== 1 ? 's' : ''} registrada{horasTotales !== 1 ? 's' : ''} de {horasPermitidas} permitida{horasPermitidas !== 1 ? 's' : ''} según el plan
            {horasExcedidas && ' — excede el límite del plan'}
            {horasOk && ' — horario completo'}
            {!horasOk && !horasExcedidas && ` — faltan ${horasPermitidas - horasTotales} hora${horasPermitidas - horasTotales !== 1 ? 's' : ''}`}
          </span>
        </div>
      )}
      {hayDuplicados() && planPago !== 'personalizado' && (
        <div className="mt-1 text-xs px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200">
          ⚠️ Hay dos clases programadas el mismo día y hora — esto no está permitido
        </div>
      )}
    </div>
  )
}