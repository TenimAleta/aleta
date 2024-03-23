import DeleteButton from './DeleteButton';
import NotifyButton from './NotifyButton';
import SwapButton from './SwapButton';
import FitxarButton from './FitxarButton';
import './FloatingButtons.css'
import { useEffect, useState } from 'react';
import { isBrowser } from 'react-device-detect';

function FloatingButtons(props) {
    const { socket, isModel } = props;
    const { selectedEvent, selectedBundle, selectedVersio } = props;

    const [user, setUser] = useState(-1);
    const [assistencia, setAssistencia] = useState(null);

    useEffect(() => {
        const { caixaSelected, posicions } = props;
        if (caixaSelected in posicions.caixes) {
            const _user = posicions.caixes[caixaSelected];
            socket.emit('.request_assistencia', selectedEvent, _user);
            socket.on(`.assistencia`, res => setAssistencia(res.assistencia));
            setUser(_user);

            return () => socket.off(`.assistencia`);
        } else if (caixaSelected === -1) {
            setAssistencia(null);
        }
    }, [props.caixaSelected]);

    const exports = {
        'user': user,
        'assistencia': assistencia,
        'setAssistencia': setAssistencia,

        'event': selectedEvent,
        'castell': selectedBundle,
        'versio': selectedVersio,
        ...props
    };

    return (
        <>
            <div className='floating buttons-container'>
                <SwapButton {...exports} />
                { !isModel && <FitxarButton {...exports} /> }
            </div>

            <div className='floating dangerous buttons-container'>
                <DeleteButton {...exports} />
                { !isModel && <NotifyButton {...exports} /> }
            </div>
        </>
    );
}

export default FloatingButtons;