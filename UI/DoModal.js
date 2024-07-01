import Modal from '@mui/joy/Modal';
import Sheet from '@mui/joy/Sheet';


function DoModal({setNoTokensOpen, noTokensOpen, dotype}) {
  return (
    <Modal
        aria-labelledby="modal-title"
        aria-describedby="modal-desc"
        open={noTokensOpen}
        onClose={() => setNoTokensOpen(false)}
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
  >
    <Sheet
      variant="outlined"
      sx={{
        maxWidth: 500,
        borderRadius: 'md',
        p: 3,
        boxShadow: 'lg',
      }}
    >
        {dotype == "walletmissing" ?
        <>
        <div><b>Please link wallet</b></div>
        </>
      : dotype == "notokens" ?
      <>
        <div>Not enough tokens</div>
        BUYMOREBUTTON FOLLOWFORTOKENSBUTTON
        </>
      : null}
    </Sheet>
  </Modal>
  );
}

export default DoModal;