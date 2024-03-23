import { useEffect, useRef, useState } from "react"
import moment from "moment";

export const applyTimeZone = (date, tz='Spain') => {
    if (tz === 'Spain') {
        const mom = moment(date)
        const lastSundayOfThisYearsMarch = mom.clone().year(mom.clone().year()).month(2).endOf('month').day('Sunday');
        const lastSundayOfThisYearsOctober = mom.clone().year(mom.clone().year()).month(9).endOf('month').day('Sunday');

        if (mom < lastSundayOfThisYearsMarch) {
            // January - March: Winter time
            return mom.add(-1, 'hours');
        } else if (mom < lastSundayOfThisYearsOctober) {
            // April - October: Summer time
            return mom.add(-2, 'hours');
        } else {
            // November - December: Winter time
            return mom.add(-1, 'hours');
        }
    } else {
        return moment(date);
    }
}

function DuplicarProves({ socket, setClosed, toEvent }) {
    const [events, setEvents] = useState(null)
    const [fromEvent, setFromEvent] = useState(null)
    const eventRefs = useRef([]);

    const duplicar_proves = () => {
        if (fromEvent === null) return null;
        if (fromEvent === toEvent) return null;

        socket.emit('.duplicar_proves', fromEvent, toEvent)
        socket.emit('.request_proves', toEvent)
        socket.emit('.request_order', toEvent)
        setClosed(true)
    }

    useEffect(() => {
        socket.emit('.request_all_events')
        socket.on('.events', events => setEvents(
            events.sort((a,b) => new Date(a['data-esperada-inici']) > new Date(b['data-esperada-inici']) ? 1 : -1)
        ))
        return () => socket.off('.events')
    }, [])
    
    useEffect(() => {
        if (events) {
            const toEventIndex = events.findIndex(
                event => parseInt(event.id) === parseInt(toEvent)
            )

            if (toEventIndex >= 0) {
                eventRefs.current[toEventIndex].scrollIntoView({
                    // behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }
    }, [events]);

    return (
        <div>
            <div style={{height: '150px', overflowY: 'scroll'}}>
                {events?.map((event, index) => (
                    <div key={event.id} 
                        ref={el => eventRefs.current[index] = el}
                        onClick={() => setFromEvent(event.id)}
                        style={{
                            padding: '10px',
                            backgroundColor:
                                fromEvent === event.id ? 'lightblue' :
                                toEvent === event.id ? '#eee' :
                                'transparent',
                            color: toEvent === event.id ? '#aaa' : 'black',
                            fontStyle: toEvent === event.id ? 'italic' : 'normal',
                            cursor: 'pointer'
                        }}
                    >
                        {event.title} - {applyTimeZone(event['data-esperada-inici']).format('DD/MM/YYYY HH:mm')}
                    </div>
                ))}
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    margin: '10px'
                }}
            >
                <button onClick={duplicar_proves}>Duplicar proves</button>
            </div>
        </div>
    )
}

export default DuplicarProves;