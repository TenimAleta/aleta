import { useEffect, useState } from "react";
import moment from 'moment';
import { applyTimeZone } from "./LlistaAssistencies";

function TargetChooser({ socket, selectedEvent, targetEvent, setTargetEvent, targetAssistencies }) {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        socket.emit('.request_all_events');
        socket.on('.events', events => {
            events.sort((a, b) => moment(a["data-esperada-inici"]).diff(moment(b["data-esperada-inici"])));
            setEvents(events);
        });
        return () => socket.off('.events');
    }, []);

    const handleEventChange = (e) => {
        setTargetEvent(e.target.value);
    };

    const resetSelection = () => {
        setTargetEvent('');
    };

    const selectedEventInfo = events
        .find(el => parseInt(el.id) === parseInt(selectedEvent))

    const futureEvents = events
        .filter(event => applyTimeZone(event["data-esperada-inici"]).isAfter(applyTimeZone(selectedEventInfo['data-esperada-inici'])))

    return (
        <div
            style={{
                padding: '10px',
                backgroundColor: '#eee',
                marginBottom: 10,
            }}
        >
            <h3>Comparar assistència amb un altre esdeveniment</h3>
            <div className="target-chooser" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                margin: '10px 0'
            }}>
                <select
                    onChange={handleEventChange}
                    value={targetEvent || ''}
                    style={{
                        width: '80%',
                        padding: '5px',
                        fontSize: '16px',
                        borderRadius: '5px',
                    }}
                    >
                    <option value="">Selecciona un esdeveniment a comparar...</option>
                    {futureEvents.map(event => 
                        <option key={event.id} value={event.id}>
                            {event.title} - {moment(event["data-esperada-inici"]).format('LLLL')}
                        </option>
                    )}
                </select>
                <button style={{
                    marginLeft: '10px',
                    padding: '5px 10px',
                    fontSize: '16px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                }} onClick={resetSelection}>
                    Borra
                </button>
            </div>

            {
                targetEvent && targetAssistencies && targetAssistencies.length > 0 &&
                <div style={{
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#ddd',
                    borderRadius: '5px',
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    display: 'flex',
                }}>
                    <div>&#9989; {targetAssistencies.filter(el => el.assistencia === 'Vinc').length}</div>
                    <div>&#10060; {targetAssistencies.filter(el => el.assistencia === 'No vinc').length}</div>
                    <div>😶 {targetAssistencies.filter(el => el.assistencia === 'No confirmat').length}</div>
                </div>
            }
        </div>
    );
}

export default TargetChooser;