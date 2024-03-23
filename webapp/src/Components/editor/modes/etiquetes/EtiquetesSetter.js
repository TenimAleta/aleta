import { useEffect, useState } from "react";
import RenglaInferer, { processNatural } from "./RenglaInferer";
import useLongPress from "../../../../utils/useLongPress";
import EtiquetaChooser, { PopupEtiquetaChooser } from "./EtiquetaChooser";
import Pressable from "../../../other/Pressable";

// Bons seeds: 9, 15
const generateColorFromStr = (str, seed = 15, maxComponentValue = 200) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash) + seed;
    }
    hash = hash & hash; // Convert to 32bit integer

    // Extracting RGB components from hash
    let r = (hash & 0xFF0000) >> 16;
    let g = (hash & 0x00FF00) >> 8;
    let b = hash & 0x0000FF;

    // Applying the maximum limit
    r = Math.min(r, maxComponentValue);
    g = Math.min(g, maxComponentValue);
    b = Math.min(b, maxComponentValue);

    // Converting to a 6-digit hexadecimal color code with padding if necessary
    let color = ((r << 16) | (g << 8) | b).toString(16).toUpperCase();
    color = "000000".substring(0, 6 - color.length) + color;

    return '#' + color;
}

export const perfilToColor = (perfil, transparency = 1) => {
    // Check if perfil is a number
    if (perfil === undefined || perfil === null) return '#ccc';
    return generateColorFromStr(perfil);
};

export const darkenColor = (color, amount) => {
    let usePound = false;

    if (color[0] === "#") {
        color = color.slice(1);
        usePound = true;
    }

    let num = parseInt(color, 16);

    // Subtract the amount from each color component
    let r = ((num >> 16) & 0xFF) - amount;
    let g = ((num >> 8) & 0x00FF) - amount;
    let b = (num & 0x0000FF) - amount;

    // Clamp each component to the 0-255 range
    r = Math.max(Math.min(r, 255), 0);
    g = Math.max(Math.min(g, 255), 0);
    b = Math.max(Math.min(b, 255), 0);

    // Convert each component back to a two-digit hexadecimal number and concatenate
    const result = (usePound ? "#" : "") + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');

    return result;
};

function EtiquetesSetter({ etiquetaToInput, setEtiquetaToInput, popupClosed, setPopupClosed, submode, setSubmode, show, mode, setMode, ...props }) {
    const quitMode = (e) => {
        setMode(null);
    }

    const setSubmodeBorrar = (force=false) => {
        props.setCaixaSelected(-1)

        setSubmode(prevSubmode => {
            if (prevSubmode !== 'remove' || force === true) {
                return 'remove';
            } else {
                return null;
            }
        })
    }

    const setSubmodeAdd = (force=false) => {
        props.setCaixaSelected(-1)

        setSubmode(prevSubmode => {
            if (prevSubmode !== 'add' || force === true) {
                return 'add';
            } else {
                return null;
            }
        })
    }
    
    const chooseEtiqueta = (caixaSelected, force_etiqueta=null) => {
        if (caixaSelected !== -1) {
            // TODO: Change (?)
            const etiqueta = force_etiqueta;
            
            if (!etiqueta) {
                const { etiqueta, perfil, ...rest } = props.json[caixaSelected]

                props.setJsonOutput({
                    ...props.json,
                    [caixaSelected]: {
                        ...rest
                    }
                })
            } else {
                props.setJsonOutput({
                    ...props.json,
                    [caixaSelected]: {
                        ...props.json[caixaSelected],
                        etiqueta: etiqueta.id,
                        perfil: etiqueta.nom.toLowerCase()
                    }
                })
            }
            
        }
    }

    useEffect(() => {
        props.setCaixaSelected(-1);
    }, [etiquetaToInput, mode, submode])

    useEffect(() => {
        if (submode === 'add' && mode === 'etiquetes') {
            chooseEtiqueta(props.caixaSelected, etiquetaToInput);
        } else if (submode === 'remove') {
            chooseEtiqueta(props.caixaSelected, null);
        }
    }, [props.caixaSelected, submode])

    useEffect(() => {
        // Define a function for the 'keydown' event
        const handleKeyDown = (event) => {
            if (event.key === 'Backspace' || event.key === 'Delete') {
                setSubmodeBorrar()
            } else if (event.key === 'Escape') {
                setSubmode(null)
            }
        }

        // Attach the event listener
        window.addEventListener('keydown', handleKeyDown);

        // Clean up function
        return () => {
            // Remove the event listener when the component is unmounted
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, [props.caixaSelected, etiquetaToInput, submode]) // update the event listener every time props.caixaSelected changes

    useEffect(() => {
        if (etiquetaToInput && (!submode || submode === 'remove')) {
            setSubmodeAdd(true);
        }
    }, [
        etiquetaToInput,
    ])

    return show && (
        <>
            <Pressable className="boto" onClick={quitMode}>
                <span role="img" aria-label="choose">
                    ⬅️
                </span>
            </Pressable>
            <EtiquetaChooser etiquetaToInput={etiquetaToInput} show={true} popupClosed={popupClosed} setPopupClosed={setPopupClosed} {...props} />
            <RenglaInferer
                etiqueta={etiquetaToInput}
                show={etiquetaToInput}
                submode={submode}
                setSubmode={setSubmode}
                {...props}
            />
            {
                etiquetaToInput && (
                    <Pressable title="Definir puntualment (P)" style={{ backgroundColor: 'rgba(0,200,100,0.2)' }} className={`boto ${submode !== 'add' ? 'disabled' : 'selected'}`} onClick={setSubmodeAdd}>
                        <span>
                            ☝
                        </span>
                    </Pressable>
                )
            }
            <Pressable title="Esborrar cordó (DELETE/BACKSPACE)" style={{ backgroundColor: 'rgba(100,0,100,0.2)' }} className={`boto ${submode !== 'remove' ? 'disabled' : 'selected'}`} onClick={setSubmodeBorrar}>
                <span role="img" aria-label="choose">
                    🗑️
                </span>
            </Pressable>
        </>
    );
}

export default EtiquetesSetter;