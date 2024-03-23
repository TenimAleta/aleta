import React, { useState, useEffect, useCallback } from 'react';
import {isBrowser, isDesktop, isMobile} from 'react-device-detect';
import BotoExportar from './botons/BotoExportar';
import BotoUndo from './botons/BotoUndo';
import LlistaCastellers from './LlistaCastellers';
import './Controller.css'

import { fetchAPI } from '../../../utils/utils';

import Swiper from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import BotoAssistencia from './botons/BotoAssistencia';
import BotoAjuntament from './botons/BotoAjuntament';
import LlistaAssistencies from '../../interface/assistencia/LlistaAssistencies';
import BotoChat from './botons/BotoChat';
import ChatPopup from '../../chat/ChatPopup';
import BotoPestanya from './botons/BotoPestanya';
import BotoPestanyaUp from './botons/BotoPestanyaUp';
import BotoPestanyaDown from './botons/BotoPestanyaDown';

const saveChange = (props) => {
    const { socket, castellerSelected, caixaSelected, posicions } = props;

    const action_id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // If casteller was already in a caixa, remove it
    if (castellerSelected in posicions.castellers) {
        socket.emit('.save_change', `${posicions.castellers[castellerSelected]},_EMPTY_`, action_id);
    }

    // Emit change to server-side (bounces to all users)
    socket.emit('.save_change', `${caixaSelected},${castellerSelected}`, action_id);
};

const erasePosition = (props) => {
    const { castell, socket, caixaSelected, setCaixaSelected } = props;
    const action_id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    socket.emit('.save_change', `${caixaSelected},_EMPTY_`, action_id);
    setCaixaSelected(-1);
};

const backToNormal = (props, setNameSearch, setShowBuscar) => {
    const { setCastellerSelected, setCaixaSelected } = props;

    // Reset search params
    setNameSearch('')
    setShowBuscar(false)

    // Deselect selected casteller and caixa
    setCastellerSelected(-1);
    setCaixaSelected(-1);
};

const confirmatsFilter = casteller => (casteller["assistència"] === 1 || casteller["assistència"] === 2) && parseInt(casteller.canalla) === 0
const noConfirmatsFilter = casteller => casteller["assistència"] !== 0 && casteller["assistència"] !== 1 && casteller["assistència"] !== 2 && parseInt(casteller.canalla) === 0
const noVenenFilter = casteller => casteller["assistència"] === 0 && parseInt(casteller.canalla) === 0
const canallaFilter = casteller  => parseInt(casteller.canalla) === 1
const novellFilter = casteller => !!casteller?.mote?.includes('#')
const amagatFilter = casteller => parseInt(casteller.hidden) === 1

function Controller(props) {
    const { setLastLlista, assistenciesEvent, isModel, tabs, pestanya, setPestanya, socket, extended, setExtended, ajuntament, setAjuntament, castellerSelected, posicions, lastCaixes, caixaSelected, swiper, setSwiper, castell } = props;

    const [popupAssistsClosed, setPopupAssistsClosed] = useState(true);
    const [popupChatClosed, setPopupChatClosed] = useState(true);

    const [nameSearch, setNameSearch] = useState('')
    const [showBuscar, setShowBuscar] = useState(false)
    const [isFocused, setIsFocused] = useState(false)

    const [etiquetes, setEtiquetes] = useState([]);
    const [etiquetaUsers, setEtiquetaUsers] = useState([]);

    useEffect(() => {
        setSwiper(new Swiper(".controllerSwiper", {
            threshold: 20,
            initialSlide: 0,
            allowTouchMove: true,

            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
        }));
    }, []);

    useEffect(() => {
        if (swiper) {
            swiper.on('transitionStart', function() {
                // If slide is not 0, extend
                setExtended(swiper.realIndex > 0)

                // Aesthetic change
                setTimeout(
                    () => {
                        document.querySelector('.activa')?.classList.remove('activa')
                        document.querySelector('.swiper-slide.swiper-slide-active').querySelector('.castellers-container')?.classList.add('activa')
                    },
                    50
                )
            });

            swiper.on('transitionEnd', function() {
                if (swiper.realIndex > 0) {
                    setLastLlista(swiper.realIndex)
                }
            });
        }
    }, [swiper])

    useEffect(() => {
        fetchAPI('/etiquetes', setEtiquetes)
    }, [])

    useEffect(() => {
        etiquetes.forEach(etiqueta => {
            fetchAPI(
                `/etiqueta_users/${etiqueta.id}`,
                users => setEtiquetaUsers(
                    prev => ({
                        ...prev,
                        [etiqueta.id]: {
                            castellers: users,
                            perfil: etiqueta.nom
                        }
                    })
                )
            )
        })
    }, [
        etiquetes
    ])

    const handleKeyDown = (e) => {
        if (isFocused) return;
        if (isMobile) return;

        if (extended && caixaSelected !== -1) {
            // If key is backspace, remove last letter from nameSearch
            if (e.key === 'Backspace') {
                setNameSearch(prev => prev.slice(0, -1))
            }
            // If key is enter, search for casteller
            else if (e.key === 'Enter') {
                const castellers = document.querySelectorAll('.castellers-container.activa .casteller');
                const castellersArray = Array.from(castellers);
    
                // const casteller = castellersArray.find(casteller => casteller.innerText.toLowerCase().includes(nameSearch.toLowerCase()));
                const casteller = castellersArray?.[0]

                if (casteller && nameSearch !== '') {
                    casteller.click();
                }
            }
            // If key is escape, close search
            else if (e.key === 'Escape') {
                backToNormal(props, setNameSearch, setShowBuscar);
            }
            // // If key is space, add space to nameSearch
            // else if (e.key === ' ') {
            //     setNameSearch(prev => prev + ' ')
            // }
            // // If key is a letter, add it to nameSearch
            // else if (e.key.match(/[a-z]/i) && e.key.length === 1) {
            //     setNameSearch(prev => prev + e.key)
            //     setShowBuscar(true)
            // }
        }

        if (caixaSelected !== -1) {
            // If key is delete, remove casteller from caixa
            if (e.key === 'Delete') {
                erasePosition(props);
            }
        }
    }

    useEffect(() => {
        document.addEventListener('keyup', handleKeyDown)

        return () => {
            document.removeEventListener('keyup', handleKeyDown)
        }
    }, [extended, caixaSelected, isFocused, nameSearch])

    useEffect(() => {
        if (castellerSelected > -1 && caixaSelected !== -1) {
            saveChange(props);
            backToNormal(props, setNameSearch, setShowBuscar);
        }
    }, [castellerSelected, caixaSelected]);

    useEffect(() => {
        const caixaEmpty = !(caixaSelected in posicions.caixes);

        const areSame = lastCaixes.prev === lastCaixes.current;
        const areBothCaixes = lastCaixes.prev !== -1 && lastCaixes.current !== -1;
        const prevHadAssigned = lastCaixes.prev in posicions.caixes;
        const possibleSwap = !areSame && areBothCaixes && prevHadAssigned;

        if (caixaSelected !== -1 && caixaEmpty && !possibleSwap) {
            setExtended(true)
            if (swiper && swiper.realIndex === 0) swiper.slideTo(1, 0);
        } else {
            // setExtended(false)
            // if (swiper) swiper.slideTo(0, 0);
        }
    }, [lastCaixes]);

    const nNovells = Object
        .values(props.castellersInfo)
        .filter(novellFilter)
        .length;

    return (
        <>
            <LlistaAssistencies noInfo withTarget etiquetes={etiquetes} etiquetaUsers={etiquetaUsers} setEtiquetaUsers={setEtiquetaUsers} assistencies={assistenciesEvent || []} popupClosed={popupAssistsClosed} setPopupClosed={setPopupAssistsClosed} event={props.selectedEvent} {...props} />
            <ChatPopup popupClosed={popupChatClosed} setPopupClosed={setPopupChatClosed} {...props} />

            <div id="controller-container" className={`swiper controllerSwiper ${extended ? 'extended' : ''}`}>
                <div className="swiper-wrapper">
                    <div className="swiper-slide botons">
                        {
                            !isModel && <>
                                <BotoUndo {...props} />
                                <BotoExportar {...props} />
                                <BotoAssistencia setPopupClosed={setPopupAssistsClosed} {...props} />
                                <BotoAjuntament ajuntament={ajuntament} {...props} />
                                {/* { isBrowser && <BotoChat setPopupClosed={setPopupChatClosed} {...props} /> } */}   
                            </>
                        }
                        <BotoPestanyaUp full={false} tabs={tabs} pestanya={pestanya} setPestanya={setPestanya} {...props} />
                        <BotoPestanyaDown full={false} tabs={tabs} pestanya={pestanya} setPestanya={setPestanya} {...props} />
                    </div>

                    {
                        !isModel ? <>
                            <div className="swiper-slide llista-container castellers-confirmats">
                                <LlistaCastellers isModel={isModel} slideNum={1} name="etiquetes" etiquetaUsers={etiquetaUsers} etiquetes={etiquetes} filter={confirmatsFilter} {...props} nameSearch={nameSearch} setNameSearch={setNameSearch} showBuscar={showBuscar} setShowBuscar={setShowBuscar} isFocused={isFocused} setIsFocused={setIsFocused} json={props.json} />
                            </div>
                            <div className="swiper-slide llista-container castellers-confirmats">
                                <LlistaCastellers isModel={isModel} slideNum={2} name="confirmats" etiquetaUsers={etiquetaUsers} etiquetes={etiquetes} filter={confirmatsFilter} {...props} nameSearch={nameSearch} setNameSearch={setNameSearch} showBuscar={showBuscar} setShowBuscar={setShowBuscar} isFocused={isFocused} setIsFocused={setIsFocused} json={props.json} />
                            </div>
                            <div className="swiper-slide llista-container castellers-no-confirmats">
                                <LlistaCastellers slideNum={3} name="no confirmats" etiquetaUsers={etiquetaUsers} etiquetes={etiquetes} filter={noConfirmatsFilter} {...props} nameSearch={nameSearch} setNameSearch={setNameSearch} showBuscar={showBuscar} setShowBuscar={setShowBuscar} isFocused={isFocused} setIsFocused={setIsFocused} json={props.json} />
                            </div>

                            <div className="swiper-slide llista-container castellers-no-venen">
                                <LlistaCastellers slideNum={4} name="no venen" etiquetaUsers={etiquetaUsers} etiquetes={etiquetes} filter={noVenenFilter} {...props} nameSearch={nameSearch} setNameSearch={setNameSearch} showBuscar={showBuscar} setShowBuscar={setShowBuscar} isFocused={isFocused} setIsFocused={setIsFocused} json={props.json} />
                            </div>

                            <div className="swiper-slide llista-container castellers-canalla">
                                <LlistaCastellers slideNum={5} name="canalla" etiquetaUsers={etiquetaUsers} etiquetes={etiquetes} filter={canallaFilter} {...props} nameSearch={nameSearch} setNameSearch={setNameSearch} showBuscar={showBuscar} setShowBuscar={setShowBuscar} isFocused={isFocused} setIsFocused={setIsFocused} json={props.json} />
                            </div>

                            <div className="swiper-slide llista-container castellers-amagats">
                                <LlistaCastellers slideNum={6} name="amagats" etiquetaUsers={etiquetaUsers} etiquetes={etiquetes} filter={amagatFilter} {...props} nameSearch={nameSearch} setNameSearch={setNameSearch} showBuscar={showBuscar} setShowBuscar={setShowBuscar} isFocused={isFocused} setIsFocused={setIsFocused} json={props.json} />
                            </div>
                        </> : <>
                            <div className="swiper-slide llista-container castellers-confirmats">
                                <LlistaCastellers isModel={isModel} slideNum={1} name="etiquetes" etiquetaUsers={etiquetaUsers} etiquetes={etiquetes} filter={confirmatsFilter} {...props} nameSearch={nameSearch} setNameSearch={setNameSearch} showBuscar={showBuscar} setShowBuscar={setShowBuscar} isFocused={isFocused} setIsFocused={setIsFocused} json={props.json} />
                            </div>
                            <div className="swiper-slide llista-container castellers-tots">
                                <LlistaCastellers isModel={isModel} slideNum={2} name="tots" etiquetaUsers={etiquetaUsers} etiquetes={etiquetes} filter={() => true} {...props} nameSearch={nameSearch} setNameSearch={setNameSearch} showBuscar={showBuscar} setShowBuscar={setShowBuscar} isFocused={isFocused} setIsFocused={setIsFocused} json={props.json} />
                            </div>
                        </>
                    }
                </div>

                {
                    !showBuscar && isDesktop && swiper?.realIndex > 0 &&
                    <>
                        <div onClick={() => swiper?.slidePrev(0)} className="swiper-button-prev"></div>
                        <div onClick={() => swiper?.slideNext(0)} className="swiper-button-next"></div>
                    </>
                }
            </div>
        </>
    );
}

export default Controller;