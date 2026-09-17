import { useEffect, useMemo, useState } from 'react'
import RelatorioHeader from '../components/relatorios/RelatorioHeader'
import RelatorioFiltros from '../components/relatorios/RelatorioFiltros'
import RelatorioDestaques from '../components/relatorios/RelatorioDestaques'
import RelatorioKpiGrid from '../components/relatorios/RelatorioKpiGrid'
import RelatorioGrafico from '../components/relatorios/RelatorioGrafico'
import RelatorioResumoConsolidado from '../components/relatorios/RelatorioResumoConsolidado'
import RelatorioTabela from '../components/relatorios/RelatorioTabela'
import { relatoriosService } from '../services/relatoriosService'
import Header from '../components/layout/Header'
import {
  getAnosDisponiveis,
  getTipoPeriodoLabel,
} from '../utils/relatoriosUtils'

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function RelatoriosPage() {
  const anoAtual = new Date().getFullYear()

  const [tipo, setTipo] = useState('MENSAL')
  const [ano, setAno] = useState(anoAtual)
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    tipo: 'MENSAL',
    ano: anoAtual,
    dataInicio: '',
    dataFim: '',
  })
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [relatorio, setRelatorio] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [erro, setErro] = useState('')

  const anosDisponiveis = useMemo(() => getAnosDisponiveis(), [])

  const periodos = relatorio?.periodos || []

  async function carregarRelatorio(filtros = filtrosAplicados) {
    try {
      setLoading(true)
      setErro('')

      const resultado = await relatoriosService.buscarFaturamento({
        tipo: filtros.tipo,
        ano: filtros.ano,
        dataInicio: filtros.dataInicio || undefined,
        dataFim: filtros.dataFim || undefined,
      })

      setRelatorio(resultado?.data ?? resultado)
    } catch (error) {
      console.error('Erro ao carregar relatório:', error)

      if (error.response?.status === 401) {
        setErro('Sessão expirada. Faça login novamente.')
        return
      }

      if (error.response?.status === 403) {
        setErro('Acesso não autorizado para carregar este relatório.')
        return
      }

      if (error.response?.status === 400) {
        setErro(error.response?.data?.message || 'Não foi possível aplicar esse filtro.')
        return
      }

      setErro('Não foi possível carregar o relatório de valores.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarRelatorio()
  }, [])

  function aplicarFiltros(nextFiltros) {
    setFiltrosAplicados(nextFiltros)
    carregarRelatorio(nextFiltros)
  }

  function montarFiltros(agrupamento, anoSelecionado, datas = {}) {
    return {
      tipo: agrupamento || tipo,
      ano: Number(anoSelecionado || ano),
      dataInicio: datas.dataInicio ?? dataInicio,
      dataFim: datas.dataFim ?? dataFim,
    }
  }

  function handleTipoChange(nextTipo) {
    setTipo(nextTipo)
    aplicarFiltros(montarFiltros(nextTipo, ano))
  }

  function handleAnoChange(nextAno) {
    const anoNumerico = Number(nextAno)

    setAno(anoNumerico)
    setDataInicio('')
    setDataFim('')
    aplicarFiltros(montarFiltros(tipo, anoNumerico, { dataInicio: '', dataFim: '' }))
  }

  function handleFiltrarDatas() {
    if (!dataInicio || !dataFim) {
      setErro('Informe a data de início e fim para filtrar um período personalizado.')
      return
    }

    aplicarFiltros(montarFiltros(tipo, ano, { dataInicio, dataFim }))
  }

  function handleLimparDatas() {
    setDataInicio('')
    setDataFim('')
    aplicarFiltros(montarFiltros(tipo, ano, { dataInicio: '', dataFim: '' }))
  }

  const tituloFallback = `${getTipoPeriodoLabel(filtrosAplicados.tipo)} - ${filtrosAplicados.ano}`
  const tituloRelatorio = relatorio?.periodoDescricao || tituloFallback

  const handleExportPdf = async () => {
    if (!relatorio || exportLoading) return

    const slug = String(tituloRelatorio)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()

    try {
      setExportLoading(true)
      setErro('')

      const response = await relatoriosService.exportarFaturamentoPdf({
        tipo: filtrosAplicados.tipo,
        ano: filtrosAplicados.ano,
        dataInicio: filtrosAplicados.dataInicio || undefined,
        dataFim: filtrosAplicados.dataFim || undefined,
      })

      downloadBlob(
        response.data,
        `relatorio-fotolhar-${slug || ano}.pdf`
      )
    } catch (error) {
      console.error('Erro ao exportar relatorio em PDF:', error)
      setErro('Nao foi possivel exportar o relatorio em PDF.')
    } finally {
      setExportLoading(false)
    }
  }

return (
  <>
    <Header />

    <main className="relatorios-page min-h-screen overflow-x-hidden bg-[#FCFCFD] px-4 pb-10 pt-20 text-[#1F1F21] md:px-6 lg:px-8 xl:px-10">
      <div className="w-full max-w-[1480px]">
        <RelatorioHeader
          disabled={!relatorio || loading || exportLoading}
          exportLoading={exportLoading}
          onExportPdf={handleExportPdf}
        />

        <section className="mb-5 rounded-[18px] border border-[#E8E3DF] bg-white/92 p-4 shadow-[0_16px_46px_rgba(31,31,33,0.055)] backdrop-blur sm:p-5">
          <RelatorioFiltros
            tipo={tipo}
            ano={ano}
            dataInicio={dataInicio}
            dataFim={dataFim}
            anosDisponiveis={anosDisponiveis}
            loading={loading}
            onTipoChange={handleTipoChange}
            onAnoChange={handleAnoChange}
            onDataInicioChange={setDataInicio}
            onDataFimChange={setDataFim}
            onLimparDatas={handleLimparDatas}
            onFiltrar={handleFiltrarDatas}
          />
        </section>

        <section className="space-y-5">
            {erro && (
              <div className="rounded-[16px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                {erro}
              </div>
            )}

            <RelatorioKpiGrid relatorio={relatorio} />

            <RelatorioDestaques
              destaques={relatorio?.destaques}
              ensaiosMaisRealizados={relatorio?.ensaiosMaisRealizados}
              periodos={periodos}
            />

            <RelatorioGrafico periodos={periodos} loading={loading} />

            <RelatorioResumoConsolidado
              relatorio={relatorio}
              tituloFallback={tituloFallback}
            />

            <RelatorioTabela periodos={periodos} />
        </section>
      </div>
    </main>
  </>
)
}
