import { useEffect, useState } from "react";
import Info from "./Info";
import { NoSignal } from "../Interface";
import { applyTimeZone } from "../interface/assistencia/LlistaAssistencies";
import moment from "moment";
import Event from "./Event";
import CalendarsEditor from "./CalendarsEditor";
import Pressable from "../other/Pressable";
import UserInfo from "../login/UserInfo";
import { HeaderTabs } from "../interface/ProvesApp";
import { fetchAPI } from "../../utils/utils";
import ShareCalendar from "./ShareCalendar";

function CalendarApp(props) {
    const { socket } = props;

    const [calendarEvents, setCalendarEvents] = useState({ 'calendar_ids': null, 'events': [] });
    const [loadMorePast, setLoadMorePast] = useState(1)
    const [loadMoreFuture, setLoadMoreFuture] = useState(1)

    const [eventsToBeDeleted, setEventsToBeDeleted] = useState([])

    const localeDateOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    };

    const localeTimeOptions = {
        hour: "numeric",
        minute: "numeric",
    };

    useEffect(() => {
        document.title = `Editar calendari - Aleta`;

        socket.emit('.request_calendar');

        socket.on('.calendar_events', info => setCalendarEvents(info));
        socket.on('.deleted_event', () => socket.emit('.request_calendar'))

        socket.on('.events_to_be_deleted', events => setEventsToBeDeleted(events.map(event => event.id)))
        socket.on('.targets_added_to_all_future_events', () => window.location.reload())

        return () => {
            socket.off('.calendar_events');
            socket.off('.deleted_event');
            socket.off('.events_to_be_deleted');
            socket.off('.targets_changed');
        }
    }, []);

    const futureEvents = calendarEvents.events
        .filter(event => applyTimeZone(event["data-esperada-inici"]) > moment())
        .sort((a, b) => applyTimeZone(a["data-esperada-inici"]) > applyTimeZone(b["data-esperada-inici"]) ? 1 : -1)

    const pastEvents = calendarEvents.events
        .filter(event => applyTimeZone(event["data-esperada-inici"]) < moment())
        .sort((a, b) => applyTimeZone(a["data-esperada-inici"]) > applyTimeZone(b["data-esperada-inici"]) ? 1 : -1)

    const llista_future_events = futureEvents
        .slice(0, loadMoreFuture*10)
        .map(event => {
            return <Event
                key={event.id}
                event={event}
                socket={socket}
                toBeDeleted={eventsToBeDeleted.includes(event.id)}
            />
        });

    const llista_past_events = pastEvents
        .slice(-5 * (loadMorePast - 1) - 1)
        .map(event => {
            return <Event
                key={event.id}
                event={event}
                socket={socket}
                toBeDeleted={eventsToBeDeleted.includes(event.id)}
            />
        });

    const style_recarregar_calendari = {
        display: 'inline-block',
        padding: '10px 20px',
        backgroundColor: 'lightblue',
        color: '#000',
        borderRadius: 5,
        cursor: 'pointer',
        margin: '10px 0',
        shadow: '0 0 5px #000',
        width: '95%',
        textAlign: 'center',

    }

    const recarregar_calendari = () => {
        socket.emit('.request_calendar');
        alert('Calendari sincronitzat!\n\rAra pots veure les actuacions, assaigs i activitats actualitzades.\n\rTanca i torna a obrir l\'Aleta per veure els canvis.')
    }

    const deleteAllEventsToBeDeleted = () => {
        const confirm = window.confirm(`Vols esborrar els ${eventsToBeDeleted.length} esdeveniments no trobats al calendari? Perdràs totes les proves i assistències associades.`)

        if (confirm) {
            eventsToBeDeleted.forEach(id => socket.emit('.delete_event', id))
        }
    }

        return (
            <>
                <NoSignal socket={socket} />
            
                <div style={{ padding: 30, width: '80%' }}>
                    <UserInfo {...props} />

                    <HeaderTabs {...props} />

                    <Pressable style={{ backgroundColor: '#eee' }} className="boto-back" href='/'>
                        ← Tornar a la pàgina principal
                    </Pressable>
                    <div>
                        <h2>Calendaris de Google</h2>
                        <p>Per canviar els esdeveniments, modifica els calendaris des de l'aplicació <a href='https://calendar.google.com/calendar/'>Google Calendar</a>.</p>
                        {calendarEvents.calendar_ids && calendarEvents.calendar_ids.map(calendar_id => (
                            <div
                                key={calendar_id}
                                style={{
                                    borderStyle: 'solid',
                                    borderWidth: 5,
                                    borderColor: '#f3f3f3',
                                    padding: 20,
                                    margin: 10,
                                    borderRadius: 5,
                                }}
                            >
                                <iframe src={`https://calendar.google.com/calendar/embed?src=${calendar_id}&ctz=Europe%2FMadrid&mode=MONTH&hl=ca`} width="100%" height="400" frameBorder='0' scrolling="no"></iframe>
                                {/* <p><em>Afegeix aquest calendari a la teva compta de Google clicant aquest enllaç (pots compartir l'enllaç amb la colla perquè facin el mateix): <a href={`https://calendar.google.com/calendar/u/0/r?cid=${calendar_id}`}>Enllaç al calendari de Google</a></em></p> */}
                            </div>
                        ))}

                        <CalendarsEditor />

                        <ShareCalendar />
                    </div>

                    {
                        calendarEvents?.calendar_ids?.length > 0 &&
                    <div>
                        <h2>Esdeveniments extrets del calendari</h2>

                        {
                            calendarEvents.calendar_ids && eventsToBeDeleted.length > 5 &&
                            <div>
                                <button
                                    style={{
                                        backgroundColor: 'red',
                                        color: 'white',
                                        padding: '10px 20px',
                                        borderRadius: 5,
                                    }}
                                    onClick={deleteAllEventsToBeDeleted}
                                >
                                    Esborrar tots els {eventsToBeDeleted.length} esdeveniments no trobats al calendari
                                </button>

                                <div
                                    style={{
                                        marginBottom: 20,
                                        maxHeight: 200,
                                        overflowY: 'scroll',
                                    }}
                                >
                                    {
                                        eventsToBeDeleted.map(id => {
                                            const event = calendarEvents.events.find(event => event.id === id)
                                            if (!event) return null

                                            return (
                                                <div
                                                    key={id}
                                                    style={{
                                                        paddingLeft: 10,
                                                        paddingRight: 10,
                                                        backgroundColor: 'lightcoral',
                                                        borderRadius: 5,
                                                        margin: 5,
                                                        fontSize: 12,
                                                        lineHeight: '0.5em',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <p style={{ fontWeight: 'bold' }}>{event?.title || `Esdeveniment #${id}`}</p>
                                                            <p>{moment(applyTimeZone(event["data-esperada-inici"])).format('dddd, D MMMM YYYY, HH:mm')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    }
                                </div>
                            </div>
                        }

                        {
                            calendarEvents.calendar_ids && <>
                                { pastEvents.length > llista_past_events.length &&
                                    <div style={{ margin: 10, border: 'solid 1px black', flex: 1, padding: 20, textAlign: 'center', borderRadius: 10 }} onClick={() => setLoadMorePast(prev => prev + 1)}>
                                        + Afegeix un antic
                                    </div>
                                }
                                <div style={{ display: 'flex', flexWrap: 'wrap' }}>{llista_past_events}</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap'  }}>{llista_future_events}</div>
                                
                                { futureEvents.length > llista_future_events.length &&
                                    <div style={{ margin: 10, border: 'solid 1px black', flex: 1, padding: 20, textAlign: 'center', borderRadius: 10 }} onClick={() => setLoadMoreFuture(prev => prev + 1)}>
                                        + Afegeix més futurs
                                    </div>
                                }
                            </>
                        }
                    </div>
                    }

                    {
                        calendarEvents?.calendar_ids?.length === 0 &&
                        <div
                            style={{
                                marginTop: 20,
                            }}
                        >
                            <p><em>No hi ha cap calendari configurat. Si us plau, afegiu-ne un.</em></p>
                            {/* <p><em>Piqueu el botó "Com afegir un calendari?".</em></p> */}
                        </div>
                    }
                </div>
            </>
        )
}

export default CalendarApp;