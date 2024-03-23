import { useEffect, useState } from "react";
import Event from './Event';
import styles from './Events.styles'
import Pressable from "../other/Pressable";

const MODELS_EVENT_ID = 999999

function OnlyOneEvent(props) {
    const { socket, eventToEdit, isModels } = props;
    const event_type = props.type;

    const [event, setEvent] = useState({});
    const isEventEmpty = Object.keys(event).length === 0;
    const isEventNotFound = event === false;

    const beforeNow = dateString => (new Date(new Date(dateString).toLocaleString("en-US", {timeZone: 'UTC'}))) <= (new Date());
    const afterNow = dateString => (new Date()) <= (new Date(new Date(dateString).toLocaleString("en-US", {timeZone: 'UTC'})));

    useEffect(() => {
        if (isModels) document.title = `Pinyes models - Aleta`;
    }, [
        isModels
    ]);

    useEffect(() => {
        socket.emit('.request_event', isModels ? MODELS_EVENT_ID : eventToEdit);
        socket.on('.event', data => setEvent(data))

        // Event id of pinyes models
        if (isModels) socket.emit('.create_model_event')
        socket.on('.created_model_event', () => socket.emit('.request_event', isModels ? MODELS_EVENT_ID : eventToEdit))

        return () => {
            socket.off('.event');
            socket.off('.created_model_event');
        }
    }, []);

    return isEventEmpty ? (
        <>
            <em>Carregant...</em>
        </>
    ) : isEventNotFound ? (
        <>
            <em>Esdeveniment no trobat... No hauràs modificat l'enllaç manualment, no?</em>
            <br />
            <br />
            <a href="/">Torna a veure tots els esdeveniments</a>
        </>
    ) : (
        <div
            style={{
                paddingBottom: 50
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flex: 1,
                }}
            >
                <Pressable href='/' className="boto-back" style={{ backgroundColor: '#eee', flex: 1 }}>
                    ← Torna a la pàgina principal
                </Pressable>
            </div>

            <div style={styles.event_container} key={`${event.id}`}>
                <Event
                    title={event.title}
                    description={event.description}
                    event={event.id}
                    lloc={event.lloc}
                    targets={event.targets}
                    hash={event.hash}
                    data-inici={event["data-esperada-inici"]}
                    data-fi={event["data-esperada-fi"]}
                    isModels={isModels}
                    {...props}
                />
            </div>
        </div>
    )
}

export default OnlyOneEvent;