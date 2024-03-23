import Info from "./Info";
import styles from "./Events.styles";
import SwitchType from "./SwitchType";
import SwitchTargets from "./SwitchTargets";

function DeleteEventButton({ event, socket }) {
    const handleDeleteEvent = () => {
        // Confirmar que es vol eliminar l'event
        const confirm = window.confirm(`Estàs segur que vols eliminar l'event ${event.title}? Aquesta acció no es pot desfer.`);

        if (confirm) {
            socket.emit('.delete_event', event.id);
        }
    }

    return (
        <button
            style={styles.delete_event_button}
            onClick={handleDeleteEvent}
        >
            Eliminar
        </button>
    );
}

function Event({ event, socket, toBeDeleted }) {
    return (
        <div style={styles.event_container} key={event.id}>
            <div style={styles.event_content}>
                <div style={styles.event_info}>
                    <Info        
                        title={event.title}
                        description={event.description}
                        lloc={event.lloc}
                        data-inici={event['data-esperada-inici']}
                        data-fi={event['data-esperada-fi']}    
                        link={event['gcalendar-link']}
                    />
                    
                    <div style={{ marginTop: 20 }}>
                        <h4>Tipus</h4>
                        <SwitchType event={event} socket={socket} />
                    </div>

                    <div style={{ marginTop: 20 }}>
                        <h4>Visibilitat</h4>
                        <SwitchTargets event={event} socket={socket} />
                    </div>

                    {
                        toBeDeleted &&
                        <div style={{ marginTop: 20 }}>
                            <p style={{ color: 'red', fontSize: 14, fontStyle: 'italic' }}>
                                Aquest esdeveniment no s'ha trobat a Google Calendar. Vols eliminar-lo?
                            </p>

                            <DeleteEventButton
                                event={event}
                                socket={socket}
                            />
                        </div>
                    }
                </div>
            </div>
        </div>
    );
}

export default Event;