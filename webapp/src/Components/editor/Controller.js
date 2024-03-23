import React, { useState, useEffect } from 'react';
import './Controller.css'
import Swiper from 'swiper';
import 'swiper/css';
import Duplicator from './modes/Duplicator';
import Classifier, { PopupClassifier } from './modes/Classifier';
import PilarChooser from './modes/PilarChooser';
import FontResizer from './modes/FontResizer';
import LayerChooser from './modes/LayerChooser';
import BotoPestanya from './BotoPestanya'
import QuiTrepitja from './modes/QuiTrepijta';
import Escaletes from './modes/Escaletes';
import CordoSetter from './modes/cordons/CordoSetter';
import CordoModeSetter from './modes/cordons/CordoModeSetter';
import BotoPestanyaUp from '../pissarra/controller/botons/BotoPestanyaUp';
import BotoPestanyaDown from '../pissarra/controller/botons/BotoPestanyaDown';
import CaixaEraser from './modes/CaixaEraser';
import RotateText from './modes/RotateText';
import { postAPI } from '../../utils/utils';
import PomsClassifier, { PopupPomsClassifier } from './modes/PomsClassifier';
import EtiquetaModeSetter from './modes/etiquetes/EtiquetaModeSetter';
import EtiquetesSetter from './modes/etiquetes/EtiquetesSetter';
import { PopupEtiquetaChooser } from './modes/etiquetes/EtiquetaChooser';
import Pressable from '../other/Pressable';

const formatName = name => name
    .replace(/[^a-zA-Z0-9_()-]/g, '')
    .toLowerCase();

const savePlantilla = ({ force=false, socket, plantillaDefaultName, jsonOutput, selectedCastellPart, setNotification }) => {
    if (window.location.pathname === `/editor/new`) {
        // Ask for a name
        const name = prompt(
            `NOM DE LA PLANTILLA` + (force ? ` - (No el canviïs si vols sobreescriure-la, trobaràs l'antiga a l'apartat "Plantilles eliminades")` : ''),
            selectedCastellPart !== null ? formatName(selectedCastellPart) :
            plantillaDefaultName !== null ? formatName(plantillaDefaultName) :
            ''
        );

        if (name) {
            socket.emit('.create_plantilla', formatName(name), jsonOutput, force)
        }
    } else {
        const urlName = window.location.pathname.split('/').filter(part => part != '')[1];

        if (urlName) {
            postAPI(
                '/save_plantilla',
                { nom: formatName(urlName), data: jsonOutput },
                data => console.log(data),
            );

            // socket.emit('.save_plantilla', formatName(urlName), jsonOutput, force)
            setNotification('✅ Guardat correctament')
        }
    }
}

const getCaixesFromJSON = (json, condition) => {
    return Object.fromEntries(
        Object.entries(json)
            .filter(el => el[1] && el[1].type === 'caixa')
            .filter(condition)
    )
}

const saveBundle = ({ socket, jsonOutput, addons, selectedBundle, bundleInfo, setNotification }) => {
    if (window.location.pathname === `/editor/bundle/new`) {
        // Doesn't exist
    } else {
        const urlName = window.location.pathname.split('/').filter(part => part != '')[2];

        if (urlName) {

            const parts = Object.fromEntries(
                (Object.entries(bundleInfo?.parts) || [])
                    .map(([pestanya, plantilla]) => [
                        plantilla,
                        getCaixesFromJSON(jsonOutput,
                            ([id, caixa]) => caixa?.pestanya.toLowerCase() === pestanya.toLowerCase()
                        )
                    ])
            )

            socket.emit('.update_bundle_caixes', selectedBundle, parts)
            socket.emit('.update_bundle_addons', selectedBundle, addons)
            setNotification('✅ Guardat correctament')
        }
    }
}

function BotoSave(props) {
    const { socket, hasJSONChanged, setHasJSONChanged } = props;

    const save = () => {
        if (!props.selectedBundle) {
            savePlantilla(props);
            setHasJSONChanged(0)
        } else {
            saveBundle(props);
            setHasJSONChanged(0)
        }
    }

    // useEffect(() => {
    //     const handleBeforeUnload = (event) => {
    //         if (hasJSONChanged) {
    //             event.preventDefault();
    //             // Setting returnValue is necessary for some browsers
    //             event.returnValue = 'You have unsaved changes, are you sure you want to leave?';
    //             // Custom messages may not be shown by the browser, but the prompt will still appear
    //         }
    //     };
    
    //     window.addEventListener('beforeunload', handleBeforeUnload);
    
    //     return () => {
    //         window.removeEventListener('beforeunload', handleBeforeUnload);
    //     };
    // }, [hasJSONChanged]);    

    useEffect(() => {
        socket.on('.duplicate_plantilla', nom => {
            const forceSave = window.confirm(`Ja existeix una plantilla amb el nom ${nom}. Canvia-li el nom o sobreescriure-la.`)
            if (forceSave) savePlantilla({ ...props, plantillaDefaultName: nom, force: true })
        })

        socket.on('.created_plantilla', nom => {
            window.location.href = `/editor/${nom}`;
        })

        return () => {
            socket.off('.duplicate_plantilla');
            socket.off('.created_plantilla');
        }
    }, [])

    useEffect(() => {
        if (!props.popupClosed) return;

        // Define a function for the 'keydown' event
        const handleKeyDown = (event) => {
            // If the key is 'S', call savePlantilla
            if (!props.isFocused && (event.key === 'S' || event.key === 's')) {
                event.preventDefault()
                save()
            }
        }

        // Attach the event listener
        window.addEventListener('keydown', handleKeyDown);

        // Clean up function
        return () => {
            // Remove the event listener when the component is unmounted
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, [props.isFocused, props, props.popupClosed]) // update the event listener every time props changes

    return (
        <Pressable className="boto save-button" onClick={save}>
            <span role="img" aria-label="save">💾</span>
            <div style={{
                position: 'absolute',
                left: 12,
                backgroundColor: 'rgba(173, 216, 230, 0.7)', // lightblue with 70% transparency
                fontSize: 10,
                padding: 3,
                borderRadius: 5,
                color: 'rgba(0, 0, 0, 0.7)', // black font with 70% transparency
            }}>
                S
            </div>
        </Pressable>
    );
}

function Controller(props) {
    const { mode, selectedBundle, tabs, pestanya, setPestanya, socket, extended, setExtended, ajuntament, setAjuntament, castellerSelected, posicions, lastCaixes, caixaSelected, swiper, setSwiper, castell } = props;
    const [popupClosed, setPopupClosed] = useState(true);
    const [popupClosedPoms, setPopupClosedPoms] = useState(true);
    const [hasJSONChanged, setHasJSONChanged] = useState(-1);
    const [etiquetaToInput, setEtiquetaToInput] = useState(null);

    useEffect(() => {
        setHasJSONChanged(prev => prev + 1)
    }, [
        JSON.stringify(props.json)
    ])

    useEffect(() => {
        setSwiper(new Swiper(".controllerSwiper", {
            threshold: 20,
            initialSlide: 0,
            allowTouchMove: true
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
        }
    }, [swiper])

    const noCaixaSelected = caixaSelected === -1;
    const isCaixaSelected = caixaSelected !== -1;

    return (
        <>
            <PopupEtiquetaChooser etiquetaToInput={etiquetaToInput} setEtiquetaToInput={setEtiquetaToInput} popupClosed={popupClosed} setPopupClosed={setPopupClosed} {...props} />
            <PopupPomsClassifier popupClosed={popupClosedPoms} setPopupClosed={setPopupClosedPoms} {...props} />

            <div id="controller-container" className={`swiper controllerSwiper ${extended ? 'extended' : ''}`}>
                <div className="swiper-wrapper">
                    <div className="swiper-slide botons">
                        {
                            mode === 'cordons' ? <>
                                <CordoSetter show={true} {...props} />
                            </> : 
                            mode === 'etiquetes' ? <>
                                <EtiquetesSetter show={true} etiquetaToInput={etiquetaToInput} setEtiquetaToInput={setEtiquetaToInput} popupClosed={popupClosed} setPopupClosed={setPopupClosed} {...props} />
                            </> :
                            <>
                                {
                                    !selectedBundle && <>
                                        <CaixaEraser show={isCaixaSelected} popupClosed={popupClosed} {...props} />
                                        <PilarChooser show={isCaixaSelected} popupClosed={popupClosed} {...props} />
                                        {/* <Classifier show={isCaixaSelected} popupClosed={popupClosed} setPopupClosed={setPopupClosed} {...props} /> */}
                                        <RotateText show={isCaixaSelected} popupClosed={popupClosed} {...props} /> 
                                        <PomsClassifier show={isCaixaSelected} popupClosed={popupClosedPoms} setPopupClosed={setPopupClosedPoms} {...props} />
                                    </>
                                }

                                <Duplicator show={isCaixaSelected} popupClosed={popupClosed} {...props} />

                                {
                                    selectedBundle && <>
                                        <QuiTrepitja show={isCaixaSelected} popupClosed={popupClosed} {...props} />
                                        <Escaletes show={isCaixaSelected} popupClosed={popupClosed} {...props} />
                                    </>
                                } 

                                <FontResizer show={noCaixaSelected} {...props} />
                                <CordoModeSetter show={noCaixaSelected} {...props} />
                                <EtiquetaModeSetter show={noCaixaSelected} {...props} />
                            </>
                        }
                        
                        <BotoSave hasJSONChanged={hasJSONChanged} popupClosed={popupClosed} setHasJSONChanged={setHasJSONChanged} {...props} />
                        <BotoPestanyaUp show={selectedBundle} tabs={tabs} pestanya={pestanya} setPestanya={setPestanya} {...props} />
                        <BotoPestanyaDown show={selectedBundle} tabs={tabs} pestanya={pestanya} setPestanya={setPestanya} {...props} />
                    </div>
                </div>
            </div>
        </>
    );
}

export default Controller;