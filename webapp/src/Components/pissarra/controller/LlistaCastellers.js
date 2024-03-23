import React, { useMemo, useRef } from 'react';
import Casteller from './Casteller';
import BotoNovaPersona from './BotoNovaPersona';
import './LlistaCastellers.css'
import { useState } from 'react';
import { useEffect } from 'react';

import { panToCaixa } from '../PissarraController';
import { isBrowser, isDesktop } from 'react-device-detect';
import { fetchAPI, getSubdomain } from '../../../utils/utils';
import Pressable from '../../other/Pressable';

import SETTINGS from '../../../SETTINGS';
import BotoPestanyaUp from './botons/BotoPestanyaUp';
import BotoPestanyaDown from './botons/BotoPestanyaDown';

const COLLA = getSubdomain();

const titleStyle = {
    margin: 5,
    padding: 5,
    paddingLeft: 10,
    paddingRight: 10,
    fontSize: 16,
}

const normalize = (str) => {
    return String(str)
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")    
        .toLowerCase();
};

const levenshteinDistance = (a, b) => {
    const matrix = [];
    let i, j;

    if (a.length == 0) return b.length;
    if (b.length == 0) return a.length;

    for (i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i-1) == a.charAt(j-1)) {
                matrix[i][j] = matrix[i-1][j-1];
            } else {
                matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1));
            }
        }
    }

    return matrix[b.length][a.length];
};

const searchMatches = (casteller, str, maxDistance = 2) => {
    const fullName = `${casteller.nom} ${casteller.cognom} ${casteller.mote}`;
    const normalizedFullName = normalize(fullName);
    const normalizedStr = normalize(str);
    let totalDistance = 0;

    if (str.length > 0) {
        const words = normalizedFullName.split(/\s+/); // Split by whitespace
        const searchWords = normalizedStr.split(/\s+/); // Split search string by whitespace

        for (let searchWord of searchWords) {
            let closestDistance = Infinity;
            
            for (let word of words) {
                const distance = levenshteinDistance(word.slice(0,Math.min(word.length, searchWord.length)), searchWord);
                closestDistance = Math.min(closestDistance, distance);
            }

            totalDistance += closestDistance;
        }

        return totalDistance <= maxDistance;
    }
    return true;
};

const searchExactMatches = (casteller, str) => {
    const exactName = casteller.mote

    return str.length > 2 ?
        normalize(exactName).includes(normalize(str)) :
        true
}

const sortMatches = (casteller, str) => {
    const mote = casteller.mote || '';
    const nom = casteller.nom || '';
    const cognom = casteller.cognom || '';

    // Function to calculate the score based on the type of match
    const calculateScore = (fieldValue, query) => {
        const normalizedField = normalize(fieldValue);
        const normalizedQuery = normalize(query);

        if (normalizedField === '' || normalizedQuery === '') {
            return 1000; // No match
        }

        if (normalizedField === normalizedQuery) {
            return 1; // Exact match
        } else if (normalizedField.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedField)) {
            return 2; // Start of word match
        } else if (normalizedField.includes(normalizedQuery) || normalizedQuery.includes(normalizedField)) {
            return 3; // Included match
        }
        return 1000; // No match
    };

    const moteScore = calculateScore(mote, str);
    const nomScore = calculateScore(nom, str);
    const cognomScore = calculateScore(cognom, str);

    // Adjust scores to prioritize mote over nom, and nom over cognom
    const adjustedMoteScore = moteScore * 10;
    const adjustedNomScore = nomScore * 100;
    const adjustedCognomScore = cognomScore * 1000;

    return Math.min(adjustedMoteScore, adjustedNomScore, adjustedCognomScore);
}

function BotoShowBuscar({ showBuscar, setNameSearch, setShowBuscar }) {
    const handleClick = () => {
        if (showBuscar) {
            setShowBuscar(prev => !prev);

            // Erase search
            setNameSearch('');
        } else {
            setShowBuscar(prev => !prev);
        }
    }

    return (
        <div onClick={handleClick} className='boto boto-search'>
            { showBuscar ? <>❌</> : <>🔍</> }
        </div>
    )
}

function LlistaCastellers(props) {
    const [panBackToSelected, setPanBackToSelected] = useState(false);
    const [showEtiqueta, setShowEtiqueta] = useState({ "TOTS": true, "FITXATS": true, "ESTAN ARRIBANT": true });

    const { tabs, pestanya, setPestanya, etiquetes, etiquetaUsers, isModel, triggerClick, caixaSelected, arribenTard, surtenAviat, nameSearch, setNameSearch, showBuscar, setShowBuscar, setIsFocused } = props;
    const searchRef = useRef(null)

    const activeSlide = props?.swiper?.realIndex === props?.slideNum

    useEffect(() => panToCaixa(props.caixaSelected, props.panzoom, isBrowser), [panBackToSelected])

    useEffect(() => {
        // Reset search when changing caixa
        setNameSearch('');

        // Focus search when new caixa is selected
        if (caixaSelected !== -1 && activeSlide && isDesktop) {
            setTimeout(() => searchRef?.current?.focus({ preventScroll: true }), 100)
        }

        if (caixaSelected === -1) {
            setShowBuscar(false);
        }
    }, [caixaSelected, activeSlide, triggerClick])

    useEffect(() => {
        if (showBuscar && activeSlide) {
            searchRef?.current?.focus();
        }
    }, [showBuscar, activeSlide])

    useEffect(() => {
        if (nameSearch !== '') {
            setShowBuscar(true);
        }
    }, [nameSearch])

    const castellers = useMemo(() => 
        Object.values(props.assistenciesEvent || {})
            // Don't show hidden
            .filter(c => (nameSearch === '' && props.name !== 'amagats') ? (parseInt(c.hidden) !== 1 || [1, 2].includes(c['assistència'])) : true)
            // Filter by the props' filter
            .filter(c => !isModel && nameSearch === '' ? props.filter(c) : true)
            // Filtrar per nom
            .filter(casteller => searchMatches(casteller, nameSearch))
            // Sort remaining
            .sort((a, b) => a.altura > b.altura ? 1 : -1)
            // Sort matches if searching
            .sort((a, b) => nameSearch !== '' ? (sortMatches(a, nameSearch) > sortMatches(b, nameSearch) ? 1 : -1) : 0)
    , [props.castellersInfo, props.castellerSelected, props.posicions, arribenTard, surtenAviat, nameSearch]);

    const uniqueAssistVals = [...new Set(castellers
        // Get assistencia
        .map(c => c['assistència'])
    )]
        .sort((a, b) => a < b ? 1 : -1);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
    }

    const nExactMatches = Object.values(props.castellersInfo)
        .filter(casteller => searchExactMatches(casteller, nameSearch))
        .length

    const etiqueta = props.json?.[caixaSelected]?.etiqueta;
    const perfil = props.json?.[caixaSelected]?.perfil;

    useEffect(() => {
        setShowEtiqueta(prevState => ({
            ['TOTS']: prevState[perfil?.toUpperCase()] === false ? true : prevState['TOTS'],
            ['FITXATS']: prevState[perfil?.toUpperCase()] === false ? true : prevState['FITXATS'],
            ['ESTAN ARRIBANT']: prevState[perfil?.toUpperCase()] === false ? true : prevState['ESTAN ARRIBANT'],
            [perfil?.toUpperCase()]: true,
        }))
    }, [perfil])

    return (
        <>
            <header style={{ paddingTop: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
                    { !showBuscar && <div className='llista-name'><span>{(props.name || '').toUpperCase()}</span></div> }
                    {/* <BotoNovaPersona showIf={(!showBuscar)} {...props} /> */}

                    { !showBuscar && <BotoPestanyaUp full={false} tabs={tabs} pestanya={pestanya} setPestanya={setPestanya} {...props} /> }
                    { !showBuscar && <BotoPestanyaDown full={false} tabs={tabs} pestanya={pestanya} setPestanya={setPestanya} {...props} /> }

                    {
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            position: showBuscar ? 'relative' : 'absolute',
                            left: showBuscar ? 'auto' : -1000,
                        }}>
                            <input
                                // autoFocus={activeSlide}
                                ref={searchRef}
                                placeholder='Busca una persona...'
                                style={{ width: '100%', fontSize: 16, borderRadius: 5, padding: 5, margin: 5, borderStyle: 'solid', borderColor: 'white', borderWidth: 2, backgroundColor: 'transparent' }}
                                value={nameSearch}
                                onInput={e => setNameSearch(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                onKeyDown={(e) => handleKeyPress(e)}
                            />
                        </div>
                    }

                    <BotoShowBuscar
                        showBuscar={showBuscar}
                        setShowBuscar={setShowBuscar}
                        setNameSearch={setNameSearch}
                    />
                </div>
            </header>

            <div
                className="castellers-container"
                style={{
                    paddingLeft: isDesktop ? 50 : 'auto',
                    paddingRight: isDesktop ? 50 : 'auto',
                    paddingTop: isDesktop ? 20 : 'auto',
                }}
            >
                {
                    // uniqueAssistVals
                    [1]
                    .map(assist => {
                        const assistents = castellers.filter(c => uniqueAssistVals.some(val => val === c['assistència']));
                        // const assistName =
                        //     assist === null ? 'No confirmats' :
                        //     assist === 2 ? 'Han arribat' :
                        //     assist === 1 ? 'Venen' :
                        //     assist === 0 ? 'No venen' :
                        //     'No confirmats'

                        return assistents.length > 0 && (
                            <div key={uniqueAssistVals} style={{ padding: isBrowser ? 10 : 20 }}>
                                {/* { (uniqueAssistVals.length > 1 || nameSearch !== '') && <div style={titleStyle} className="assist">{assistName} <hr /></div> } */}

                                {
                                    (
                                        (props.name === 'etiquetes' && nameSearch === '') ?
                                            etiquetes
                                                .map(({ id }) => etiquetaUsers?.[id])
                                                .filter(etiquetaUsers => etiquetaUsers?.castellers?.length > 0)
                                                // .concat([{
                                                //     perfil: 'Canalla',
                                                //     castellers: castellers.filter(c => parseInt(c.canalla) !== 0)
                                                // }, {
                                                //     perfil: 'Novell',
                                                //     castellers: castellers.filter(c => c?.mote?.includes('#'))
                                                // }, {
                                                //     perfil: 'Músic',
                                                //     castellers: castellers.filter(c => parseInt(c.music) !== 0)
                                                // }])
                                                // Sort by perfil
                                                .sort((a, b) => {
                                                    if (a.perfil === 'Tots') return -1;
                                                    if (b.perfil === 'Tots') return 1;

                                                    return a.perfil.localeCompare(b.perfil);
                                                })
                                            :
                                        (props.name === 'confirmats' && nameSearch === '') ?
                                            [{
                                                perfil: 'Fitxats',
                                                castellers: castellers.filter(c => c['assistència'] === 2)
                                            },
                                            {
                                                perfil: 'Estan arribant',
                                                castellers: castellers.filter(c => c['assistència'] === 1)
                                            },
                                            {
                                                perfil: 'Fitxats + arribant',
                                                castellers: castellers
                                                    .filter(c => c['assistència'] === 1 || c['assistència'] === 2)
                                            }]
                                        :
                                            [{
                                                perfil: 'Tots',
                                                castellers: castellers
                                                    // .filter(c => !etiquetes.some(e => etiquetaUsers?.[e.id]?.castellers?.some(casteller => casteller.id === c.id)))
                                            }]
                                    )
                                        .map(({ perfil, castellers: castellersInPerfil }) => {
                                            const castellersInPerfilOnAssist = assistents
                                                .filter(casteller => castellersInPerfil.map(u => u.id).includes(casteller.id))

                                            const usersInAssist = castellersInPerfil.filter(user => assistents.map(c => c.id).includes(user.id));
                                            const printedCastellers = castellersInPerfilOnAssist.filter(casteller => casteller.id in props.posicions.castellers);
                                            const castellersQueFaltenLength = castellersInPerfilOnAssist.length - printedCastellers.length;

                                            const etiquetaHasToBeShown = nameSearch !== '' || showEtiqueta?.[perfil?.toUpperCase()]

                                            const llistaCastellers = assistents
                                                .filter(casteller => castellersInPerfil.map(u => u.id).includes(casteller.id))
                                                .sort((a, b) => {
                                                    if (nameSearch !== '') {
                                                        return sortMatches(a, nameSearch) > sortMatches(b, nameSearch) ? 1 : -1;
                                                    }

                                                    // if (a['assistència'] < b['assistència']) return 1;
                                                    // if (a['assistència'] > b['assistència']) return -1;
                                                    if (isNaN(a.altura)) return 1;
                                                    if (isNaN(b.altura)) return -1;
                                                    return a.altura - b.altura;
                                                })

                                            const primerDeLaLlista = llistaCastellers?.[0]

                                            return usersInAssist.length > 0 && (
                                                <>
                                                    <Pressable
                                                        onPressColor={'rgba(0,0,0,0.05)'}
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'row',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            cursor: 'pointer', // Makes the div look clickable
                                                            paddingTop: 10,
                                                            paddingBottom: 10,
                                                            backgroundColor: 'transparent',
                                                        }}
                                                        onClick={() => setShowEtiqueta(prevState => ({...prevState, [perfil?.toUpperCase()]: !prevState[perfil?.toUpperCase()]}))}
                                                    >
                                                        <div>
                                                            {/* Replace button with an arrow icon */}
                                                            {etiquetaHasToBeShown ? '↓' : '→'} {/* Unicode arrows, or use an icon library */}
                                                        </div>

                                                        <div>
                                                            {
                                                                perfil !== 'Tots' ? <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                    {/* <span>Amb l'etiqueta </span> */}
                                                                    <strong className="assist">
                                                                        {perfil?.toUpperCase()}
                                                                    </strong>
                                                                    <span
                                                                        style={{
                                                                            padding: 5,
                                                                            borderRadius: 5,
                                                                            backgroundColor: SETTINGS(COLLA).color,
                                                                            color: 'white',
                                                                            marginLeft: 10,
                                                                            fontSize: 14,
                                                                        }}
                                                                    >
                                                                        {
                                                                            castellersQueFaltenLength > 0 ? castellersQueFaltenLength :
                                                                            <>✓</>
                                                                        }
                                                                    </span>
                                                                </div> : <>
                                                                    <span>Tots els castellers</span>
                                                                    <span
                                                                        style={{
                                                                            padding: 5,
                                                                            borderRadius: 5,
                                                                            backgroundColor: SETTINGS(COLLA).color,
                                                                            color: 'white',
                                                                            marginLeft: 10,
                                                                            fontSize: 14,
                                                                        }}
                                                                    >
                                                                        {
                                                                            castellersQueFaltenLength > 0 ? castellersQueFaltenLength :
                                                                            <>✓</>
                                                                        }
                                                                    </span>
                                                                </>
                                                            }
                                                        </div>
                                                    </Pressable>

                                                    {
                                                        etiquetaHasToBeShown && <div>
                                                            {
                                                                nameSearch !== '' &&
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        flexDirection: 'column',
                                                                        margin: 10,
                                                                    }}
                                                                >
                                                                    <Casteller
                                                                        key={primerDeLaLlista.id}
                                                                        isCanalla={!!parseInt(primerDeLaLlista.canalla)}
                                                                        isNovell={primerDeLaLlista?.mote?.includes('#') || false}
                                                                        altura={isNaN(primerDeLaLlista.altura) ? null : primerDeLaLlista.altura}
                                                                        altura_mans={props.castellersInfo[primerDeLaLlista.id]?.altura_mans}
                                                                        selected={props.castellerSelected === primerDeLaLlista.id}
                                                                        printed={primerDeLaLlista.id in props.posicions.castellers}
                                                                        panBack={setPanBackToSelected}
                                                                        arribaTard={arribenTard.includes(primerDeLaLlista.id)}
                                                                        surtAviat={surtenAviat.includes(primerDeLaLlista.id)}
                                                                        matched={true}
                                                                        {...primerDeLaLlista}
                                                                        {...props}
                                                                    />
                                                                </div>
                                                            }
                                                            <div className="castellers">
                                                                {
                                                                    llistaCastellers
                                                                        .filter(casteller => nameSearch !== '' ? casteller.id !== primerDeLaLlista.id : true)
                                                                        .map(casteller =>
                                                                            <Casteller
                                                                                key={casteller.id}
                                                                                isCanalla={!!parseInt(casteller.canalla)}
                                                                                isNovell={casteller?.mote?.includes('#') || false}
                                                                                altura={isNaN(casteller.altura) ? null : casteller.altura}
                                                                                altura_mans={props.castellersInfo[casteller.id]?.altura_mans}
                                                                                selected={props.castellerSelected === casteller.id}
                                                                                printed={casteller.id in props.posicions.castellers}
                                                                                panBack={setPanBackToSelected}
                                                                                arribaTard={arribenTard.includes(casteller.id)}
                                                                                surtAviat={surtenAviat.includes(casteller.id)}
                                                                                assist={casteller['assistència']}
                                                                                {...casteller}
                                                                                {...props}
                                                                            />
                                                                        )
                                                                }
                                                            </div>
                                                        </div>
                                                    }

                                                        {/* {
                                                            assistents
                                                                .filter(casteller => castellers.map(u => u.id).includes(casteller.id))
                                                                .length === 0 && <div style={{ margin: 10 }}>No hi ha cap casteller a <strong>{assistName?.toUpperCase()}</strong> amb aquesta etiqueta</div>
                                                        } */}

                                                    <hr />
                                                </>
                                            )
                                        })
                                }
                            </div>
                        )
                    })
                }

                {
                    nameSearch !== '' &&
                    // nameSearch !== '' && nameSearch[0] === nameSearch[0].toUpperCase() && nExactMatches === 0 &&
                    <div>
                        <div style={titleStyle} className="assist">
                            O crea un nou casteller amb el nom <b>{nameSearch}</b>
                            <hr />
                        </div>

                        <div className="castellers">
                            <Casteller
                                key={'new-casteller'}
                                isCanalla={false}
                                isNovell={false}
                                altura={null}
                                altura_mans={null}
                                selected={false}
                                printed={false}
                                panBack={setPanBackToSelected}
                                arribaTard={false}
                                surtAviat={false}
                                displayName={nameSearch}
                                {...props}
                                isNew={true}
                            />
                        </div>
                    </div>
                }
            </div>
        </>
    );
}

export default LlistaCastellers;