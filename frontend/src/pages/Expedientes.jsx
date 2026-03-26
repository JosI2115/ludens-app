import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { alumnosService } from '../services/api'

const SITUACION_COLORES = {
  prospecto:   'bg-gray-100 text-gray-600',
  inscripcion: 'bg-blue-100 text-blue-700',
  activo:      'bg-green-100 text-green-700',
  pendiente:   'bg-yellow-100 text-yellow-700',
  en_riesgo:   'bg-orange-100 text-orange-700',
  bloqueado:   'bg-red-100 text-red-700',
  baja:        'bg-red-200 text-red-800',
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function Expedientes() {
  const navigate = useNavigate()
  const [alumnos, setAlumnos] = useState([])
  const [bajas, setBajas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [tab, setTab] = useState('activos')
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loadingPerfil, setLoadingPerfil] = useState(false)

  useEffect(() => {
    cargarAlumnos()
  }, [])

  const cargarAlumnos = async () => {
    try {
      const [activosRes, bajasRes] = await Promise.all([
        alumnosService.getAll({ situacion: 'activo' }),
        alumnosService.getAll({ situacion: 'baja' }),
      ])
      setAlumnos(activosRes.data)
      setBajas(bajasRes.data)
    } catch (err) {
      console.error('Error cargando alumnos')
    } finally {
      setLoading(false)
    }
  }

  const cargarPerfil = async (alumno) => {
    setAlumnoSeleccionado(alumno)
    setLoadingPerfil(true)
    try {
      const res = await alumnosService.getPerfil(alumno.id)
      setPerfil(res.data)
    } catch (err) {
      console.error('Error cargando perfil')
    } finally {
      setLoadingPerfil(false)
    }
  }

  const lista = tab === 'activos' ? alumnos : bajas
  const filtrados = lista.filter(a =>
    `${a.nombre} ${a.apellido}`.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Expedientes</h2>
          <input
            type="text"
            placeholder="Buscar alumno..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 mb-3"
          />
          <div className="flex gap-1">
            <button onClick={() => setTab('activos')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${tab === 'activos' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              Activos ({alumnos.length})
            </button>
            <button onClick={() => setTab('bajas')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${tab === 'bajas' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              Bajas ({bajas.length})
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-4">Cargando...</p>
          ) : filtrados.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">Sin resultados</p>
          ) : (
            filtrados.map(alumno => (
              <button
                key={alumno.id}
                onClick={() => cargarPerfil(alumno)}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition text-sm ${
                  alumnoSeleccionado?.id === alumno.id
                    ? 'bg-purple-100 text-purple-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <p className="font-medium">{alumno.nombre} {alumno.apellido}</p>
                <p className="text-xs text-gray-400 mt-0.5">{alumno.grado} · {alumno.situacion}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50">
        {!alumnoSeleccionado ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-3">📁</p>
              <p className="text-lg font-medium">Selecciona un alumno</p>
              <p className="text-sm mt-1">para ver su expediente</p>
            </div>
          </div>
        ) : loadingPerfil ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Cargando expediente...</p>
          </div>
        ) : perfil ? (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {perfil.alumno.nombre} {perfil.alumno.apellido}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {perfil.alumno.grado} · {perfil.alumno.edad} años
                </p>
              </div>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${SITUACION_COLORES[perfil.alumno.situacion]}`}>
                  {perfil.alumno.situacion}
                </span>
                <button
                  onClick={() => window.print()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm transition"
                >
                  🖨️ Imprimir
                </button>
                <button
                  onClick={() => navigate(`/alumnos/${alumnoSeleccionado.id}`)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition"
                >
                  ✏️ Editar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">Datos del alumno</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Tutor</span><span className="font-medium">{perfil.alumno.nombre_tutor}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Teléfono</span><span className="font-medium">{perfil.alumno.telefono_tutor}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Tel. emergencia</span><span className="font-medium">{perfil.alumno.telefono_emergencia || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Diagnóstico</span><span className="font-medium text-right max-w-40">{perfil.alumno.diagnostico || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Horario</span><span className="font-medium text-right max-w-40">{perfil.alumno.horario || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Fecha ingreso</span><span className="font-medium">{perfil.alumno.fecha_ingreso || '—'}</span></div>
                  {perfil.alumno.situacion === 'baja' && (
                    <>
                      <div className="flex justify-between"><span className="text-gray-500">Fecha baja</span><span className="font-medium text-red-600">{perfil.alumno.fecha_baja || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Motivo baja</span><span className="font-medium text-red-600 text-right max-w-40">{perfil.alumno.motivo_baja || '—'}</span></div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">Plan académico</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Plan de pago</span><span className="font-medium text-purple-700">${perfil.alumno.plan_pago}/mes</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Materias</span><span className="font-medium">{perfil.alumno.materias || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Día de pago</span><span className="font-medium">Día {perfil.alumno.dia_pago || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Prog. Lectura</span><span className="font-mono text-sm font-medium text-blue-600">{perfil.alumno.programa_lectura || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Prog. Matemáticas</span><span className="font-mono text-sm font-medium text-green-600">{perfil.alumno.programa_matematicas || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Descuento hermano</span><span className="font-medium">{perfil.alumno.tiene_descuento_hermano ? `Sí (Hermano ${perfil.alumno.numero_hermano})` : 'No'}</span></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5 mb-6">
              <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">Resumen de asistencias</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{perfil.asistencias_resumen.presentes}</p>
                  <p className="text-xs text-gray-500">Presentes</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{perfil.asistencias_resumen.ausentes}</p>
                  <p className="text-xs text-gray-500">Ausentes</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-700">{perfil.asistencias_resumen.porcentaje}%</p>
                  <p className="text-xs text-gray-500">Asistencia</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Historial de pagos</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Mes</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Monto</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Fecha pago</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Penalización</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Comentarios</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {perfil.pagos.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Sin pagos registrados</td></tr>
                  ) : perfil.pagos.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{MESES[p.mes - 1]} {p.anio}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">${p.monto.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600">{p.fecha_pago || '—'}</td>
                      <td className="px-4 py-3">{p.con_penalizacion ? <span className="text-orange-600 font-medium">+$50</span> : <span className="text-gray-400">No</span>}</td>
                      <td className="px-4 py-3 text-gray-500">{p.comentarios || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {perfil.historial.length > 0 && (
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">Historial de cambios</h3>
                <div className="space-y-2">
                  {perfil.historial.map((h, i) => (
                    <div key={i} className="flex gap-4 text-sm border-b pb-2">
                      <div className="flex-1">
                        <span className="font-medium text-gray-700 capitalize">{h.campo}</span>
                        <span className="text-gray-400 mx-2">→</span>
                        <span className="text-red-400 line-through">{h.anterior}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="text-green-600">{h.nuevo}</span>
                      </div>
                      <span className="text-gray-400 text-xs flex-shrink-0">{h.fecha?.split('T')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
