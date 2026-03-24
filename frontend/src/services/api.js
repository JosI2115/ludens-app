import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
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
    if (error.response?.status === 401) {
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
  crear: (data) => api.post('/alumnos/', data),
  actualizar: (id, data) => api.put(`/alumnos/${id}`, data),
  darBaja: (id, motivo) => api.delete(`/alumnos/${id}`, { params: { motivo } }),
}

export default api