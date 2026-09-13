import api from './api'

export const dashboardService = {
    buscarResumo: async () => {
        const response = await api.get('/dashboard/resumo')
        return response.data
    },
    buscarReceitaPorTipo: async (periodo = 'ESTE_MES') => {
        const response = await api.get('/dashboard/receita-por-tipo', {
            params: { periodo },
        })
        return response.data
    },
    buscarMensagens: async () => {
        const response = await api.get('/dashboard/mensagens')
        return response.data
    },
}
