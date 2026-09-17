import {
  CheckCircle2,
  Calendar,
  Camera,
  ClipboardList,
  CreditCard,
  Headphones,
  Heart,
  Image,
  Inbox,
  MessageCircle,
  Settings,
  Search,
  Send,
  SlidersHorizontal,
  Play,
  BarChart3,
  User,
  Wand2,
} from 'lucide-react'
import heroDashboard from '../assets/home-hero-dashboard.jfif'
import gallerySelection from '../assets/home-gallery-selection.png'
import financeDashboard from '../assets/home-finance-dashboard.png'
import essaysListPreview from '../assets/home-essays-list.png'
import finalCtaImage from '../assets/home-final-cta.jfif'
import homeLogo from '../assets/home-logo-wordmark.png'

const navItems = [
  { label: 'Funcionalidades', href: '#recursos' },
  { label: 'Fluxo', href: '#como-funciona' },
  { label: 'Vantagens', href: '#beneficios' },
  { label: 'Exemplos', href: '#visual' },
]

const challengeCards = [
  {
    icon: Heart,
    title: 'Muitos processos manuais',
    text: 'Planilhas, anotações e mensagens espalhadas tomam tempo e geram erros.',
  },
  {
    icon: Search,
    title: 'Desorganização de informações',
    text: 'Difícil encontrar contratos, fotos, pagamentos e dados de clientes rapidamente.',
  },
  {
    icon: Inbox,
    title: 'Entrega que leva tempo demais',
    text: 'Selecionar, editar e entregar fotos sem um fluxo claro atrapalha sua rotina.',
  },
  {
    icon: BarChart3,
    title: 'Falta de visão do negócio',
    text: 'Sem relatórios, fica complicado saber o que realmente importa.',
  },
]

const featureCards = [
  {
    icon: User,
    title: 'Clientes',
    text: 'Cadastre e organize seus clientes com histórico completo.',
  },
  {
    icon: Calendar,
    title: 'Ensaios',
    text: 'Agende, acompanhe e gerencie todos os seus ensaios.',
  },
  {
    icon: Image,
    title: 'Galerias',
    text: 'Crie galerias online seguras e personalizadas para seus clientes.',
  },
  {
    icon: Wand2,
    title: 'Seleção',
    text: 'Permita que seus clientes selecionem suas fotos favoritas.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    text: 'Acompanhe resultados com relatórios claros e visuais.',
  },
  {
    icon: CreditCard,
    title: 'Financeiro',
    text: 'Controle orçamentos, pagamentos e recebimentos com facilidade.',
  },
  {
    icon: ClipboardList,
    title: 'Contratos',
    text: 'Crie, envie e armazene contratos de forma profissional.',
  },
  {
    icon: Settings,
    title: 'Configurações',
    text: 'Personalize sua conta, modelos e preferências do sistema.',
  },
]

const flowSteps = [
  {
    icon: User,
    title: '1. Cadastro de contatos',
    text: 'Centralize dados, contatos, histórico e informações importantes de cada atendimento.',
  },
  {
    icon: Calendar,
    title: '2. Ensaio organizado',
    text: 'Crie o ensaio com data, local, tipo, pacote, valores e observações internas.',
  },
  {
    icon: Camera,
    title: '3. Fotos do ensaio',
    text: 'Organize as fotos vinculadas ao trabalho e mantenha tudo conectado ao atendimento.',
  },
  {
    icon: Image,
    title: '4. Galeria privada',
    text: 'Disponibilize uma galeria segura com acesso por senha.',
  },
  {
    icon: Heart,
    title: '5. Seleção de fotos',
    text: 'As pessoas convidadas marcam favoritas, sinalizam escolhas e facilitam o início da edição.',
  },
  {
    icon: SlidersHorizontal,
    title: '6. Controle por status',
    text: 'Acompanhe cada ensaio por etapa: agendado, realizado, seleção, edição e finalizado.',
  },
  {
    icon: BarChart3,
    title: '7. Relatórios',
    text: 'Visualize valores previstos, recebimentos, fotos excedentes e indicadores do negócio.',
  },
  {
    icon: Settings,
    title: '8. E muito mais',
    text: 'Contratos, configurações, marca d\'água, notificações e ferramentas para a rotina.',
  },
]

const galleryBenefits = [
  {
    icon: Heart,
    text: 'Seleção de fotos favorita',
  },
  {
    icon: MessageCircle,
    text: 'Comentários por imagem',
  },
  {
    icon: Image,
    text: 'Aviso por fotos extras além do pacote',
  },
  {
    icon: CreditCard,
    text: 'E muito mais',
  },
]

const systemBenefits = [
  {
    title: 'Tudo centralizado',
    text: 'Clientes, ensaios, fotos, seleções, valores e relatórios ficam no mesmo lugar.',
  },
  {
    title: 'Menos retrabalho',
    text: 'A seleção é registrada e você acompanha o andamento com mais clareza.',
  },
  {
    title: 'Mais visão do negócio',
    text: 'Status, pendências, valores previstos, recebimentos e excedentes ficam mais fáceis de acompanhar.',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbf7f2] text-[#22303a]">
      <header className="relative z-30 border-b border-[#e8ded4] bg-[#fffaf5]/95 backdrop-blur">
        <div className="mx-auto flex h-[74px] w-full max-w-[1320px] items-center justify-between px-5 sm:px-8 xl:px-0">
          <a href="/" className="flex items-center" aria-label="Fotolhar">
            <img
              src={homeLogo}
              alt="Fotolhar"
              className="h-[90px] w-auto object-contain sm:h-[90px]"
            />
          </a>

          <nav className="hidden items-center gap-[46px] text-[13px] font-medium text-[#4d5a62] lg:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-[#C84F32]">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden h-[38px] min-w-[75px] items-center justify-center rounded-[6px] border border-[#c77f66] px-5 text-[13px] font-medium text-[#73341f] transition hover:bg-[#fff1eb] sm:inline-flex"
            >
              Entrar
            </a>
            <a
              href="/login"
              className="inline-flex h-[38px] min-w-[137px] items-center justify-center rounded-[6px] bg-[#C84F32] px-5 text-[13px] font-semibold text-white shadow-[0_10px_22px_rgba(200,79,50,0.18)] transition hover:bg-[#AE3F28]"
            >
              Começar agora
            </a>
          </div>
        </div>
      </header>

      <section className="relative isolate min-h-[668px] overflow-hidden border-b border-[#efe5dc] bg-[#fbf7f2]">
        <div
          className="absolute inset-0 -z-10 opacity-90"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(circle at 18% 18%, rgba(236, 210, 190, 0.48), transparent 28%), linear-gradient(90deg, #fbf7f2 0%, #fffaf6 43%, #f5ece4 100%)',
          }}
        />

        <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 items-center px-5 py-12 sm:px-8 md:min-h-[668px] lg:grid-cols-[455px_minmax(0,1fr)] lg:py-0 xl:px-0">
          <div className="relative z-20 max-w-[540px] pt-3 lg:max-w-none">
            <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-[#C84F32]">
              Para profissionais que querem mais tempo para criar
            </p>
            <h1 className="mt-7 font-serif text-[44px] font-normal leading-[0.98] tracking-normal text-[#27323a] sm:text-[54px] lg:text-[58px]">
  <span className="block lg:whitespace-nowrap">Organize seu negócio.</span>
  <span className="block lg:whitespace-nowrap">Encante seus clientes.</span>
</h1>
            <p className="mt-6 text-[24px] leading-snug text-[#344652]">
              Seu olhar cria. O Fotolhar organiza.
            </p>
            <p className="mt-7 max-w-[430px] text-[16px] leading-8 text-[#72808a]">
              O Fotolhar é o sistema completo para profissionais que desejam organizar
              clientes, ensaios, galerias, entregas e finanças em um só lugar.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                href="/login"
                className="inline-flex h-[57px] min-w-[190px] items-center justify-center rounded-[6px] bg-[#C84F32] px-7 text-[13px] font-bold text-white shadow-[0_15px_30px_rgba(200,79,50,0.2)] transition hover:-translate-y-px hover:bg-[#AE3F28]"
              >
                Começar agora
              </a>
              <a
                href="#como-funciona"
                className="inline-flex h-[57px] min-w-[190px] items-center justify-center gap-3 rounded-[6px] border border-[#c77f66] bg-white/50 px-7 text-[13px] font-bold text-[#73341f] transition hover:bg-white"
              >
                <Play size={17} strokeWidth={1.8} />
                Ver como funciona
              </a>
            </div>
          </div>

          <div className="relative z-10 mt-10 min-h-[390px] lg:mt-0 lg:min-h-[668px]">
            <img
              src={heroDashboard}
              alt="Painel do Fotolhar com resumo de ensaios, faturamento e próximas sessões."
              className="absolute left-1/2 top-1/2 w-[760px] max-w-none -translate-x-[36%] -translate-y-[48%] rounded-[6px] object-contain opacity-[0.98] drop-shadow-[0_24px_42px_rgba(94,66,45,0.16)] sm:w-[830px] lg:w-[875px] xl:w-[930px]"
              style={{
                WebkitMaskImage:
                  'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.35) 5%, rgba(0,0,0,0.9) 13%, #000 22%)',
                maskImage:
                  'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.35) 5%, rgba(0,0,0,0.9) 13%, #000 22%)',
              }}
            />
          </div>
        </div>
      </section>

      <section id="desafios" className="bg-[#fffdfb]">
        <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 gap-10 px-5 py-[78px] sm:px-8 lg:grid-cols-[330px_minmax(0,1fr)] lg:gap-[92px] xl:px-0">
          <div className="pt-7">
            <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-[#C84F32]">
              Os desafios do profissional criativo
            </p>
            <h2 className="mt-7 font-serif text-[43px] font-normal leading-[1.07] tracking-normal text-[#27323a]">
              Você cria memórias.
              <br />
              Mas gerenciar tudo
              <br />
              pode ser difícil.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {challengeCards.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="min-h-[254px] rounded-[8px] border border-[#eadfd7] bg-white px-[28px] py-[30px] shadow-[0_12px_32px_rgba(84,62,45,0.035)] xl:aspect-[1/1.08]"
              >
                <div className="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-[#f8e8df] text-[#d36f4e]">
                  <Icon size={25} strokeWidth={1.75} />
                </div>
                <h3 className="mt-[24px] max-w-[175px] text-[16px] font-bold leading-[1.35] text-[#25313a]">
                  {title}
                </h3>
                <p className="mt-[17px] text-[13px] leading-[1.65] text-[#7a858d]">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="recursos" className="bg-[#fffaf6]">
        <div className="mx-auto w-full max-w-[1320px] px-5 py-[76px] sm:px-8 xl:px-0">
          <div className="text-center">
            <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-[#C84F32]">
              Recursos completos
            </p>
            <h2 className="mt-3 font-serif text-[42px] font-normal leading-tight tracking-normal text-[#27323a]">
              Tudo o que você precisa, em um só lugar.
            </h2>
          </div>

          <div className="mt-[43px] grid grid-cols-1 gap-x-[46px] gap-y-[34px] sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="min-h-[206px] rounded-[8px] border border-[#eadfd7] bg-white px-[34px] py-[31px] shadow-[0_12px_32px_rgba(84,62,45,0.03)]"
              >
                <Icon size={25} strokeWidth={1.65} className="text-[#4e5b63]" />
                <h3 className="mt-[23px] text-[18px] font-bold leading-tight text-[#25313a]">
                  {title}
                </h3>
                <p className="mt-[14px] max-w-[210px] text-[14px] leading-[1.7] text-[#7a858d]">
                  {text}
                </p>
                <a
                  href="#recursos"
                  className="mt-[21px] inline-flex items-center gap-2 text-[13px] font-bold text-[#C84F32] transition hover:text-[#AE3F28]"
                >
                  Saiba mais
                  <span aria-hidden="true">→</span>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-[#fffdfb]">
        <div className="mx-auto w-full max-w-[1320px] px-5 py-[72px] sm:px-8 xl:px-0">
          <div className="text-center">
            <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-[#C84F32]">
              Como funciona
            </p>
            <h2 className="mt-3 font-serif text-[42px] font-normal leading-tight tracking-normal text-[#27323a]">
              Um fluxo completo para cada ensaio fotográfico.
            </h2>
          </div>

          <div className="relative mt-[55px] grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-12">
            {flowSteps.map(({ icon: Icon, title, text }) => (
              <article key={title} className="relative z-10 flex flex-col items-center text-center">
                <div className="flex h-[82px] w-[82px] items-center justify-center rounded-full bg-[#f8e8df] text-[#d36f4e]">
                  <Icon size={32} strokeWidth={1.75} />
                </div>
                <h3 className="mt-[25px] text-[16px] font-bold leading-tight text-[#25313a]">
                  {title}
                </h3>
                <p className="mt-[13px] max-w-[190px] text-[14px] leading-[1.65] text-[#7a858d]">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="gestao-ensaios" className="bg-[#fbf7f2]">
        <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 items-center gap-12 px-5 py-[82px] sm:px-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-[72px] xl:px-0">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-[#C84F32]">
              Gestão de ensaios
            </p>
            <h2 className="mt-5 font-serif text-[42px] font-normal leading-[1.08] tracking-normal text-[#27323a] sm:text-[52px]">
              Organize e acompanhe
              <br />
              cada ensaio com facilidade.
            </h2>
            <p className="mt-6 max-w-[335px] text-[15px] leading-[1.8] text-[#72808a]">
              Visualize sessões, status, datas e progresso em um só lugar para
              manter tudo sob controle.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {[
                [Calendar, 'Filtros por status e data'],
                [BarChart3, 'Acompanhamento do progresso'],
                [Search, 'Visualização clara dos ensaios'],
                [SlidersHorizontal, 'Ações rápidas e organização'],
              ].map(([Icon, text]) => (
                <span key={text} className="inline-flex items-center gap-3 text-[13px] font-medium leading-relaxed text-[#6f7b84]">
                  <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] bg-[#f8e8df] text-[#d36f4e]">
                    <Icon size={16} strokeWidth={1.8} />
                  </span>
                  {text}
                </span>
              ))}
            </div>

            <a
              href="/login"
              className="mt-10 inline-flex h-[48px] items-center justify-center gap-3 rounded-[6px] border border-[#c77f66] bg-white/55 px-7 text-[13px] font-bold text-[#73341f] transition hover:-translate-y-px hover:bg-white"
            >
              Ver exemplo
              <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[12px] border border-[#eadfd7] bg-white/88 p-3 shadow-[0_24px_65px_rgba(84,62,45,0.12)]">
              <img
                src={essaysListPreview}
                alt="Tela de ensaios do Fotolhar com filtros, status, progresso e lista de trabalhos."
                className="w-full rounded-[8px] object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="visual" className="bg-[#fffaf6]">
        <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 items-center gap-10 px-5 py-[78px] sm:px-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-[74px] xl:px-0">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-[#C84F32]">
              Galerias que encantam
            </p>
            <h2 className="mt-5 font-serif text-[40px] font-normal leading-[1.08] tracking-normal text-[#27323a]">
              Experiência incrível
              <br />
              para seu estúdio e cada atendimento.
            </h2>
            <p className="mt-6 max-w-[315px] text-[14px] leading-[1.8] text-[#72808a]">
              Galerias online elegantes, seguras e pensadas para facilitar escolhas,
              comentários e cobranças sem bagunçar sua rotina.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-x-7 gap-y-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {galleryBenefits.map(({ icon: Icon, text }) => (
                <span key={text} className="inline-flex items-center gap-3 text-[13px] font-medium text-[#7a858d]">
                  <span className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] bg-[#f8e8df] text-[#d36f4e]">
                    <Icon size={16} strokeWidth={1.8} />
                  </span>
                  {text}
                </span>
              ))}
            </div>

            <a
              href="#visual"
              className="mt-10 inline-flex h-[46px] items-center justify-center rounded-[6px] border border-[#c77f66] bg-white/40 px-7 text-[13px] font-bold text-[#73341f] transition hover:bg-white"
            >
              Ver exemplo de galeria
            </a>
          </div>

          <div className="relative">
            <img
              src={gallerySelection}
              alt="Galeria do Fotolhar com seleção de fotos, comentários recebidos, fotos extras e progresso da seleção."
              className="w-full rounded-[8px] border border-[#eadfd7] bg-white object-contain shadow-[0_22px_55px_rgba(84,62,45,0.12)]"
            />
          </div>
        </div>
      </section>

      <section id="financeiro" className="bg-[#fffdfb]">
        <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 items-center gap-10 px-5 py-[78px] sm:px-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-[74px] xl:px-0">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-[#C84F32]">
              Financeiro sob controle
            </p>
            <h2 className="mt-5 font-serif text-[40px] font-normal leading-[1.08] tracking-normal text-[#27323a]">
              Acompanhe resultados
              <br />
              e faça seu negócio crescer.
            </h2>
            <p className="mt-6 max-w-[310px] text-[14px] leading-[1.8] text-[#72808a]">
              Relatórios completos para você tomar decisões com base em dados reais.
            </p>

            <a
              href="#financeiro"
              className="mt-9 inline-flex h-[46px] items-center justify-center rounded-[6px] border border-[#c77f66] bg-white/40 px-7 text-[13px] font-bold text-[#73341f] transition hover:bg-white"
            >
              Ver todos os relatórios
            </a>
          </div>

          <div className="relative">
            <img
              src={financeDashboard}
              alt="Relatórios financeiros do Fotolhar com faturamento, recebimentos, lucro líquido, gráfico mensal e ensaios mais realizados."
              className="w-full rounded-[8px] border border-[#eadfd7] bg-white object-contain shadow-[0_22px_55px_rgba(84,62,45,0.10)]"
            />
          </div>
        </div>
      </section>

      <section id="beneficios" className="bg-[#fbf7f2]">
        <div className="mx-auto w-full max-w-[1320px] px-5 py-[82px] sm:px-8 xl:px-0">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#C84F32]">
              Benefícios
            </p>
            <h2 className="mt-5 max-w-[900px] font-serif text-[48px] font-normal leading-[1.04] tracking-normal text-[#27323a] sm:text-[62px]">
              Menos tarefas soltas.
              <br />
              Mais controle sobre cada ensaio.
            </h2>
            <p className="mt-6 max-w-[820px] text-[18px] leading-[1.7] text-[#72808a]">
              O Fotolhar conecta as partes mais importantes da rotina para
              você trabalhar com menos improviso e mais clareza.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {systemBenefits.map(({ title, text }) => (
              <article
                key={title}
                className="rounded-[8px] border border-[#eadfd7] bg-white px-8 py-8 shadow-[0_14px_34px_rgba(84,62,45,0.04)]"
              >
                <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#f8e8df] text-[#d36f4e]">
                  <CheckCircle2 size={20} strokeWidth={2} />
                </div>
                <h3 className="mt-6 text-[22px] font-bold leading-tight text-[#25313a]">
                  {title}
                </h3>
                <p className="mt-4 text-[16px] leading-[1.7] text-[#72808a]">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-y border-[#eadfd7] bg-[#fffaf6]">
        <img
          src={finalCtaImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-y-0 left-0 -z-10 hidden h-full w-[57%] object-cover object-left-center lg:block"
        />
        <div
className="absolute inset-y-0 left-[24%] -z-10 hidden w-[50%] bg-[linear-gradient(90deg,rgba(255,250,246,0)_0%,rgba(255,250,246,0.45)_45%,rgba(255,250,246,0.85)_100%)] lg:block"          aria-hidden="true"
        />

        <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 px-5 py-[70px] sm:px-8 lg:grid-cols-[minmax(0,1fr)_520px] xl:px-0">
          <div className="hidden lg:block" aria-hidden="true" />

          <div className="relative z-10 lg:pl-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-[#C84F32]">
              Pronto para organizar seu negócio?
            </p>
            <h2 className="mt-5 font-serif text-[42px] font-normal leading-[1.08] tracking-normal text-[#27323a] sm:text-[50px]">
              Mais tempo para criar.
              <br />
              Tudo organizado com o Fotolhar.
            </h2>
            <p className="mt-6 max-w-[520px] text-[16px] leading-[1.75] text-[#72808a]">
              Junte-se a profissionais que já transformaram sua rotina e entregam
              experiências incríveis todos os dias.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a
                href="/login"
                className="inline-flex h-[52px] min-w-[245px] items-center justify-center rounded-[6px] bg-[#C84F32] px-7 text-[13px] font-bold text-white shadow-[0_15px_30px_rgba(200,79,50,0.18)] transition hover:-translate-y-px hover:bg-[#AE3F28]"
              >
                Começar agora gratuitamente
              </a>
              <a
                href="#como-funciona"
                className="inline-flex h-[52px] min-w-[180px] items-center justify-center gap-3 rounded-[6px] px-5 text-[13px] font-bold text-[#73341f] transition hover:bg-white/55"
              >
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#E9A08B] bg-white/70 text-[#C84F32]">
                  <Play size={14} strokeWidth={1.9} />
                </span>
                Ver como funciona
              </a>
            </div>

          </div>
        </div>
      </section>
    </main>
  )
}
