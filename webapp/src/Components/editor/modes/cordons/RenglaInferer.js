import { useEffect, useState } from "react";
import useLongPress from "../../../../utils/useLongPress";
import Pressable from "../../../other/Pressable";

const getNeighbours = (caixa, json) => {
    const neighbours = [];
    const [x,y] = caixa.box.transform.slice(-2)

    Object.entries(json)
        .filter(([id, caixa]) => caixa.type === 'caixa')
        .filter(([id, caixa]) => caixa?.cordo === undefined)
        .forEach(([id, caixa]) => {
            const [x2,y2] = caixa.box.transform.slice(-2)
            const dist = Math.sqrt((x2-x)**2 + (y2-y)**2)

            if (dist < 100) {
                neighbours.push(id);
            }
        })

    return neighbours;
}

const getLinearReg = (caixa1, caixa2) => {
    const [x1,y1] = caixa1.box.transform.slice(-2)
    const [x2,y2] = caixa2.box.transform.slice(-2)

    if (Math.abs(x2-x1) < 10) {
        return {
            m: Infinity,
            b: y1,
        }
    }

    const m = (y2-y1)/(x2-x1);
    const b = y1 - m*x1;

    return {
        m,
        b
    }
}

const getLinearRegression = (caixa1, caixa2) => {
    const [x1,y1] = caixa1.box.transform.slice(-2)
    const [x2,y2] = caixa2.box.transform.slice(-2)

    // Vertically aligned
    if (Math.abs(x2-x1) < 1) {
        return (x, y) => {
            return Math.abs(x-x1) < 1 ? true : false;
        }
    }

    const m = (y2-y1)/(x2-x1);
    const b = y1 - m*x1;

    return (x, y) => {
        const y2 = m*x + b;
        return Math.abs(y-y2) < 15 ? true : false;
    }
}

const checkAndAddToRengla = (id, isInRengla, json, rengla) => {
    const caixa = json[id];
    const [x, y] = caixa.box.transform.slice(-2);

    if (isInRengla(x, y) && !rengla.includes(id)) {
        rengla.push(id);  // Add to the rengla

        // Check its neighbours recursively
        const neighbours = getNeighbours(caixa, json);
        neighbours.forEach(neighbourId => {
            checkAndAddToRengla(neighbourId, isInRengla, json, rengla);
        });
    }
}

const getRengla = (id, isInRengla, json) => {
    const rengla = [];
    checkAndAddToRengla(id, isInRengla, json, rengla);
    return rengla;
}

const sortedRengla = (rengla, json) => {
    const caixes = Object.values(json)
        .filter(caixa => caixa.type === 'caixa')

    const caixes_center = caixes
        .map(caixa => caixa.box.transform.slice(-2))
        .map(([x,y]) => [parseInt(x), parseInt(y)])
        .reduce((acc, [x,y]) => {
            acc.x += x/caixes.length;
            acc.y += y/caixes.length;
            return acc;
        }, {x: 0, y: 0})

    // Sort rengla by distance to center (ascendent)
    rengla.sort((id1, id2) => {
        const [x1,y1] = json[id1].box.transform.slice(-2);
        const [x2,y2] = json[id2].box.transform.slice(-2);

        const dist1 = Math.sqrt((x1-caixes_center.x)**2 + (y1-caixes_center.y)**2)
        const dist2 = Math.sqrt((x2-caixes_center.x)**2 + (y2-caixes_center.y)**2)

        return dist1 - dist2;
    })

    return rengla;
}

export const processNatural = input => {
    const integer = parseInt(input);

    if (isNaN(integer)) {
        return -1;
    }

    if (integer < 0) {
        return -1;
    }

    return integer;
}

const fillRengla = (rengla, json, setJsonOutput, defaultStart=1) => {
    if (isNaN(defaultStart)) {
        alert('El cordó ha de ser un número: 1, 2, 3, 4...')
        return;
    }

    const sorted = sortedRengla(rengla, json)

    sorted
        .filter(id => json[id].type === 'caixa')
        .filter(id => json[id]?.cordo === undefined)
        .forEach((id, k) => {
            setJsonOutput(prevJson => ({
                ...prevJson,
                [id]: {
                    ...prevJson[id],
                    cordo: parseInt(parseInt(defaultStart) + k)
                }
            }))
        })
}

const isLinearRegressionAligned = (caixa, neighbour, json) => {
    const caixes = Object.values(json)
        .filter(caixa => caixa.type === 'caixa')

    const caixes_center = caixes
        .map(caixa => caixa.box.transform.slice(-2))
        .map(([x,y]) => [parseInt(x), parseInt(y)])
        .reduce((acc, [x,y]) => {
            acc.x += x/caixes.length;
            acc.y += y/caixes.length;
            return acc;
        }, {x: 0, y: 0})

    const fakeCaixaCenter = {
        box: {
            transform: [
                caixes_center.x,
                caixes_center.y
            ]
        }
    }

    const linearRegWithCenter = getLinearReg(caixa, fakeCaixaCenter);
    const linearRegWithNeightbour = getLinearReg(caixa, neighbour);

    // TODO: Check if the two linear regressions are aligned
    // console.log(
    //     linearRegWithCenter,
    //     linearRegWithNeightbour
    // )

    if (Math.abs(linearRegWithCenter.m) > 3 || Math.abs(linearRegWithNeightbour.m) > 3) {
        return true;
    }

    return Math.abs(linearRegWithCenter.m - linearRegWithNeightbour.m) < 1.5
}

function RenglaInferer({ show, submode, setSubmode, caixaSelected, setCaixaSelected, json, setJsonOutput }) {
    const [defaultStart, setDefaultStart] = useState(1);

    const infere_rengla = () => {
        const caixa = json[caixaSelected];
        const neighbours = getNeighbours(caixa, json);
        const rengles = []

        neighbours.forEach(id => {
            const neighbour = json[id];
            const isInRengla = getLinearRegression(caixa, neighbour);

            if (!isLinearRegressionAligned(caixa, neighbour, json)) return;

            const rengla = getRengla(caixaSelected, isInRengla, json);
            rengles.push(rengla)
        })

        // Get longest rengla
        const longestRengla = rengles.reduce((acc, rengla) => {
            return rengla.length > acc.length ? rengla : acc;
        }, [])

        // Fill rengla with cordons
        fillRengla(longestRengla, json, setJsonOutput, defaultStart);

        // Deselect caixa
        setCaixaSelected(-1)
    }

    const toggleSubmodeMagic = () => {
        setCaixaSelected(-1)

        setSubmode(prevSubmode => {
            if (prevSubmode === 'magic') {
                return null;
            } else {
                return 'magic';
            }
        })
    }

    const changeDefaultStart = () => {
        const input = prompt('Defineix amb quin cordó comença la rengla:', defaultStart);
        const processed = processNatural(input);

        if (processed !== -1) {
            setDefaultStart(processed);
        }
    }

    const longPressEvent = useLongPress(
        () => changeDefaultStart(),
        () => undefined,
        500
    );

    useEffect(() => {
        // Define a function for the 'keydown' event
        const handleKeyDown = (event) => {
            if (show && event.key === 'W' || event.key === 'w') {
                toggleSubmodeMagic()
            } else if (!isNaN(event.key) && submode === 'magic') {
                setDefaultStart(parseInt(event.key))
            }
        }

        // Attach the event listener
        window.addEventListener('keydown', handleKeyDown);

        // Clean up function
        return () => {
            // Remove the event listener when the component is unmounted
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, [caixaSelected, submode]) // update the event listener every time props.caixaSelected changes

    useEffect(() => {
        if (submode === 'magic' && caixaSelected !== -1) {
            infere_rengla();
        }
    }, [caixaSelected, submode])

    return show && (
        <>
            <Pressable {...longPressEvent} title="Definir màgicament (W)" style={{ backgroundColor: 'rgba(200,50,120,0.2)' }} className={`boto ${submode !== 'magic' ? 'disabled' : 'selected'}`} onClick={toggleSubmodeMagic}>
                <span role="img" aria-label="choose">
                    🪄
                </span>
                <span style={{ fontSize: 11 }}>
                    {defaultStart}
                </span>
            </Pressable>
        </>
    );
}

export default RenglaInferer;