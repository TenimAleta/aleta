import { useEffect, useState } from "react";
import moment from 'moment';
import { fetchAPI } from "../../utils/utils";

function LoadMore({ setLoadN }) {
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

function Event({ event, selectEvent, isSelected, assistencies, setAssistencies }) {
    useEffect(() => {
        if (event?.id) {
            fetchAPI(`/assistencies_event/${event.id}`, data => {
                setAssistencies(prev => ({ ...prev, [event.id]: data.data }))
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
        },
        'Fitxat': {
            color: 'blue',
            emoji: '📍'
        }
    }

    return (
        <div
            style={{ padding: 20, flexShrink: event ? 0 : 1, borderRadius: 10, backgroundColor: isSelected ? '#eee' : 'transparent' }}
            onClick={() => event ? selectEvent(event) : selectEvent()}
        >
            <div><strong>{event ? event.title : 'No triar cap esdeveniment'}</strong></div>
            { event && <div>{formattedDate}</div> }
            { event && <div style={{ display: 'flex', justifyContent: 'space-around', gap: 10 }}> {
                Object.keys(subgroupOptions).map(subgroupName =>
                    <span key={subgroupName} style={{ color: subgroupOptions[subgroupName].color }}>
                        {subgroupOptions[subgroupName].emoji}&nbsp;
                        {assistencies?.[event.id]?.filter(row => row.assistencia === subgroupName)?.length}
                    </span>)
                } </div>
            }
        </div>
    )
}

export const dateId = d => [d.getDate(), d.getMonth(), d.getFullYear()].join('-');

function ChooseEvent({ setCloseEvents, selectedEvent, setSelectedEvent, events, setEvents, assistencies, setAssistencies }) {
    useEffect(() => {
        fetchAPI('/calendar', data => {
            setEvents(data.calendar_events.events);
        })
    }, []);

    const events_propers = events
        .filter(event => {
            const now = new Date();
            const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));
            const twoHoursLater = new Date(now.getTime() + (2 * 60 * 60 * 1000));
            const eventStart = new Date(event["data-esperada-inici"]);
            const eventEnd = new Date(event["data-esperada-fi"]);

            return (eventStart >= twoHoursAgo && eventStart <= twoHoursLater) || 
                (eventEnd >= twoHoursAgo && eventEnd <= twoHoursLater) ||
                (eventStart < now && eventEnd > now);
        })

    const events_propers_comp = events_propers
        .map(event =>
            <Event
                key={event.id}
                event={event}
                isSelected={selectedEvent === event.id}
                selectEvent={ev => {
                    setSelectedEvent(ev.id);
                }}
                assistencies={assistencies}
                setAssistencies={setAssistencies}
            />
        )

    useEffect(() => {
        if (events_propers.length > 0) {
            setCloseEvents(
                events_propers
                    .map(e => e.id)
            );
        }
    }, [
        events_propers.length
    ])

    return events.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <div style={{ padding: 20, borderRadius: 10 }}>
                {/* Carregant esdeveniments... */}
            </div>
        </div>
    ) : events_propers.length > 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <div style={{ display:'flex', flexDirection: 'row', overflow: 'scroll' }}>
                {events_propers_comp}
            </div>
        </div>
    ) : (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <div style={{ padding: 20, borderRadius: 10 }}>
                No hi ha cap esdeveniment proper
            </div>
        </div>
    )
}

export default ChooseEvent;