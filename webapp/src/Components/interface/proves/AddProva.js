import { useState } from 'react';
import styles from './Prova.styles'

function AddProva(props) {
    const { setSelectedEvent, setImportPopupClosed, event } = props;
    const [clicking, setClicking] = useState(false);

    return (
        <div
            style={{...styles.prova, ...{ cursor: 'pointer', backgroundColor: clicking ? '#e0e0e0' : '#ccc' }}}
            onPointerDown={() => setClicking(true)}
            onPointerLeave={() => setClicking(false)}
            onPointerUp={() => setClicking(false)}
            onClick={() => {
                setSelectedEvent(event);
                setImportPopupClosed(false);
            }}
        >
            <div style={{ ...styles.provaText, color: '#333' }}>+</div>
        </div>
    );
}

export default AddProva;