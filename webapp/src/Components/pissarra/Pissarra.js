import React, { useState, useEffect, useMemo } from 'react';
import panzoom from 'panzoom'
import Caixa from './Caixa'
import Text from './Text';
import './Pissarra.css'

import { getSubdomain } from '../../utils/utils';
import TroncCalculations from './TroncCalculations';

import useDoubleTap from '../../utils/useDoubleTap';
import { isDesktop, isMobile } from 'react-device-detect';
import SETTINGS from '../../SETTINGS';
import { addAddons } from '../editor/EditorApp';

const COLLA = getSubdomain();

const settings_nodoubletap = {
    maxZoom: 4,
    minZoom: 0.25,
    initialZoom: 1,
    zoomDoubleClickSpeed: 1,
};

function Loading({  }) {
    const [dots, setDots] = useState('.');

    useEffect(() => {
        // Change the number of dots every 500ms
        const interval = setInterval(() => {
            setDots(prevDots => (prevDots.length < 3 ? prevDots + '.' : '.'));
        }, 250);

        // Cleanup the interval on unmounting of the component
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    padding: 30,
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    borderRadius: 10,
                }}
            >
                <h1 style={{ color: 'white' }}>
                    Carregant{dots}
                </h1>
            </div>
        </div>
    )
}

function Logo({ opacity, socket, castell, minX, minY, center_pinya }) {
    const [castellName, setCastellName] = useState('');

	const styles = {
		'opacity': opacity*0.2,
        'transform': `translate(${center_pinya[0] + minX - 200}px, ${center_pinya[1] + minY - 200}px)`,
	};

    useEffect(() => {
        if (!castell) return;
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

function PissarraContainer({ children, setCaixaSelected, readonly, setExtended, swiper }) {
    const [pointerPos, setPointerPos] = useState([0,0]);

    const isClick = (ev, pointerPos) => (ev.clientX - pointerPos[0])**2 + (ev.clientY - pointerPos[1])**2 < 25*25;
    const deselectCaixa = (ev, pointerPos) => ev.target === ev.currentTarget && isClick(ev, pointerPos) ? setCaixaSelected(-1) : null;

    const doubleTap = useDoubleTap((event) => {
        // If target is same as current target, return
        if (readonly || event.target !== event.currentTarget) return;

        setExtended(false)
        if (swiper) swiper.slideTo(0, 0);
    }, 300, {
        singleTap: ev => {
            if (!readonly) {
                deselectCaixa(ev, pointerPos);
            }
        }
    });

    return (
        <div 
            className="pissarra-container"
            onPointerDown={ev => setPointerPos([ev.clientX, ev.clientY])}
            {...doubleTap}
        >
            { children }
        </div>
    );
}

const mergeJSONsWithPrefix = (prev, current, prefix) => {
    if (!prefix) {
        return {
            ...prev,
            ...current,
        }
    }

    const maxPilarOnPrev = Object.entries(prev)
        .filter(([key, val]) => 'pilar' in val)
        .map(([key, val]) => val.pilar)
        .reduce((acc, val) => Math.max(acc, val), 0)

    // Fix pilar numbers
    const currentWithFixedPilars = Object.fromEntries(
        Object.entries(current)
            .map(([key, val]) => {
                if ('pilar' in val) {
                    return [key, {
                        ...val,
                        pilar: val.pilar + maxPilarOnPrev + 1
                    }]
                } else {
                    return [key, val]
                }
            })
    )

    // Most right caixa on prev
    const maxCaixaOnPrev = Object.entries(prev)
        .map(([key, val]) => val.box.transform[4] + val.box.width)
        .reduce((acc, val) => Math.max(acc, val), 0)

    // Most left caixa on current
    const minCaixaOnCurrent = Object.entries(currentWithFixedPilars)
        .map(([key, val]) => val.box.transform[4])
        .reduce((acc, val) => Math.min(acc, val), Infinity)

    // Fix caixa positions
    const currentWithFixedCaixes = Object.fromEntries(
        Object.entries(currentWithFixedPilars)
            .map(([key, val]) => {
                return [key, {
                    ...val,
                    box: {
                        ...val.box,
                        transform: [
                            ...val.box.transform.slice(0, 4),
                            val.box.transform[4] - minCaixaOnCurrent + maxCaixaOnPrev + 1,
                            val.box.transform[5]
                        ]
                    }
                }]
            })
    )

    // Add prefix to current's keys
    const currentWithPrefix = Object.fromEntries(
        Object.entries(currentWithFixedCaixes)
            .map(([key, val]) => [`${prefix}_${key}`, val])
    )

    return {
        ...prev,
        ...currentWithPrefix,
    }
}

const mergeAddonsWithPrefix = (prev, current, prefix) => {
    if (!prefix) {
        return {
            ...prev,
            ...current,
        }
    }

    const escaletesWithPrefix = Object.fromEntries(
        Object.entries(current.escaletes || {})
            .map(([key, val]) => [
                `${prefix}_${key}`,
                val.map(esc => `${prefix}_${esc}`)
            ])
    )

    const mergedEscaletes = {
        ...prev.escaletes,
        ...escaletesWithPrefix
    }

    const trepitjacionsWithPrefix = Object.fromEntries(
        Object.entries(current.trepitjacions || {})
            .map(([key, val]) => [
                `${prefix}_${key}`,
                val.map(esc => `${prefix}_${esc}`)
            ])
    )

    const mergedTrepitjacions = {
        ...prev.trepitjacions,
        ...trepitjacionsWithPrefix
    }

    return {
        escaletes: mergedEscaletes,
        trepitjacions: mergedTrepitjacions,
    }
}

function Pissarra(props) {
    const { withAddons, castellBeingImported, isModel, tabs, addons, setAddons, setPestanya, json, setJSON, pestanya, setTabs, socket, posicions, selectedBundle, selectedVersio, setPanzoom, readonly, rotationVal } = props;
    const [transformOrigin, setTransformOrigin] = useState([0., 0.]);
    const [initializationOpacity, setInitializationOpacity] = useState(0);

    const [bundle, setBundle] = useState(null);
    const [nomsColumnesSim, setNomsColumnesSim] = useState(null);

    // Load castell
    useEffect(() => {
        if (!selectedBundle) return;

        socket.emit('.request_bundle', selectedBundle)
        socket.emit('.request_bundle_link', selectedBundle)

        socket.on('.bundle', ({ id, bundle }) => {
            if (id === selectedBundle) {
                setBundle(bundle)
            }
        })

        socket.emit('.request_addons', selectedBundle)

        socket.emit('.load_bundle', selectedBundle);

        socket.on('.bundle_link', ({ id, link }) => {
            if (id === selectedBundle) {
                fetch(link)
                    .then(res => res.json())
                    .then(json => setJSON(json))
                    .catch(e => console.log('NO BUNDLE LINK', e.message))
            }
        })

        socket.on('.loaded_json', (data, id) => {
            if (id === selectedBundle) {
                setJSON(data)
            }
        })

        return () => {
            socket.off('.bundle_link');
            socket.off('.bundle');
        }
    }, [selectedBundle, socket]);

    useEffect(() => {
        if (bundle && bundle.simultani) {
            Object.values(bundle.bundles).forEach(b => {
                socket.emit('.request_addons', b.id, b.part_id)
                socket.emit('.load_bundle', b.id, b.part_id)
            })
        }

        socket.on('.addons', ({ id, addons, part_id }) => {
            const isSimultani = Object.values(bundle?.bundles || {})
                .map(b => b.id)
                .includes(id)

            if (id === selectedBundle || isSimultani) {
                setAddons(prev => mergeAddonsWithPrefix(prev, addons, part_id))
            }
        })

        return () => {
            socket.off('.addons');
        }
    }, [bundle])

    useEffect(() => {
        if (!selectedBundle) return;
        socket.emit('.request_noms_columnes_simultanis', selectedBundle)

        socket.on('.noms_columnes_simultanis', (id, noms) => {
            if (id === selectedBundle) {
                setNomsColumnesSim(noms)
            }
        })

        return () => {
            socket.off('.noms_columnes_simultanis');
        }
    }, [])

    useEffect(() => {
        const pestanyesFound = new Set([
            ...Object.values(json)
                .map(caixa => caixa.pestanya)
                .filter(pestanya => pestanya)
        ])

        const pestanyesMatched = ['Pinya', 'Folre', 'Manilles', 'Puntals', 'Tronc', 'Organització', 'Músics', 'Altres']
            .filter(nom => pestanyesFound.has(nom.toLowerCase()))

        setTabs(
            pestanyesMatched.length > 0 ? [...new Set([...pestanyesMatched])] :
            []
        )
    }, [json])

    useEffect(() => {
        if (tabs?.length > 0) {
            setPestanya(tabs[0])
        } else {
            setPestanya('Pinya')
        }
    }, [tabs?.length])

    // Panzoom
    useEffect(() => {
        const movable = document.querySelector('#movable-content');
        setPanzoom(panzoom(movable, settings_nodoubletap));
        return () => props.panzoom ? props.panzoom.dispose() : null;
    }, []);

    const exports = {
        'caixaSelected': props.caixaSelected,
        'setCaixaSelected': props.setCaixaSelected,
        'castellersInfo': props.castellersInfo,
        'readonly': props.readonly,
        'json': withAddons,
        ...props
    };

    const plantilla_settings = withAddons['settings'] || {};
    const caixes_json = [...Object.entries(withAddons)].filter(el => el[1].type === 'caixa');
    // Pijada dels falcons perquè es vegi tronc + organització
    const pestanyed_caixes = caixes_json.filter(([key, val]) => (COLLA === 'falconsbcn') || (!val?.pestanya && pestanya.toLowerCase() === 'pinya') || val?.pestanya === pestanya.toLowerCase());
    const caixes_keys = pestanyed_caixes.map(el => el[0]);

    const hasCordons = caixes_keys
        .filter(caixa_id => pestanya ? withAddons[caixa_id].pestanya === pestanya?.toLowerCase() || (!withAddons[caixa_id].pestanya && pestanya?.toLowerCase() === 'pinya') : true)
        .filter(caixa_id => withAddons[caixa_id]?.cordo)
        .length > 0

    const longestOccupiedCordo = caixes_keys
        .filter(caixa_id => pestanya ? withAddons[caixa_id].pestanya === pestanya?.toLowerCase() || (!withAddons[caixa_id].pestanya && pestanya?.toLowerCase() === 'pinya') : true)
        .filter(caixa_id => caixa_id in posicions.caixes)
        .filter(caixa_id => withAddons[caixa_id]?.cordo)
        .map(caixa_id => withAddons[caixa_id]?.cordo)
        .sort((a, b) => b - a)[0] || 0

    const showUntil = Math.max(
        longestOccupiedCordo,
        tabs.map(t => t.toLowerCase()).includes('puntals') ? 8 :
        tabs.map(t => t.toLowerCase()).includes('manilles') ? 5 :
        tabs.map(t => t.toLowerCase()).includes('folre') ? 3 :
        2
    )

    const isInPinya = pestanya?.toLowerCase() === 'pinya'

    const caixes =
        useMemo(() =>
            caixes_keys
            .map(caixa_id => {
                const assignat =
                    'clone' in withAddons[caixa_id] && withAddons[caixa_id]['clone'] in posicions.caixes ? posicions.caixes[withAddons[caixa_id]['clone']] :
                    caixa_id in posicions.caixes ? posicions.caixes[caixa_id] :
                    -1

                const targetAssistencia = props.targetAssistencies
                    ?.find(el => el.id === assignat)?.assistencia
                    || "No confirmat"

                const isEscaleta = withAddons[caixa_id]?.escala_a?.length > 0

                const assistencia = props.assistenciesEvent
                    ?.filter(assistencia => assistencia.id === assignat)
                    ?.map(assistencia => assistencia['assistència'])
                    ?.[0]

                const fullAssistencia = props.assistenciesEvent
                    ?.find(assistencia => assistencia.id === assignat)

                return <Caixa
                    key={caixa_id}
                    {...withAddons[caixa_id]}
                    id={caixa_id}
                    boxProps={withAddons[caixa_id]["box"]}    
                    textProps={withAddons[caixa_id]["text"]}  
                    className="noselectable"
                    fill={withAddons[caixa_id].fill || 'white'}
                    assignat={assignat}
                    hasClone={'clone' in withAddons[caixa_id]}
                    fontSize={plantilla_settings.fontSize || 14}
                    targetAssistencia={targetAssistencia}
                    showUntil={isInPinya && hasCordons ? showUntil : 9999}
                    isEscaleta={isEscaleta}
                    assistencia={assistencia}
                    opacity={initializationOpacity}
                    fullAssistencia={fullAssistencia}
                    {...exports}
                />;
            })
        , [JSON.stringify(props.assistenciesEvent), isModel, castellBeingImported, hasCordons, showUntil, initializationOpacity, withAddons, JSON.stringify(posicions), rotationVal, props.castellersInfo, props.caixaSelected, props.arribenTard, props.surtenAviat, props.targetEvent, props.targetAssistencies]);

    const textos_json = [...Object.entries(withAddons)].filter(el => el[1].type === 'text');
    const textos_keys = textos_json.map(el => el[0]);

    const textos = textos_keys.map(text_id => {
        return <Text
            key={text_id}
            id={text_id}
            textValue={withAddons[text_id].value}
            boxProps={withAddons[text_id].box}    
            textProps={withAddons[text_id].text}  
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

    const isLoading = !(caixes_json?.length > 0 && Object.keys(props.castellersInfo).length > 0 && props.assistenciesEvent?.length > 0) || posicions.loading

    useEffect(() => {
        const longestDistBetweenCaixes = { 
            horizontal: maxX - minX + 200, 
            vertical: maxY - minY + 200
        };

        const scale = Math.min(
            window.innerWidth / longestDistBetweenCaixes.horizontal,
            window.innerHeight / longestDistBetweenCaixes.vertical
        ) * 0.9

        if (props.panzoom && !isLoading) {
            // Smoothly zoom to center of screen
            props.panzoom.smoothZoom(
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
    }, [transformOrigin, isLoading])

    if (json === 'NOT_EXISTS') {
        return (
            <div>
                <p>ERROR: la plantilla del castell ({selectedBundle}) no existeix. Crea-la amb el creador de pinyes.</p>
            </div>
        );
    } else {
        return (
            <PissarraContainer {...props}>
                <div id="movable-content">
                    <div id="pissarra-content">
                        {
                            selectedBundle && isLoading && <Loading />
                        }

                        <Logo
                            castell={selectedBundle}
                            loaded={Object.keys(withAddons).length > 0}
                            socket={socket}
                            minX={minX}
                            minY={minY}
                            center_pinya={center_pinya}
                            opacity={initializationOpacity}
                        />

                        <div
                            className='pissarra'
                            style={{
                                transformOrigin: `${transformOrigin[0]}px ${transformOrigin[1]}px`,
                                transform: `translate(${isDesktop && !readonly ? center_pinya[0] - 50 : center_pinya[0]}px, ${isMobile && !readonly ? center_pinya[1] - 50 : center_pinya[1]}px) rotate(${rotationVal}deg)`
                            }}
                        >
                            {caixes}
                            {textos}

                            <TroncCalculations
                                json={withAddons}
                                opacity={initializationOpacity}
                                nomsColumnesSim={nomsColumnesSim}
                                {...props}
                            />
                        </div>
                    </div>
                </div>
            </PissarraContainer>
        );
    }
}

export default Pissarra;
