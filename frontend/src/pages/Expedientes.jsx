import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { alumnosService, usuariosService, reportesService, maestrasService, sucursalesService } from '../services/api'

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
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroMaestra, setFiltroMaestra] = useState('')
  const [maestras, setMaestras] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [filtroSucursal, setFiltroSucursal] = useState('')
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loadingPerfil, setLoadingPerfil] = useState(false)
  const [reportes, setReportes] = useState([])
  const [subiendoReporte, setSubiendoReporte] = useState(false)
  const [fechaEntregaReporte, setFechaEntregaReporte] = useState(new Date().toISOString().split('T')[0])
  const [mesReporte, setMesReporte] = useState(new Date().getMonth() + 1)
  const [anioReporte, setAnioReporte] = useState(new Date().getFullYear())

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    cargarAlumnos()
    cargarMaestras()
    if (usuario.rol === 'directora' || usuario.rol === 'contadora') {
      sucursalesService.getAll().then(r => setSucursales(r.data)).catch(() => {})
    }
  }, [filtroSucursal])

  const cargarMaestras = async () => {
    try {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
      let res
      if (usuario.rol === 'directora' || usuario.rol === 'contadora') {
        res = await usuariosService.getAll()
        setMaestras(res.data.filter(u => u.rol === 'maestra' || u.rol === 'encargada'))
      } else {
        res = await maestrasService.getPorSucursal(usuario.sucursal_id)
        setMaestras(res.data)
      }
    } catch (err) {
      console.error('Error cargando maestras')
    }
  }

  const cargarAlumnos = async () => {
    try {
      const params = {}
      if (filtroSucursal) params.sucursal_id = filtroSucursal
      const res = await alumnosService.getAll({ situacion: 'activo', ...params })
      setAlumnos(res.data)
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
      cargarReportes(alumno.id)
    } catch (err) {
      console.error('Error cargando perfil')
    } finally {
      setLoadingPerfil(false)
    }
  }

  const cargarReportes = async (alumno_id) => {
    try {
      const res = await reportesService.getDeAlumno(alumno_id)
      setReportes(res.data)
    } catch (err) {
      console.error('Error cargando reportes')
    }
  }

  const subirReporte = async (e) => {
    const archivo = e.target.files[0]
    if (!archivo) return
    setSubiendoReporte(true)
    try {
      const formData = new FormData()
      formData.append('alumno_id', alumnoSeleccionado.id)
      formData.append('mes', mesReporte)
      formData.append('anio', anioReporte)
      formData.append('fecha_entrega', fechaEntregaReporte)
      formData.append('archivo', archivo)
      await reportesService.subir(formData)
      cargarReportes(alumnoSeleccionado.id)
      alert('Reporte subido correctamente')
    } catch (err) {
      alert('Error subiendo reporte')
    } finally {
      setSubiendoReporte(false)
      e.target.value = ''
    }
  }

  const descargarReporte = async (url, nombre) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = nombre + '.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Error descargando')
    }
  }

  const eliminarReporte = async (id) => {
    if (!window.confirm('¿Eliminar este reporte?')) return
    try {
      await reportesService.eliminar(id)
      cargarReportes(alumnoSeleccionado.id)
    } catch (err) {
      alert('Error eliminando reporte')
    }
  }

  const generarPDF = () => {
    const a = perfil.alumno
    const pagosHTML = perfil.pagos.map(p => `
      <tr>
        <td>${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][p.mes-1]} ${p.anio}</td>
        <td>$${p.monto.toLocaleString()}</td>
        <td>${p.fecha_pago || '—'}</td>
        <td>${p.con_penalizacion ? '+$50' : 'No'}</td>
      </tr>
    `).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Expediente - ${a.nombre} ${a.apellido}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #333; font-size: 13px; }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #7C3AED; padding-bottom: 16px; }
          .header h1 { color: #7C3AED; font-size: 22px; margin: 0 0 4px; }
          .header p { color: #666; margin: 0; }
          .section { margin-bottom: 20px; }
          .section h2 { font-size: 14px; color: #7C3AED; border-bottom: 1px solid #E5E7EB; padding-bottom: 6px; margin-bottom: 12px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .field { margin-bottom: 6px; }
          .field label { font-weight: bold; color: #555; font-size: 11px; text-transform: uppercase; }
          .field p { margin: 2px 0 0; }
          .highlight { background: #F5F3FF; padding: 8px 12px; border-radius: 6px; margin-top: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #7C3AED; color: white; padding: 8px; text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #E5E7EB; }
          tr:nth-child(even) { background: #F9FAFB; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #E5E7EB; padding-top: 12px; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>LUDENS — Expediente del Alumno</h1>
          <p>${a.nombre} ${a.apellido} · ${a.grado} · ${a.edad} años</p>
        </div>

        <div class="section">
          <h2>Datos Personales</h2>
          <div class="grid">
            <div class="field"><label>Nombre completo</label><p>${a.nombre} ${a.apellido}</p></div>
            <div class="field"><label>Fecha de nacimiento</label><p>${a.fecha_nacimiento || '—'}</p></div>
            <div class="field"><label>Grado</label><p>${a.grado || '—'}</p></div>
            <div class="field"><label>Diagnóstico</label><p>${a.diagnostico || '—'}</p></div>
            ${a.condicion_medica ? `<div class="field" style="grid-column:span 2"><label>⚠️ Condición médica</label><p style="color:#DC2626">${a.condicion_medica}</p></div>` : ''}
          </div>
        </div>

        <div class="section">
          <h2>Tutor</h2>
          <div class="grid">
            <div class="field"><label>Nombre del tutor</label><p>${a.nombre_tutor}</p></div>
            <div class="field"><label>Teléfono</label><p>${a.telefono_tutor}</p></div>
            <div class="field"><label>Tel. emergencia</label><p>${a.telefono_emergencia || '—'}</p></div>
            ${a.maestra_lectura_nombre || a.maestra_nombre ? `<div class="field"><label>Maestra 1</label><p>${a.maestra_lectura_nombre || a.maestra_nombre || '—'}</p></div>` : ''}
            ${a.maestra_matematicas_nombre ? `<div class="field"><label>Maestra 2</label><p>${a.maestra_matematicas_nombre}</p></div>` : ''}
            <div class="field"><label>Permiso fotos</label><p>${a.permiso_fotos ? '✓ Autorizado' : '✗ No autorizado'}</p></div>
          </div>
        </div>

        <div class="section">
          <h2>Plan Académico</h2>
          <div class="grid">
            <div class="field"><label>Plan de pago</label><p>$${a.plan_pago}/mes</p></div>
            <div class="field"><label>Materias</label><p>${a.materias || '—'}</p></div>
            <div class="field"><label>Horario</label><p>${a.horario || '—'}</p></div>
            <div class="field"><label>Día de pago</label><p>Día ${a.dia_pago || '—'}</p></div>
            <div class="field"><label>Programa Lectura</label><p>${a.programa_lectura || '—'}</p></div>
            <div class="field"><label>Programa Matemáticas</label><p>${a.programa_matematicas || '—'}</p></div>
            <div class="field"><label>Fecha ingreso</label><p>${a.fecha_ingreso || '—'}</p></div>
          </div>
          ${a.objetivos ? `<div class="field" style="grid-column:span 2"><label>Objetivos de trabajo</label><p>${a.objetivos}</p></div>` : ''}
        </div>

        <div class="footer">
          <p>LUDENS Clases de Regularización · Generado el ${new Date().toLocaleDateString('es-MX', {year:'numeric',month:'long',day:'numeric'})}</p>
        </div>
      </body>
      </html>
    `

    const ventana = window.open('', '_blank')
    ventana.document.write(html)
    ventana.document.close()
    ventana.print()
    ventana.onafterprint = () => ventana.close()
  }

  const filtrados = alumnos.filter(a =>
    `${a.nombre} ${a.apellido}`.toLowerCase().includes(busqueda.toLowerCase()) &&
    (filtroMaestra === '' || a.maestra_id === filtroMaestra || a.maestra_lectura_id === filtroMaestra || a.maestra_matematicas_id === filtroMaestra)
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
          {(usuario.rol === 'directora' || usuario.rol === 'contadora') && (
            <select
              value={filtroSucursal}
              onChange={e => setFiltroSucursal(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 mb-3"
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          )}
          <select
            value={filtroMaestra}
            onChange={e => setFiltroMaestra(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 mb-3"
          >
            <option value="">Todas las maestras</option>
            {maestras.map(m => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
          <div className="flex gap-1">
            <div className="flex-1 py-1.5 rounded-lg text-xs font-medium text-center bg-purple-600 text-white">
              Activos ({alumnos.length})
            </div>
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
                  onClick={generarPDF}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition"
                >
                  📄 Generar expediente
                </button>
                <button
                  onClick={() => navigate(`/alumnos/${alumnoSeleccionado.id}`)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition"
                >
                  ✏️ Editar
                </button>
              </div>
            </div>

              <div className="bg-white rounded-xl shadow p-5 mb-6">
                <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">Expediente</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-gray-500">Nombre</p><p className="font-medium">{perfil.alumno.nombre} {perfil.alumno.apellido}</p></div>
                  <div><p className="text-gray-500">Edad</p><p className="font-medium">{perfil.alumno.edad} años</p></div>
                  <div><p className="text-gray-500">Grado escolar</p><p className="font-medium">{perfil.alumno.grado || '—'}</p></div>
                  <div><p className="text-gray-500">Materias</p><p className="font-medium">{perfil.alumno.materias || '—'}</p></div>
                  <div><p className="text-gray-500">Horario</p><p className="font-medium">{perfil.alumno.horario || '—'}</p></div>
                  <div>
                    <p className="text-gray-500">Maestras</p>
                    {perfil.alumno.maestra_lectura_nombre && <p className="font-medium">L: {perfil.alumno.maestra_lectura_nombre}</p>}
                    {perfil.alumno.maestra_matematicas_nombre && <p className="font-medium">M: {perfil.alumno.maestra_matematicas_nombre}</p>}
                    {!perfil.alumno.maestra_lectura_nombre && !perfil.alumno.maestra_matematicas_nombre && <p className="font-medium">—</p>}
                  </div>
                  <div><p className="text-gray-500">Nombre del tutor</p><p className="font-medium">{perfil.alumno.nombre_tutor}</p></div>
                  <div><p className="text-gray-500">Tel. emergencia</p><p className="font-medium">{perfil.alumno.telefono_emergencia || '—'}</p></div>
                  <div><p className="text-gray-500">Permiso fotos</p><p className="font-medium">{perfil.alumno.permiso_fotos ? '✓ Autorizado' : '✗ No autorizado'}</p></div>
                  <div><p className="text-gray-500">Situación</p><p className="font-medium capitalize">{perfil.alumno.situacion}</p></div>
                </div>
                {perfil.alumno.diagnostico && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Dificultades de aprendizaje / Diagnóstico</p>
                    <p className="font-medium text-sm">{perfil.alumno.diagnostico}</p>
                  </div>
                )}
                {perfil.alumno.objetivos && (
                  <div className="mt-3">
                    <p className="text-gray-500 text-sm mb-1">Objetivos</p>
                    <p className="font-medium text-sm bg-purple-50 text-purple-700 px-3 py-2 rounded-lg">{perfil.alumno.objetivos}</p>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Programa de Lectura</p>
                    <p className="font-mono font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg text-sm">{perfil.alumno.programa_lectura || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Programa de Matemáticas</p>
                    <p className="font-mono font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg text-sm">{perfil.alumno.programa_matematicas || '—'}</p>
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

            <div className="bg-white rounded-xl shadow p-5 mb-6">
              <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">📄 Reportes mensuales</h3>

              <div className="flex gap-3 items-center mb-4 flex-wrap">
                <select value={mesReporte} onChange={e => setMesReporte(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                  {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                    <option key={i+1} value={i+1}>{m}</option>
                  ))}
                </select>
                <select value={anioReporte} onChange={e => setAnioReporte(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                  {[2024, 2025, 2026, 2027].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs text-gray-500 flex-shrink-0">Fecha de entrega:</label>
                    <input
                      type="date"
                      value={fechaEntregaReporte}
                      onChange={e => setFechaEntregaReporte(e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <label className={`cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition ${subiendoReporte ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {subiendoReporte ? 'Subiendo...' : '⬆️ Subir PDF'}
                    <input type="file" accept=".pdf" onChange={subirReporte} disabled={subiendoReporte} className="hidden" />
                  </label>
                </div>
              </div>

              {reportes.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">Sin reportes subidos</p>
              ) : (
                <div className="space-y-2">
                  {reportes.map((r, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][r.mes-1]} {r.anio}
                          </p>
                          <p className="text-xs text-gray-400">Entregado: {r.fecha_entrega || 'Sin fecha'}</p>
                          <p className="text-xs text-gray-400">Subido el {r.created_at?.split('T')[0]}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => descargarReporte(r.url, `reporte_${r.anio}_${String(r.mes).padStart(2,'0')}_${perfil.alumno.nombre}${perfil.alumno.apellido}`)}
                          className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                        >
                          ⬇️ Descargar PDF
                        </button>
                        <button onClick={() => eliminarReporte(r.id)}
                          className="text-xs bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded-lg transition">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
