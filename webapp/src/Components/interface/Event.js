import { isBrowser } from "react-device-detect";
import AssistButton from "./AssistButton";
import ResumAssistencia from "./assistencia/ResumAssistencia";
import styles from "./Events.styles";
import Info from "./info/Info";
import LlistaProves, { calculateProvesHores } from "./proves/LlistaProves";
import ResumTroncs from "./troncs/ResumTroncs";

import React, { useState } from 'react';
import { getSubdomain } from "../../utils/utils";
import { applyTimeZone } from "./assistencia/LlistaAssistencies";
import HideButton from "./info/HideButton";
import Pressable from "../other/Pressable";

const COLLA = getSubdomain();

function BotoProjector({ event, type }) {
    const [styleState, setStyleState] = useState('normal');

    const styles = {
        boto_projector: {
            display: 'inline-block',
            padding: '10px 20px',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            transition: 'background-color 0.3s',
            flex: 1,
            marginTop: '10px',
            textAlign: 'center',
            backgroundColor: '#f2f2f2',
            color: '#000',
        },
        input_projector: {
            width: '88%',
            padding: '10px 20px',
            borderRadius: '4px',
            fontSize: '12px',
            transition: 'background-color 0.3s',
            marginTop: '10px',
            textAlign: 'center',
            backgroundColor: '#f2f2f2',
            color: '#000',
            direction: 'rtl'
        }
    };

    const copyToClipboard = async (e) => {
        e.stopPropagation(); // Prevent triggering the input's onClick event
        const textToCopy = `https://${COLLA}.tenimaleta.cat/${type}/${event}`;

        try {
          await navigator.clipboard.writeText(textToCopy);
        } catch (err) {
          console.error('Failed to copy text: ', err);
        }
    };            

    const handleMouseEnter = () => {
        setStyleState('hover');
    };

    const handleMouseLeave = () => {
        setStyleState('normal');
    };

    const handleMouseDown = () => {
        setStyleState('active');
    };

    const handleMouseUp = () => {
        setStyleState('hover');
    };

    const handleFocus = () => {
        setStyleState('focus');
    };

    const handleBlur = () => {
        setStyleState('normal');
    };

    const [copied, setCopied] = useState(false);

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                flexDirection: isBrowser ? 'row' : 'column',
            }}
        >
            <a
                href={`/${type}/${event}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    ...styles.boto_projector,
                }}
                onPointerEnter={handleMouseEnter}
                onPointerLeave={handleMouseLeave}
                onPointerDown={handleMouseDown}
                onPointerUp={handleMouseUp}
                onFocus={handleFocus}
                onBlur={handleBlur}
            >
                Entrar a mode projecció 🎥
            </a>

            <div style={{ position: 'relative', flex: 2, display: 'flex', justifyContent: 'center' }}>
                <input
                    onClick={(e) => e.target.select()}
                    type="text"
                    value={`https://${COLLA}.tenimaleta.cat/${type}/${event}`}
                    style={{
                        ...styles.input_projector,
                    }}
                    readOnly
                />

                { isBrowser && <button
                    onClick={(e) => {
                        copyToClipboard(e);
                        setCopied(true);
                    }}
                    style={{
                        position: 'absolute',
                        right: 4,
                        top: '60%',
                        transform: 'translateY(-50%)',
                        backgroundColor: '#f2f2f2',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '12px',
                        padding: '5px',
                        cursor: 'pointer',
                        color: 'black'
                    }}
                >
                    {copied ? 'Copiat!' : 'Copiar'}
                </button> }
            </div>
        </div>
    );
}

function Check({ event_id, setIgnoredEvents }) {
    return (
        <Pressable
            onClick={() => {
                setIgnoredEvents(prev => ({ ...prev, [event_id]: true }))
            }}
            style={{
                position: 'absolute',
                top: 25,
                right: 25,
            }}
        >
            ✅
        </Pressable>
    )
}

function Event(props) {
    const defaultHoraInici = applyTimeZone(props['data-inici'])

    const [caixesCastellers, setCaixesCastellers] = useState({});
    const [order, setOrder] = useState(false);
    const [assistencies, setAssistencies] = useState([]);
    const [proves, setProves] = useState({ 'event': -1, 'private': [], 'public': [], 'admin': [] });
    const [horaInici, setHoraInici] = useState(defaultHoraInici)
    const horesProves = calculateProvesHores(proves, order, props.durations, horaInici)

    return (
        <div className={props.past ? 'past-event' : ''} style={{...styles.event_content, ...{ backgroundColor: props.past ? 'rgb(245, 255, 245)' : 'white' }, ...(
            props.isModels ? {
                borderStyle: 'solid',
                borderWidth: 1,
                borderColor: 'black',
            } : {}
        )}}>
            { props.past && <Check {...props} /> }

            <div style={styles.event_info}>
                {
                    !props.isModels && <HideButton {...props} />
                }
                <Info {...props} />
                {
                    props.isModels ? null : <>
                        <ResumAssistencia {...props} />
                        <BotoProjector {...props} />
                        <ResumTroncs
                            data={caixesCastellers}
                            order={order}
                            assistencies={assistencies}
                            horesProves={horesProves}
                            {...props}
                        />
                    </>
                }
            </div>
            <div style={styles.event_proves}>
                <LlistaProves
                    proves={proves}
                    setProves={setProves}
                    horaInici={horaInici}
                    setHoraInici={setHoraInici}
                    caixesCastellers={caixesCastellers}
                    setCaixesCastellers={setCaixesCastellers}
                    order={order}
                    setOrder={setOrder}
                    assistencies={assistencies}
                    setAssistencies={setAssistencies}
                    {...props}
                />
            </div>
        </div>
    );
}

export default Event;