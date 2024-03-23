import { useEffect, useState } from 'react';
import useLongPress from '../../../utils/useLongPress'
import ding from './audios/iphone_ding.mp3'
import { v4 as uuidv4 } from 'uuid';

function NotifyButton(props) {
    const { socket, selectedEvent, posicions, caixaSelected, castellersInfo, assistencia, user } = props;
    const [hasBeenNotified, setHasBeenNotified] = useState(false)

    const format_text = (text, id) => {
        const nom = id in castellersInfo ?
            castellersInfo[id].mote ? castellersInfo[id].mote :
            castellersInfo[id].nom ? castellersInfo[id].nom :
            ''
        : ''

        return text
            .replaceAll(' {nom}', nom !== '' ? ` ${nom}` : '')
            .replaceAll('{nom}', nom !== '' ? nom : '')
    }

    const howManyDaysFromToday = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(date - today);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    const formatDaysFromToday = (dateString) => {
        const days = howManyDaysFromToday(dateString);
        if (days === 0) return 'avui';
        if (days === 1) return 'demà';
        return `en ${days} dies`;
    }

    const notifica_user = (target) => {

        const title = "{nom}, confirma'ns si vens o no";
        const body = `Necessitem saber si comptem amb tu` + (eventInfo && eventInfo?.['title'] && eventInfo?.['data-esperada-inici'] ? ` a ${eventInfo['title']} (${formatDaysFromToday(eventInfo['data-esperada-inici'])}).` : '.')

        // if (eventInfo) {
            socket.emit('.send_notification_to_user',
                target,
                {
                    title: format_text(title, target),
                    body: format_text(body, target),
                    data: { selectedDay: selectedDay },
                    notification_id: uuidv4(),
                    author: user,
                },
                /*save=*/false
            )

            setHasBeenNotified(true)
        // } else {
        //     console.error('Informació de l\'esdeveniment no carregada');
        // }
    }

    const hasAssignat = props => {
        return caixaSelected !== -1 && caixaSelected in posicions.caixes;
    };

    const longPressEvent = useLongPress(
        () => undefined,
        () => undefined,
        500
    );

    const user_id = hasAssignat(props) ? parseInt(posicions.caixes[caixaSelected]) : -1;

    const [eventInfo, setEventInfo] = useState(null)
    const [selectedDay, setSelectedDay] = useState(null)
    const dateId = d => [d.getDate(), d.getMonth(), d.getFullYear()].join('-');

    useEffect(() => {
        socket.emit('.request_event', parseInt(selectedEvent))
        socket.on('.event', (info) => parseInt(info.id) === parseInt(selectedEvent) && setEventInfo(info))

        return () => {
            socket.off('.event')
        }
    }, [selectedEvent])

    useEffect(() => {
        if (!eventInfo) return;
        const dayId = dateId(new Date(eventInfo['data-esperada-inici']))
        setSelectedDay(dayId);
    }, [eventInfo])

    useEffect(() => {
        setHasBeenNotified(false)
    }, [caixaSelected])

    const showButton = hasAssignat(props) // && assistencia === "No confirmat"

    return (
        <div
            className={`floating-button notify ${!showButton ? 'hidden' : ''} ${hasBeenNotified ? 'notified' : ''}`}
            onClick={() => notifica_user(user_id)}
            /*onLongPress=*/{...longPressEvent}
        >
            { hasBeenNotified && <audio src={ding} autoPlay /> }
            <div className='bell'>
                🔔
            </div>
        </div>
    );
}

export default NotifyButton;