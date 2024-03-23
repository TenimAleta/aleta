import React, { useState, useEffect, useMemo } from 'react';
import panzoom from 'panzoom'
import Caixa from './Caixa'
import Text from './Text';
import './Pissarra.css'

import logo from './data/logo.png';
import { isDesktop, isMobile } from 'react-device-detect';
import { getSubdomain } from '../../utils/utils';
import SETTINGS from '../../SETTINGS';
import TroncCalculations from './TroncCalculations';

const COLLA = getSubdomain()

const settings_nodoubletap = {
    maxZoom: 4,
    minZoom: 0.25,
    initialZoom: 1,
    zoomDoubleClickSpeed: 1,
    initialX: -100,
    initialY: 600
};

function Logo({ opacity, socket, castell, minX, minY, center_pinya }) {
    const [castellName, setCastellName] = useState('');

	const styles = {
		'opacity': opacity*0.2,
        'transform': `translate(${minX - 300}px, ${minY - 300}px)`,
	};

    useEffect(() => {
        socket.emit('.request_bundle', castell)
        socket.on('.bundle', ({ id, bundle }) => id === castell && setCastellName(bundle.nom))

        return () => socket.off('.bundle')
    }, [castell])

    useEffect(() => {
        document.title = `${castellName} - Aleta`
    }, [castellName])

	return (
		<div style={{
            ...styles,
            display: 'flex',
            position: 'absolute',
        }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
			    <img src={`/logos/${COLLA}.png`} width='250px' />
            </div>

            <div
                style={{
                    maxWidth: 300,
                    marginLeft: 30,
                }}
            >
                <h1>{castellName}</h1>
                <h2>{SETTINGS(COLLA).fullname}</h2>
            </div>
		</div>
	);
}

function PissarraContainer({ children, setCaixaSelected, readonly, panzoom, followPosition, setFollowPosition, json, setJsonOutput, setPosition, setSvg, ...props }) {
    const [pointerPos, setPointerPos] = useState([0,0]);

    const transform = panzoom ? panzoom.getTransform() : null;
    
    const floating_go_back_button_style = {
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 100,
        padding: '10px',
        backgroundColor: 'white',
        borderRadius: '5px',
        cursor: 'pointer',
        border: '1px solid black',
        textDecoration: 'none',
        color: 'black',
    };

    // Success notification
    const floating_notification_style = {
        position: 'absolute',
        top: '10px',
        right: '12%',
        zIndex: 100,
        borderRadius: '5px',
        padding: '10px 20px',
        display: 'none',
        backgroundColor: 'rgba(0, 255, 0, 0.25)',
        color: '#777',
    };

    useEffect(() => {
        if (props.notification) {
            setTimeout(() => props.setNotification(null), 3000);
        }
    }, [props.notification])

    return (
        <div 
            className="pissarra-container"

            onPointerUp = {(ev) => {
                if (ev.target.className === 'pissarra-container') {
                    setCaixaSelected(-1);
                }
            }}

            // onPointerMove={(ev) => {
            //     if (followPosition) {
            //         setPosition({
            //             x: ev.clientX - transform?.x - json[followPosition].box.width/2,
            //             y: ev.clientY - transform?.y - json[followPosition].box.height/2
            //         })
            //     }
            // }}
            // onPointerUp={(ev) => {
            //     if (!followPosition) return;

            //     setPosition(null)
            //     setFollowPosition(false)
            //     // panzoom.resume()

            //     setJsonOutput(prev => {
            //         const modified = {
            //             ...prev[followPosition],
            //             box: {
            //                 ...prev[followPosition].box,
            //                 transform: [
            //                     ...prev[followPosition].box.transform.slice(0, 4),
            //                     -transform?.x + ev.clientX - prev[followPosition].box.width/2,
            //                     -transform?.y + ev.clientY - prev[followPosition].box.height/2
            //                 ]
            //             }
            //         };

            //         return {...prev, [followPosition]: modified};
            //     })
            // }}
        >
            <a href="/editor" style={floating_go_back_button_style}>
                ⬅️ Tornar
            </a>

            <div style={{...floating_notification_style, ['display']: props.notification ? 'block' : 'none'}}>
                {props.notification}
            </div>

            { children }
        </div>
    );
}

function PissarraEditor(props) {
    const { selectedBundle, pestanya, socket, json, selectedCastellPart, setPanzoom, readonly } = props;
    const [followPosition, setFollowPosition] = useState(false);
    const [position, setPosition] = useState(null);
    const [transformOrigin, setTransformOrigin] = useState([0,0]);
    const [initializationOpacity, setInitializationOpacity] = useState(0);

    // Panzoom
    useEffect(() => {
        const movable = document.querySelector('#movable-content');
        setPanzoom(panzoom(movable, settings_nodoubletap));
        return () => props.pz ? props.pz.dispose() : null;
    }, []);

    const exports = {
        'caixaSelected': props.caixaSelected,
        'setCaixaSelected': props.setCaixaSelected,
        'castellersInfo': props.castellersInfo,
        'readonly': props.readonly,
        'followPosition': followPosition,
        'setFollowPosition': setFollowPosition,
        'position': position,
        'setPosition': setPosition,
        ...props
    };

    const plantilla_settings = json['settings'] || {};
    const caixes_json = [...Object.entries(json)].filter(el => el[1] && el[1].type === 'caixa');
    const perfiled_caixes = caixes_json.filter(([key, val]) => !pestanya ? true : val?.pestanya.toLowerCase() === pestanya.toLowerCase());
    const caixes_keys = perfiled_caixes.map(el => el[0]);

    const escaletes = [...Object.entries(json)]
        .filter(el => el[1] && el[1].type === 'caixa')
        .filter(([id, attrs]) => attrs.escala_a && Array.isArray(attrs.escala_a) && attrs.escala_a.length > 0)
        .map(([id, attrs]) => attrs.escala_a.map(escalat => ({
            escalador: id,
            escalat: escalat
        })))
        .flat()

    const trepitjacions = [...Object.entries(json)]
        .filter(el => el[1] && el[1].type === 'caixa')
        .filter(([id, attrs]) => attrs.trepitja_a && Array.isArray(attrs.trepitja_a) && attrs.trepitja_a.length > 0)
        .map(([id, attrs]) => attrs.trepitja_a.map(trepitjat => ({
            trepitjador: id,
            trepitjat: trepitjat
        })))
        .flat()

    const caixes = caixes_keys.map(caixa_id => {
        const trepitjadors = trepitjacions
            .filter(trepitjacio => trepitjacio.trepitjat === caixa_id)
            .map(trepitjacio => trepitjacio.trepitjador)

        const isTrepitjador = json[caixa_id]?.trepitja_a?.length > 0

        const escaladors = escaletes
            .filter(escaleta => escaleta.escalat === caixa_id)
            .map(escaleta => escaleta.escalador)

        const isEscaleta = json[caixa_id]?.escala_a?.length > 0

        return <Caixa
            {...json[caixa_id]}
            {...exports}
            key={caixa_id}
            id={caixa_id}
            boxProps={json[caixa_id]["box"]}    
            textProps={json[caixa_id]["text"]}  
            className="noselectable"
            fill={json[caixa_id].fill || 'white'}
            disabled={'clone' in json[caixa_id]}
            fontSize={plantilla_settings.fontSize || 14}
            opacity={initializationOpacity}
            escaladors={escaladors}
            trepitjadors={trepitjadors}
            isEscaleta={isEscaleta}
            isTrepitjador={isTrepitjador}
        />;
    })

    const textos_json = [...Object.entries(json)].filter(el => el[1] && el[1].type === 'text');
    const textos_keys = textos_json.map(el => el[0]);

    const textos = textos_keys.map(text_id => {
        return <Text
            key={text_id}
            id={text_id}
            textValue={json[text_id].value}
            boxProps={json[text_id].box}    
            textProps={json[text_id].text}  
        />;
    });

    useEffect(() => {
        const baixos = caixes_json
            .filter(([key, val]) => val?.perfil?.toLowerCase() === 'baix')

        const centre_baixos = baixos.length > 0 ?
            baixos
                .filter(([key, val]) => val?.box?.transform)
                .map(([key, val]) => val.box.transform)
                .reduce((vsum, t) =>
                    [vsum[0] + t[4], vsum[1] + t[5]]
                , [0, 0])
                .map(el => el / baixos.length)
                .map(el => el + baixos[0][1].box.width / 2)
        :
            caixes_json
                .filter(([key, val]) => val?.box?.transform)
                .map(([key, val]) => val.box)
                .map(({ transform, width, height }) => {
                    const [a, b, c, d, e, f] = transform;
                    const theta = Math.atan2(b, a); // rotation angle
            
                    // rotate the width and height vectors by theta
                    const centerOffsetX = (width / 2) * Math.cos(theta) - (height / 2) * Math.sin(theta);
                    const centerOffsetY = (width / 2) * Math.sin(theta) + (height / 2) * Math.cos(theta);

                    // apply the affine transformation to find the center point in the global coordinates
                    const centerX = a * centerOffsetX + c * centerOffsetY + e;
                    const centerY = b * centerOffsetX + d * centerOffsetY + f;
            
                    return [centerX, centerY];
                })
                .reduce((vsum, t) => [vsum[0] + t[0], vsum[1] + t[1]], [0, 0])
                .map(el => caixes_json.length === 0 ? 0 : el / caixes_json.length)

        setTransformOrigin(centre_baixos)
    }, [caixes_json.length])

    const center_screen = [window.innerWidth / 2, window.innerHeight / 2]
    const center_pinya = [
        center_screen[0] - transformOrigin[0],
        center_screen[1] - transformOrigin[1],
    ]

    const caixesPositions = caixes_json
        .filter(([key, val]) => val?.box?.transform)
        .map(([key, val]) => val.box.transform)
        .map(([a, b, c, d, e, f]) => [e, f])

    const {minX, maxX, minY, maxY} = caixesPositions.reduce((acc, [x, y]) => ({
        minX: Math.min(acc.minX, x),
        maxX: Math.max(acc.maxX, x),
        minY: Math.min(acc.minY, y),
        maxY: Math.max(acc.maxY, y)
    }), {minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity});

    useEffect(() => {
        const longestDistBetweenCaixes = { 
            horizontal: maxX - minX + 200, 
            vertical: maxY - minY + 200
        };

        const scale = Math.min(
            window.innerWidth / longestDistBetweenCaixes.horizontal,
            window.innerHeight / longestDistBetweenCaixes.vertical
        ) * 0.9

        if (props.pz && caixes_json.length > 0) {
            // Smoothly zoom to center of screen
            props.pz.smoothZoom(
                center_screen[0],
                center_screen[1],
                isMobile ? 0.9 : scale
            )

            // Get opacity to 1
            const interval = setInterval(() => {
                setInitializationOpacity(prev => Math.min(prev + 0.05, 1))
            }, 100)

            setTimeout(() => {
                clearInterval(interval)
                setInitializationOpacity(1)
            }, 2000)
        }
    }, [
        JSON.stringify(transformOrigin) === JSON.stringify([0,0]),
        caixes_json.length === 0,
        props.pz
    ])

    if (json === 'NOT_EXISTS') {
        return (
            <div>
                <p>ERROR: la plantilla del castell ({selectedCastellPart}) no existeix. Crea-la amb el creador de pinyes.</p>
            </div>
        );
    } else {
        return (
            <PissarraContainer setCaixaSelected={props.setCaixaSelected} {...exports}>
                <div id="movable-content">
                    <div id="pissarra-content">
                        <div
                            className='pissarra'
                            style={{
                                transformOrigin: `${transformOrigin[0]}px ${transformOrigin[1]}px`,
                                transform: `translate(${isDesktop && !readonly ? center_pinya[0] - 50 : center_pinya[0]}px, ${isMobile && !readonly ? center_pinya[1] - 50 : center_pinya[1]}px) rotate(${0}deg)`
                            }}
                        >
                            {
                                selectedBundle && (
                                    <Logo
                                        castell={selectedBundle}
                                        loaded={Object.keys(json).length > 0}
                                        socket={socket}
                                        minX={minX}
                                        minY={minY}
                                        center_pinya={center_pinya}
                                        opacity={initializationOpacity}
                                    />
                                )
                            }
                            {caixes}
                            {textos}

                            {
                                selectedBundle && <TroncCalculations
                                    json={json}
                                    opacity={initializationOpacity}
                                    {...props}
                                />
                            }
                        </div>
                    </div>
                </div>
            </PissarraContainer>
        );
    }
}

export default PissarraEditor;
