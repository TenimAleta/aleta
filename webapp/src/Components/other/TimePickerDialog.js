import React, { useRef, useEffect } from 'react';

const TimePickerDialog = ({ title, onConfirm, openDialog, setOpenDialog }) => {
  const dialogRef = useRef();
  const timeRefHH = useRef();
  const timeRefMM = useRef();

  const confirmTime = () => {
    const timeHH = parseInt(timeRefHH.current.value) < 10 ? `0${parseInt(timeRefHH.current.value)}` : parseInt(timeRefHH.current.value);
    const timeMM = parseInt(timeRefMM.current.value) < 10 ? `0${parseInt(timeRefMM.current.value)}` : parseInt(timeRefMM.current.value);

    const timeValue = `${timeHH}:${timeMM}`;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!timeRegex.test(timeValue)) {
        alert("L'hora ha de ser en format HH:MM. Per exemple: 09:30, 12:41...");
        return;
    }

    onConfirm(timeValue);
    dialogRef.current.close();
  };

  const handleCancel = () => {
    setOpenDialog(false);
    dialogRef.current.close();
  };

  const handleClickOutside = (event) => {
    if (dialogRef.current && !dialogRef.current.contains(event.target)) {
      setOpenDialog(false);
    }
  };

  useEffect(() => {
    if (openDialog && !dialogRef.current.open) {
      dialogRef.current.showModal();
    } else if (!openDialog && dialogRef.current.open) {
      dialogRef.current.close();
    }
  }, [openDialog]);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, []);

  return (
    <dialog ref={dialogRef} style={{ width: '300px', padding: '20px', borderRadius: '5px', backgroundColor: '#fff' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>{title}</h2>

      <form method="dialog" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <input
            maxLength={2}
            type="text"
            placeholder='HH'
            ref={timeRefHH}
            style={{ marginRight: '10px', width: '50px', textAlign: 'center' }}
        />

        <span>:</span>

        <input
            maxLength={2}
            type="text"
            placeholder='MM'
            ref={timeRefMM}
            style={{ marginLeft: '10px', width: '50px', textAlign: 'center' }}
        />
      </form>

      <div style={{ display: 'flex', gap: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={confirmTime} style={{ padding: '10px 20px', backgroundColor: '#007BFF', color: '#fff', border: 'none', borderRadius: '5px' }}>
            Guardar
        </button>
        <button onClick={handleCancel} style={{ padding: '10px 20px', backgroundColor: '#eee', color: '#000', border: 'none', borderRadius: '5px' }}>
            Cancel·lar
        </button>
      </div>
    </dialog>
  );
};

export default TimePickerDialog;