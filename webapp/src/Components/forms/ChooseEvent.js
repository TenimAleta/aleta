import { useEffect, useState } from "react";
import moment from 'moment';
import { fetchAPI } from "../../utils/utils";

function LoadMore({ setLoadN }) {
    return (
        <div
            style={{
                padding: 20,
                borderRadius: 10,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <button
                onClick={() =>  setLoadN(prev => prev + 5)}
            >
                Carrega'n més
            </button>
        </div>
    )
}

function Event({ hasForm, socket, event, selectEvent, isSelected }) {
    const [assistencies, setAssistencies] = useState([]);

    useEffect(() => {
        if (event?.id) {
            fetchAPI(`/assistencies_event/${event.id}`, data => {
                setAssistencies(data.data)
            })
        }
    }, [event?.id]);

    useEffect(() => {
        if (isSelected && event) selectEvent(event);
    }, [isSelected]);

    const formattedDate = event && moment(event['data-esperada-inici'])
        .format('DD/MM HH:mm')

    const subgroupOptions = {
        'No confirmat': {
            color: 'orange',
            emoji: '😶'
        },
        'Vinc': {
            color: 'green',
            emoji: '✅'
        },
        'No vinc': {
            color: 'red',
            emoji: '❌'
        }
    }

    return (
        <div
            style={{ padding: 20, flexShrink: event ? 0 : 1, borderRadius: 10, backgroundColor: isSelected ? '#eee' : 'transparent' }}
            onClick={() => event ? selectEvent(event) : selectEvent()}
        >
            <div><strong>{ hasForm ? '(📝) ' : '' }{event ? event.title : 'No triar cap esdeveniment'}</strong></div>
            { event && <div>{formattedDate}</div> }
            { event && <div style={{ display: 'flex', justifyContent: 'space-around' }}> {
                Object.keys(subgroupOptions).map(subgroupName =>
                    <span key={subgroupName} style={{ color: subgroupOptions[subgroupName].color }}>
                        {subgroupOptions[subgroupName].emoji}&nbsp;
                        {assistencies.filter(row => row.assistencia === subgroupName).length}
                    </span>)
                } </div>
            }
        </div>
    )
}

export const dateId = d => [d.getDate(), d.getMonth(), d.getFullYear()].join('-');

function ChooseEvent({ forms, showPast, setShowPast, socket, selectedEvent, setSelectedEvent, setSelectedDay, events, setEvents }) {
    const togglePastFuturs = () => setShowPast(prev => !prev);
    const [loadN, setLoadN] = useState(5);

    useEffect(() => {
        fetchAPI('/calendar', data => {
            setEvents(data.calendar_events.events);
        })
    }, []);

    const beforeNow = dateString => (new Date(new Date(dateString).toLocaleString("en-US", {timeZone: 'UTC'}))) <= (new Date());
    const afterNow = dateString => (new Date()) <= (new Date(new Date(dateString).toLocaleString("en-US", {timeZone: 'UTC'})));

    const pastEvents = events
        .sort((a, b) => new Date(a['data-esperada-inici']) < new Date(b['data-esperada-inici']) ? 1 : -1)
        .filter(event => beforeNow(event["data-esperada-inici"]))
        .slice(0, loadN)
        .reverse()

    const futureEvents = events
        .sort((a, b) => new Date(a['data-esperada-inici']) > new Date(b['data-esperada-inici']) ? 1 : -1)
        .filter(event => afterNow(event["data-esperada-fi"]))
        .slice(0, loadN)

    const none_event = <Event
        key={-1}
        isSelected={
            events.every(event => event.id !== selectedEvent)
        }
        selectEvent={() => {
            setSelectedEvent(null);
            setSelectedDay(null);
        }}
        socket={socket}
        hasForm={null}
    />

    const events_futurs = futureEvents.map(event =>
        <Event
            key={event.id}
            event={event} 
            isSelected={selectedEvent === event.id}
            selectEvent={ev => {
                setSelectedEvent(ev.id);
                const dayId = dateId(new Date(ev['data-esperada-inici']))
                setSelectedDay(dayId);
            }}
            socket={socket}
            hasForm={event.id in forms}
        />
    )

    const events_passats = pastEvents
        .map(event =>
            <Event
                key={event.id}
                event={event} 
                isSelected={selectedEvent === event.id}
                selectEvent={ev => {
                    setSelectedEvent(ev.id);
                    const dayId = dateId(new Date(ev['data-esperada-inici']))
                    setSelectedDay(dayId);
                }}
                socket={socket}
                hasForm={event.id in forms}
            />
        )

    const load_more = <LoadMore
        key={'load_more'}
        setLoadN={setLoadN}
    />

    return (
        <div>
            <div style={{ display:'flex', flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }}>
                <div onClick={togglePastFuturs} className="tab" style={{ borderRadius: 10, backgroundColor: showPast ? '#eee' : 'transparent', display: 'flex', flex: 1, justifyContent: 'center' }}>
                    <h3>Passats</h3>
                </div>
                <div onClick={togglePastFuturs} className="tab" style={{ borderRadius: 10, backgroundColor: !showPast ? '#eee' : 'transparent', display: 'flex', flex: 1, justifyContent: 'center' }}>
                    <h3>Futurs</h3>
                </div>
            </div>

            { showPast && <div style={{ display:'flex', flexDirection: 'row', overflow: 'scroll', direction: 'rtl' }}>
                {[load_more, ...events_passats, none_event].reverse()}
            </div> }

            { !showPast && <div style={{ display:'flex', flexDirection: 'row', overflow: 'scroll' }}>
                {[none_event, ...events_futurs, load_more]}
            </div> }
        </div>
    )
}

export default ChooseEvent;