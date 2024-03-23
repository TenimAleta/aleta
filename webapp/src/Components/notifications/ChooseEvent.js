import { useEffect, useState } from "react";
import moment from 'moment';
import { fetchAPI } from "../../utils/utils";

function Event({ socket, event, selectEvent, isSelected, subgroupName, forms }) {
    const [assistencies, setAssistencies] = useState([]);
    const [responses, setResponses] = useState([]);

    useEffect(() => {
        if (event?.id) fetchAPI(`/assistencies_event/${event.id}`, data => setAssistencies(data.data))

        socket.emit('.request_form_responses', event?.id)

        socket.on('.form_responses', (res) => {
            if (res.evId === event?.id) {
                // setResponses(Object.values(res.responses))
                setResponses(Object.keys(res.responses))
            }
        })

        return () => {
            socket.off('.assistencies_event');
            socket.off('.form_responses');
        }
    }, [event]);

    const no_confirmats = assistencies
        .filter(row => row.assistencia === subgroupName);

    const thereIsAForm = event?.id && forms && event.id in forms;

    const nonRespondants = thereIsAForm ? assistencies
        .filter(row => row.assistencia !== 'No vinc')
        .filter(row => !responses.map(id => parseInt(id)).includes(row.id)) :
        []

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
        },
        'Formulari no respost': {
            color: 'gray',
            emoji: '📝'
        }
    }

    return (
        <div
            style={{ padding: 20, flexShrink: event ? 0 : 1, borderRadius: 10, backgroundColor: isSelected ? '#eee' : 'transparent' }}
            onClick={() => event ? selectEvent(event) : selectEvent()}
        >
            <div><strong>{ event?.id in forms ? '(📝) ' : '' }{event ? event.title : 'No triar cap esdeveniment'}</strong></div>
            { event && <div>{formattedDate}</div> }
            { event && <div><span style={{ color: subgroupOptions[subgroupName].color }}>{subgroupOptions[subgroupName].emoji} {subgroupName === 'Formulari no respost' && !thereIsAForm ? '-' : (subgroupName !== 'Formulari no respost' ? no_confirmats : nonRespondants).filter(info => !!info.has_notifications).length}</span> + 🔕 <span style={{ color: 'red' }}>{subgroupName === 'Formulari no respost' && !thereIsAForm ? '-' : (subgroupName !== 'Formulari no respost' ? no_confirmats : nonRespondants).filter(info => !info.has_notifications).length}</span></div> }
        </div>
    )
}

export const dateId = d => [d.getDate(), d.getMonth(), d.getFullYear()].join('-');

function ChooseEvent({ forms, socket, selectedEvent, setSelectedEvent, setSelectedDay, events, setEvents, subgroupName }) {
    useEffect(() => {
        socket.emit('.request_calendar');
        socket.on('.calendar_events', () => socket.emit(`.request_all_events`));
        socket.on(`.events`, data => setEvents(data));
        return () => {
            socket.off(`.events`);
            socket.off('.calendar_events');
        }
    }, []);

    // Select event from URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const eventFromURL = urlParams.get('ev');
        if (!eventFromURL) return;
    
        const eventInfo = events.find(event => event.id === parseInt(eventFromURL));
        if (eventInfo) {
            setSelectedEvent(parseInt(eventFromURL));
            const dayId = dateId(new Date(eventInfo['data-esperada-inici']))
            setSelectedDay(dayId);
        }
    }, [
        events,
    ])

    const beforeNow = dateString => (new Date(new Date(dateString).toLocaleString("en-US", {timeZone: 'UTC'}))) <= (new Date());
    const afterNow = dateString => (new Date()) <= (new Date(new Date(dateString).toLocaleString("en-US", {timeZone: 'UTC'})));

    const futureEvents = events
        .sort((a, b) => new Date(a['data-esperada-inici']) > new Date(b['data-esperada-inici']) ? 1 : -1)
        .filter(event => afterNow(event["data-esperada-fi"]))

    const none_event = <Event
        key={-1}
        isSelected={
            futureEvents.every(event => event.id !== selectedEvent)
        }
        selectEvent={() => {
            setSelectedEvent(null);
            setSelectedDay(null);
        }}
        socket={socket}
        subgroupName={subgroupName}
        forms={forms}
    />

    const llista_events = futureEvents.map(event =>
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
            subgroupName={subgroupName}
            forms={forms}
        />
    )

    return (
        <div style={{ display:'flex', flexDirection: 'row', overflow: 'scroll' }}>
            {[none_event, ...llista_events]}
        </div>
    )
}

export default ChooseEvent;