import { useEffect, useState } from "react";
import RenglaInferer, { processNatural } from "./RenglaInferer";
import useLongPress from "../../../../utils/useLongPress";
import Pressable from "../../../other/Pressable";

const hsvToRgb = (h, s, v) => {
    let r, g, b;
    const i = Math.floor(h / 60);
    const f = (h / 60) - i;
    const p = v * (1 - s);
    const q = v * (1 - s * f);
    const t = v * (1 - s * (1 - f));

    if (i === 0) { r = v; g = t; b = p; }
    else if (i === 1) { r = q; g = v; b = p; }
    else if (i === 2) { r = p; g = v-0.5; b = t; }
    else if (i === 3) { r = p; g = q; b = v; }
    else if (i === 4) { r = t; g = p; b = v-5; }
    else { r = v; g = p; b = q; }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

export const cordoToColor = (cordo, transparency = 1) => {
    // Check if cordo is a number
    if (cordo === undefined || cordo === null) return '#ccc';
    if (isNaN(cordo)) return '#ccc';

    const MAX_CORDO = 10;
    const normalizedCordo = Math.min(Math.max(cordo / MAX_CORDO, 0), 1); // Clamped between 0 and 1

    const hue = normalizedCordo * 360; // Convert to degrees
    const [r, g, b] = hsvToRgb(hue, 1, 1); // Convert HSV to RGB

    return `rgba(${r}, ${g}, ${b}, ${transparency})`;
};

function CordoSetter({ submode, setSubmode, show, mode, setMode, ...props }) {
    const [cordoToInput, setCordoToInput] = useState(0);

    const changeMode = (e) => {
        setMode(prev => prev === 'cordons' ? null : 'cordons');
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

    const chooseCordoToInput = () => {
        const input = prompt("A quin cordó pertany (número, 0 per nucli)?", cordoToInput || "")

        if (input.toUpperCase() === 'N' || input.toUpperCase() === 'NUCLI') {
            setCordoToInput(0);
        } else if (!isNaN(input)) {
            setCordoToInput(parseInt(input));
        } else {
            alert("El cordó ha de ser un número!")
        }
    }
    
    const chooseCordo = (caixaSelected, force_cordo=null) => {
        if (caixaSelected !== -1) {
            const cordo = !isNaN(force_cordo) || force_cordo === '?' ? force_cordo :
                prompt("A quin cordó pertany (número, 0 per nucli)?", props.json[caixaSelected]?.cordo || "");

            if (isNaN(cordo) && cordo !== '?') {
                alert("El cordó ha de ser un número!")
                return;
            }
            
            if (cordo === '?') {
                const { cordo, ...rest } = props.json[caixaSelected]

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
                        cordo: parseInt(cordo)
                    }
                })
            }
            
        }
    }

    useEffect(() => {
        props.setCaixaSelected(-1);
    }, [cordoToInput, mode, submode])

    useEffect(() => {
        if (submode === 'add' && mode === 'cordons' && !isNaN(cordoToInput) || cordoToInput === '?') {
            chooseCordo(props.caixaSelected, cordoToInput);
        } else if (submode === 'remove') {
            chooseCordo(props.caixaSelected, '?');
        }
    }, [props.caixaSelected, submode])

    useEffect(() => {
        // Define a function for the 'keydown' event
        const handleKeyDown = (event) => {
            // Check if the key is a number
            if (!isNaN(event.key) && submode === 'add') {
                setCordoToInput(prevCordo => {
                    setSubmodeAdd(parseInt(event.key) === prevCordo ? false : true)
                    return parseInt(event.key)
                });
            } else if (event.key === 'n' || event.key === 'N') {
                setCordoToInput(prevCordo => {
                    setSubmodeAdd(0 === prevCordo ? false : true)
                    return 0
                })
            } else if (event.key === 'p' || event.key === 'P') {
                setSubmodeAdd()
            } else if (event.key === 'Backspace' || event.key === 'Delete') {
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
    }, [props.caixaSelected, cordoToInput, submode]) // update the event listener every time props.caixaSelected changes

    const changeCordoToInput = () => {
        const input = prompt('Defineix quin cordó vols posar. (0 per NUCLI):', cordoToInput);
        const processed = processNatural(input);

        if (processed !== -1) {
            setCordoToInput(processed);
        }
    }

    const longPressEvent = useLongPress(
        () => changeCordoToInput(),
        () => undefined,
        500
    );

    return show && (
        <>
            <Pressable className="boto" onClick={changeMode}>
                <span role="img" aria-label="choose">
                    ⬅️
                </span>
            </Pressable>
            <RenglaInferer
                show={true}
                submode={submode}
                setSubmode={setSubmode}
                {...props}
            />
            <Pressable {...longPressEvent} title="Definir puntualment (P)" style={{ backgroundColor: 'rgba(0,200,100,0.2)' }} className={`boto ${submode !== 'add' ? 'disabled' : 'selected'}`} onClick={setSubmodeAdd}>
                <span>
                    ☝
                </span>
                <span style={{ fontSize: 11 }} role="img" aria-label="choose">
                    {
                        cordoToInput === 0 ? 'N' :
                        cordoToInput
                    }
                </span>
            </Pressable>
            <Pressable title="Esborrar cordó (DELETE/BACKSPACE)" style={{ backgroundColor: 'rgba(100,0,100,0.2)' }} className={`boto ${submode !== 'remove' ? 'disabled' : 'selected'}`} onClick={setSubmodeBorrar}>
                <span role="img" aria-label="choose">
                    🗑️
                </span>
            </Pressable>
        </>
    );
}

export default CordoSetter;