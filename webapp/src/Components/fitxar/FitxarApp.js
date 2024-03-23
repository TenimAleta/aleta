import { useState } from "react";
import ChooseEvent from "./ChooseEvent";
import UserSelect from "./UserSelect";
import { useEffect } from "react";

function FitxarApp(props) {
    const { socket, userId: tecnicId } = props;

    const [userId, setUserId] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [closeEvents, setCloseEvents] = useState([]);
    const [events, setEvents] = useState([]);
    const [assistencies, setAssistencies] = useState({});

    const isTecnica = props.castellersInfo[tecnicId]?.es_tecnica > 0;

    const fitxar = () => {
        if (closeEvents.length === 0 || !userId) return;

        closeEvents.forEach(event => {
            socket.emit('.confirmar_raresa', event, userId, 2, false, null, null);

            setAssistencies(prev => {
                const assistenciaEvent = prev[event] || [];
                const matchedAssistencia = assistenciaEvent
                    .find(row => row.id === userId)

                if (matchedAssistencia) {
                    matchedAssistencia.assistencia = "Fitxat";
                    matchedAssistencia["assistència"] = 2;

                    return {
                        ...prev,
                        [event]: assistenciaEvent
                            .map(row => row.id === userId ? matchedAssistencia : row)
                    }
                } else {
                    return {
                        ...prev,
                        [event]: [...assistenciaEvent, {
                            id: userId,
                            assistencia: "Fitxat",
                            "assistència": 2
                        }]
                    }
                }
            })
        })
    }

    const isUserFitxat = assistencies[selectedEvent]
        ?.find(row => row.id === userId)
        ?.assistencia === "Fitxat"

    useEffect(() => {
        socket.on('.confirmat', ({ event, user: userId, assistencia }) => {
            setAssistencies(prev => {
                const assistenciaEvent = prev[event] || [];
                const matchedAssistencia = assistenciaEvent
                    .find(row => row.id === userId)

                const assistenciaMap = {
                    "Fitxat": 2,
                    "Vinc": 1,
                    "No vinc": 0,
                }

                if (matchedAssistencia) {
                    matchedAssistencia.assistencia = assistencia;
                    matchedAssistencia["assistència"] = assistenciaMap[assistencia];

                    return {
                        ...prev,
                        [event]: assistenciaEvent
                            .map(row => row.id === userId ? matchedAssistencia : row)
                    }
                } else {
                    return {
                        ...prev,
                        [event]: [...assistenciaEvent, {
                            id: userId,
                            assistencia: assistencia,
                            "assistència": assistenciaMap[assistencia]
                        }]
                    }
                }
            })
        })

        return () => {
            socket.off('.confirmat');
        }
    }, [
        socket,
        setAssistencies,
    ])

    return isTecnica && (
        <div
            style={{
                width: '80%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginTop: 100,
                gap: 20,
            }}
        >
            <h1>Fitxa la teva assistència</h1>
            <ChooseEvent
                selectedEvent={selectedEvent}
                setSelectedEvent={setSelectedEvent}
                setCloseEvents={setCloseEvents}
                events={events}
                setEvents={setEvents}
                assistencies={assistencies}
                setAssistencies={setAssistencies}
                {...props}
            />

            {
                selectedEvent &&
                <UserSelect
                    userId={userId}
                    setUserId={setUserId}
                    castellersInfo={props.castellersInfo}
                    isUserFitxat={isUserFitxat}
                    selectedEvent={selectedEvent}
                    assistencies={assistencies}
                />
            }

            {
                (selectedEvent && userId) && (
                    !isUserFitxat ?
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                            }}
                        >
                            <button
                                onClick={fitxar}
                                style={{
                                    width: 400,
                                    padding: '25px 40px',
                                    margin: '8px 0',
                                    fontSize: '24px',
                                }}
                            >
                                Fitxar
                            </button>
                        </div>
                    :
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                marginTop: 40,
                                color: 'green',
                                fontSize: '24px',
                            }}
                        >
                            Fitxat!
                        </div>
                )
            }
        </div>
    )
}

export default FitxarApp;