import { useEffect, useState } from "react";
import Event from './Event';
import styles from './Events.styles'
import { fetchAPI } from "../../utils/utils";
import Pressable from "../other/Pressable";
import { useRef } from "react";

function Separator() {
    return (
        <hr />
    )
}

function LlistaEvents(props) {
    const { socket, past, current, events, setEvents } = props;
    const event_type = props.type;

    const loadNMultiplier = 5;
    const [numOfPastEvents, setNumOfPastEvents] = useState(0)
    const [numOfFutureEvents, setNumOfFutureEvents] = useState(loadNMultiplier)

    const [ignoredEvents, setIgnoredEvents] = useState({})

    const [scrollToCurrent, setScrollToCurrent] = useState(false)
    const [showDownArrow, setShowDownArrow] = useState(false)
    const [showUpArrow, setShowUpArrow] = useState(false)
    const [beginScroll, setBeginScroll] = useState(false)

    const scrollableContainerRef = useRef(null);

    const checkPosition = () => {
        if (!beginScroll) return;

        if (scrollableContainerRef.current) {
            const firstCurrentOrFutureEvent = 
                currentEvents.length > 0 ? currentEvents?.[0]?.id :
                futureEvents.length > 0 ? futureEvents?.[0]?.id :
                null;

            if (firstCurrentOrFutureEvent) {
                const element = document.getElementById(`event-${firstCurrentOrFutureEvent}`);
                if (element) {
                    const elementRect = element.getBoundingClientRect();
                    const containerRect = scrollableContainerRef.current.getBoundingClientRect();

                    if (elementRect.top - containerRect.top >= 100) {
                        setShowDownArrow(true);
                    }

                    if (elementRect.top - containerRect.top < 100) {
                        setShowDownArrow(false);
                    }

                    if (elementRect.top - containerRect.top <= -500) {
                        setShowUpArrow(true);
                    }

                    if (elementRect.top - containerRect.top > -500) {
                        setShowUpArrow(false);
                    }
                }
            }
        }
    }

    const beforeNow = dateString => (new Date(new Date(dateString).toLocaleString("en-US", {timeZone: 'UTC'}))) <= (new Date());
    const afterNow = dateString => (new Date()) <= (new Date(new Date(dateString).toLocaleString("en-US", {timeZone: 'UTC'})));

    const filteredEvents = (events || [])
        .filter(event => !['assaig', 'actuació', 'activitat'].includes(event_type) ? true : event.tipus === event_type)
        .sort((a, b) => new Date(a["data-esperada-inici"]) > new Date(b["data-esperada-inici"]) ? 1 : -1)

    const pastEvents = filteredEvents.filter(event => beforeNow(event["data-esperada-fi"]))
    const currentEvents = filteredEvents.filter(event => beforeNow(event["data-esperada-inici"]) && afterNow(event["data-esperada-fi"]))
    const futureEvents = filteredEvents.filter(event => afterNow(event["data-esperada-inici"]));
    // const selectedEvents = props.past ? pastEvents : props.current ? currentEvents : futureEvents;

    const selectedEvents = [
        ...pastEvents.reverse().slice(0,numOfPastEvents).reverse(),
        ...currentEvents,
        ...futureEvents.slice(0,numOfFutureEvents),
    ]

    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        setTimeout(() => setBeginScroll(true), 5000)
    }, [])

    useEffect(() => {
        setIgnoredEvents({})
    }, [
        numOfPastEvents,
    ])

    // useEffect(() => {
    //     const firstCurrentOrFutureEvent = 
    //         currentEvents.length > 0 ? currentEvents?.[0]?.id :
    //         futureEvents.length > 0 ? futureEvents?.[0]?.id :
    //         null;
    
    //     if (firstCurrentOrFutureEvent) {
    //         const element = document.getElementById(`event-${firstCurrentOrFutureEvent}`);
    //         if (element && scrollableContainerRef.current) {
    //             const scrollableContainer = scrollableContainerRef.current;
    //             const elementRect = element.getBoundingClientRect();
    //             const containerRect = scrollableContainer.getBoundingClientRect();
    
    //             // Scroll only if the element is not visible within the container
    //             if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
    //                 scrollableContainer.scrollTop += elementRect.top - containerRect.top - 10;
    //             }
    //         }
    //     }
    // }, [
    //     event_type,
    //     scrollToCurrent,
    //     currentEvents?.[0]?.id,
    //     futureEvents?.[0]?.id,
    // ]);

    // useEffect(() => {
    //     if (numOfPastEvents > loadNMultiplier) {
    //         const targetEvent = pastEvents?.[loadNMultiplier - 1]?.id;
    //         if (targetEvent) {
    //             const element = document.getElementById(`event-${targetEvent}`);
    //             if (element && scrollableContainerRef.current) {
    //                 const scrollableContainer = scrollableContainerRef.current;
    //                 const elementRect = element.getBoundingClientRect();
    //                 const containerRect = scrollableContainer.getBoundingClientRect();

    //                 // Scroll only if the element is not visible within the container
    //                 if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
    //                     scrollableContainer.scrollTop += elementRect.top - containerRect.top - 50;
    //                 }
    //             }
    //         }
    //     }
    // }, [
    //     event_type,
    //     numOfPastEvents,
    //     pastEvents?.[loadNMultiplier - 1]?.id
    // ]);

    const llista_events = selectedEvents
        .filter(event => !event?.targets?.split(',')?.includes('músics'))
        .filter(event => !ignoredEvents[event.id])
        .map(event => {
            return (
                <div id={`event-${event.id}`} style={styles.event_container} key={`${event.id}`}>
                    <Event
                        event_id={event.id}
                        title={event.title}
                        description={event.description}
                        event={event.id}
                        lloc={event.lloc}
                        targets={event.targets}
                        hash={event.hash}
                        data-inici={event["data-esperada-inici"]}
                        data-fi={event["data-esperada-fi"]}
                        past={beforeNow(event["data-esperada-fi"])}
                        ignoredEvents={ignoredEvents}
                        setIgnoredEvents={setIgnoredEvents}
                        {...props}
                    />
                </div>
            );
        });

    const PROXIMS_ES = ['actuacions', 'activitats'].includes(event_type) ? 'PRÒXIMES' : 'PRÒXIMS';

    if (selectedEvents.length > 0) {
        return (
            <div style={{ position: 'relative' }}>

            {/* <Pressable
                style={{
                    display: !showDownArrow ? 'none' : 'block',
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: '#333',
                    color: 'white',
                    padding: '10px 15px',
                    zIndex: 100,
                    borderRadius: 10,
                }}
                onClick={() => setScrollToCurrent(prev => !prev)}
            >
                ↓
            </Pressable>

            <Pressable
                style={{
                    display: !showUpArrow ? 'none' : 'block',
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: '#333',
                    color: 'white',
                    padding: '10px 15px',
                    zIndex: 100,
                    borderRadius: 10,
                }}
                onClick={() => setScrollToCurrent(prev => !prev)}
            >
                ↑
            </Pressable> */}

            <div ref={scrollableContainerRef} onScroll={() => checkPosition()} style={{...styles.events_container, ...{ display: props.hidden ? 'none' : 'block' }}}>
                { numOfPastEvents < pastEvents.length && <Pressable style={styles.add_past_event} onClick={() => setNumOfPastEvents(prev => prev + 1)}><div style={styles.add_past_event_text}>+ Carrega un antic més</div></Pressable> }

                { llista_events }

                {
                    (!props.past && !props.current) && isLoading ? <>
                        <div style={{ margin: 20 }}>&nbsp;</div>
                        <div style={{ display: 'flex', margin: 20, justifyContent: 'center' }}>
                            <em>
                                Carregant més {event_type}...
                            </em>
                        </div>
                        <div style={{ margin: 20 }}>&nbsp;</div>
                    </> : !past && !current && numOfFutureEvents < futureEvents.length ? <>
                        <Pressable onClick={() => setNumOfFutureEvents(prev => prev + loadNMultiplier)} style={styles.load_more}>
                            <div style={styles.load_more_text}>+ Carrega'n més</div>
                        </Pressable>
                    </> : <>
                    </>
                }
            </div>
            </div>
        );
    } else if (events === null && !past && !current) {
        return (
            <>
                <div style={{ display: 'flex', margin: 20, justifyContent: 'center' }}>
                    <em>
                        Carregant {event_type}...
                    </em>
                </div>
                <div style={{ margin: 50 }}>&nbsp;</div>
            </>
        )
    } else if (selectedEvents.length === 0 && !past && !current) {
        return (
            <>
                <div style={{ display: 'flex', margin: 20, justifyContent: 'center' }}>
                    <em>
                        No hi ha {PROXIMS_ES.toLowerCase()} {event_type}
                    </em>
                </div>
                <div style={{ margin: 50 }}>&nbsp;</div>
            </>
        )
    }
}

export default LlistaEvents;