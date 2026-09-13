import ConfirmActionModal from '../../ui/ConfirmActionModal'

export default function ConfirmDeleteModal({ ensaio, open, loading, onClose, onConfirm }) {
  return (
    <ConfirmActionModal
      open={open}
      type="danger"
      title="Excluir ensaio?"
      description={
        <>
          Tem certeza que deseja excluir permanentemente o ensaio de{' '}
          <strong className="font-semibold text-[#1F1F21]">
            {ensaio?.clienteNome || 'cliente não informado'}
          </strong>
          ?
          <span className="mt-3 block rounded-[10px] border border-black-200 bg-black-50 px-3 py-2 text-[12px] font-medium leading-5 text-black-700">
            Só é permitido excluir ensaios com status Agendado ou Cancelado. Esta ação não poderá ser desfeita.
          </span>
        </>
      }
      confirmText="Excluir definitivamente"
      cancelText="Cancelar"
      loading={loading}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}
