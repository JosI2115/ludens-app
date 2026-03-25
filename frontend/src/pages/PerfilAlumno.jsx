import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { alumnosService } from '../services/api'

const SITUACION_COLORES = {
  prospecto:   'bg-gray-100 text-gray-700',
  inscripcion: 'bg-blue-100 text-blue-700',
  activo:      'bg-green-100 text-green-700',
  pendiente:   'bg-yellow-100 text-yellow-700',
  en_riesgo:   'bg-orange-100 text-orange-700',
  bloqueado:   'bg-red-100 text-red-700',
  baja:        'bg-red-200 text-red-800',
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function PerfilAlumno() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('info')

  useEffect(() => {
    cargarPerfil()
  }, [id])

  const cargarPerfil = async () => {
    try {
      const res = await alumnosService.getPerfil(id)
      setPerfil(res.data)
    } catch (err) {
      console.error('Error cargando perfil')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6 text-gray-400">Cargando perfil...</div>
  if (!perfil) return <div className="p-6 text-gray-400">Alumno no encontrado</div>

  const { alumno, pagos, asistencias_resumen, asistencias, historial } = perfil

  return (
    <div className="p-6">
      <button onClick={() => navigate('/alumnos')}
        className="text-purple-600 hover:text-purple-800 text-sm font-medium mb-4 flex items-center gap-1">
        ← Volver a alumnos
      </button>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {alumno.nombre} {alumno.apellido}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {alumno.grado} · {alumno.edad} años
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${SITUACION_COLORES[alumno.situacion]}`}>
            {alumno.situacion}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Plan de pago</p>
            <p className="font-bold text-purple-700">${alumno.plan_pago}/mes</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Materias</p>
            <p className="font-medium text-blue-700 text-sm">{alumno.materias || '—'}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Asistencia del mes</p>
            <p className="font-bold text-green-700">{asistencias_resumen.porcentaje}%</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Día de pago</p>
            <p className="font-bold text-yellow-700">Día {alumno.dia_pago || '—'}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {['info', 'pagos', 'asistencias', 'historial'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
              tab === t ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}>
            {t === 'info' ? 'Información' : t === 'pagos' ? 'Pagos' : t === 'asistencias' ? 'Asistencias' : 'Historial'}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-gray-800 mb-4">Datos del alumno</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-500">Tutor</p><p className="font-medium">{alumno.nombre_tutor}</p></div>
            <div><p className="text-gray-500">Teléfono tutor</p><p className="font-medium">{alumno.telefono_tutor}</p></div>
            <div><p className="text-gray-500">Tel. emergencia</p><p className="font-medium">{alumno.telefono_emergencia || '—'}</p></div>
            <div><p className="text-gray-500">Diagnóstico</p><p className="font-medium">{alumno.diagnostico || '—'}</p></div>
            <div><p className="text-gray-500">Horario</p><p className="font-medium">{alumno.horario || '—'}</p></div>
            <div><p className="text-gray-500">Fecha diagnóstico</p><p className="font-medium">{alumno.fecha_diagnostico || '—'}</p></div>
            <div><p className="text-gray-500">Fecha ingreso</p><p className="font-medium">{alumno.fecha_ingreso || '—'}</p></div>
            <div><p className="text-gray-500">Descuento hermano</p><p className="font-medium">{alumno.tiene_descuento_hermano ? 'Sí' : 'No'}</p></div>
          </div>
        </div>
      )}

      {tab === 'pagos' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Mes</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Monto</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Fecha pago</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Penalización</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Comentarios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagos.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin pagos registrados</td></tr>
              ) : pagos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{MESES[p.mes - 1]} {p.anio}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">${p.monto.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{p.fecha_pago || '—'}</td>
                  <td className="px-4 py-3">
                    {p.con_penalizacion
                      ? <span className="text-orange-600 font-medium">+$50</span>
                      : <span className="text-gray-400">No</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.comentarios || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'asistencias' && (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{asistencias_resumen.presentes}</p>
              <p className="text-xs text-gray-500">Presentes</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{asistencias_resumen.ausentes}</p>
              <p className="text-xs text-gray-500">Ausentes</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-700">{asistencias_resumen.porcentaje}%</p>
              <p className="text-xs text-gray-500">Asistencia</p>
            </div>
          </div>
          <div className="space-y-2">
            {asistencias.length === 0 ? (
              <p className="text-center text-gray-400 py-4">Sin asistencias registradas</p>
            ) : asistencias.map((a, i) => (
              <div key={i} className={`flex justify-between items-center px-4 py-2 rounded-lg ${
                a.asistio ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <span className="text-sm text-gray-700">{a.fecha}</span>
                <span className={`text-sm font-medium ${a.asistio ? 'text-green-600' : 'text-red-600'}`}>
                  {a.asistio ? '✓ Asistió' : '✗ Faltó'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'historial' && (
        <div className="bg-white rounded-xl shadow p-6">
          {historial.length === 0 ? (
            <p className="text-center text-gray-400 py-4">Sin cambios registrados</p>
          ) : (
            <div className="space-y-3">
              {historial.map((h, i) => (
                <div key={i} className="flex gap-4 text-sm border-b pb-3">
                  <div className="flex-1">
                    <span className="font-medium text-gray-700 capitalize">{h.campo}</span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="text-red-500 line-through">{h.anterior}</span>
                    <span className="mx-2">→</span>
                    <span className="text-green-600">{h.nuevo}</span>
                  </div>
                  <span className="text-gray-400 text-xs">{h.fecha?.split('T')[0]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}