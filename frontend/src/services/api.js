import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },
  me: () => api.get('/auth/me'),
}

export const alumnosService = {
  getAll: (params) => api.get('/alumnos/', { params }),
  getOne: (id) => api.get(`/alumnos/${id}`),
  getPerfil: (id) => api.get(`/alumnos/${id}/perfil`),
  crear: (data) => api.post('/alumnos/', data),
  actualizar: (id, data) => api.put(`/alumnos/${id}`, data),
  darBaja: (id, motivo) => api.delete(`/alumnos/${id}`, { params: { motivo } }),
}

export const pagosService = {
  getAll: (params) => api.get('/pagos/', { params }),
  resumen: (params) => api.get('/pagos/resumen', { params }),
  registrar: (data) => api.post('/pagos/registrar', data),
}

export const asistenciasService = {
  getDia: (fecha) => api.get('/asistencias/dia', { params: { fecha } }),
  registrar: (data) => api.post('/asistencias/registrar', data),
  resumen: (alumno_id, params) => api.get(`/asistencias/resumen/${alumno_id}`, { params }),
}


export const dashboardService = {
  stats: () => api.get('/auth/dashboard/stats'),
}

export const usuariosService = {
  getAll: () => api.get('/usuarios/'),
  actualizar: (id, data) => api.put(`/usuarios/${id}`, data),
}

export const sucursalesService = {
  getAll: () => api.get('/sucursales/'),
}

export const maestrasService = {
  getPorSucursal: (sucursal_id) => api.get(`/usuarios/sucursal/${sucursal_id}/maestras`),
}

export const bitacorasService = {
  getAlumno: (alumno_id) => api.get(`/bitacoras/alumno/${alumno_id}`),
  actualizarRegistro: (alumno_id, nomenclatura, data) =>
    api.put(`/bitacoras/registro/${alumno_id}/${encodeURIComponent(nomenclatura)}`, data),
  getProgramas: () => api.get('/bitacoras/programas'),
  getVistaMaestra: (params) => api.get('/bitacoras/vista-maestra', { params }),
}

export default api