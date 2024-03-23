import { useEffect, useState } from "react"
import Caixa from "./Caixa"

function IndividualDisplays({ pestanya, pilarsCaixes, json, pilarsAltures, pilarsAlturesMans, cummulativeAltures }) {
    const dontDisplay = pilarsCaixes
        .map(pilar => pilar.map(id => json[id]))
        .map(pilar => pilar.map(caixa => caixa?.pestanya.toLowerCase() !== pestanya.toLowerCase()))

    const individualDisplaysTransfs = pilarsCaixes
        .map(pilar => pilar.map(id => json[id]))
        .map(pilar => pilar.map(caixa => caixa.box.transform))
        .map(pilar => pilar.map(([a,b,c,d,x,y]) => [a,b,c,d, x-5, y-5]))
        .map(pilar => pilar.map(transform => `matrix(${transform.join(',')})`))

    const individualDisplays = individualDisplaysTransfs
        .map((pilar, i) => 
            pilar.map((transform, j) => {
                return (
                    <div key={`indivdisplay-${i}-${j}`} className="individual-displays" style={{
                        transform: transform,
                        display: dontDisplay[i][j] ? 'none' : 'flex',
                    }}>
                        <div className="individual-display">
                            { cummulativeAltures[i][j] }
                        </div>
                        { !isNaN(parseInt(pilarsAlturesMans[i][j]) - (140 + parseInt(pilarsAltures[i][j]))) && 
                            <div className="individual-display" style={{ backgroundColor: 'darkorange' }}>
                                { parseInt(pilarsAlturesMans[i][j]) - (140 + parseInt(pilarsAltures[i][j])) }
                            </div>
                        }
                    </div>
                )
            })
        )

    return (
        <div className="individual-displays-container">
            { individualDisplays }
        </div>
    )
}

function NumberIncrementer({ value, setValue, readonly }) {
    const numberIncrementerStyle = {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        // Wood color
        backgroundColor: 'rgba(133,94,66, 0.75)',
        color: 'white',
        borderRadius: 5,
        padding: 5,
        paddingLeft: 10,
        paddingRight: 10,
        fontSize: 12,
        cursor: 'pointer',
    }

    const askForValue = () => {
        const newValue = prompt('Corregeix per desnivell', value);
        const isNumber = !isNaN(parseInt(newValue));

        if (newValue && isNumber) {
            setValue(newValue);
        }
    }

    return (
        <div style={numberIncrementerStyle} onPointerUp={readonly ? undefined : askForValue}>
            { value > 0 && <span>+</span> }
            { value }
        </div>
    )
}

function Fustes({ i, pestanya, socket, pilarsCaixes, json, fustes, setFustes, posicions, ...props }) {
    const changeFustes = (newFustes) => {
        if (newFustes.length > 0) {
            const action_id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            socket.emit('.save_change', `FUSTES,ARRAY,${newFustes.length},${newFustes.join(',')}`, action_id);
        }
    }

    useEffect(() => {
        if (posicions.fustes && posicions.fustes.length === pilarsCaixes.length) {
            setFustes(posicions.fustes)
        } else {
            setFustes(new Array(pilarsCaixes.length).fill(0))
        }
    }, [
        JSON.stringify(posicions.fustes),
        JSON.stringify(pilarsCaixes)
    ])

    return (
        <div className="fustes-container">
            <NumberIncrementer
                value={fustes[i] || 0}
                setValue={value => {
                    const newFustes = [...fustes]
                    newFustes[i] = value
                    setFustes(newFustes)

                    // Sincronize with server
                    changeFustes(newFustes)
                }}
                {...props}
            />
        </div>
    )
}

function NomColumna({ nomsColumnesSim, i, addons, setAddons, setIsFocused, isFocused }) {
    const handleChange = (e) => {
        setAddons(prev => {
            return {
                ...prev,
                noms_columnes: {
                    ...(prev?.noms_columnes || {}),
                    [i]: e.target.value
                }
            }
        })
    }

    return (
        <div className="nom-columna">
            <input
                type="text"
                value={nomsColumnesSim?.[i] || addons?.noms_columnes?.[i] || ''}
                placeholder={`Columna ${i}`}
                disabled={true}
                // onChange={handleChange}
                // onFocus={() => setIsFocused(true)}
                // onBlur={() => setIsFocused(false)}
                style={{
                    fontSize: 10,
                    border: 'none',
                    textAlign: 'center',
                }}
            />
        </div>
    )
}

function DuplicatedBaixos(props) {
    const { readonly, setAddons, addons, posicions, pestanya, pilarsCaixes, json, pilarsAltures, pilarsAlturesMans, cummulativeAltures } = props

    const doDisplay = pilarsCaixes
        .map(pilar => pilar.map(id => json[id]))
        .map(pilar => pilar.map(caixa => caixa?.pestanya.toLowerCase() !== pestanya.toLowerCase()))

    const caixesTransfs = pilarsCaixes
        .map(pilar => pilar.map(id => json[id]))
        .map(pilar => pilar.filter(caixa => caixa?.pestanya.toLowerCase() === pestanya.toLowerCase()))
        .map(pilar => pilar.map(caixa => caixa.box.transform))

    const caixaAttributes = pilarsCaixes
        .map(pilar => pilar.map(id => json[id]))
        .map(pilar => pilar.map(caixa => caixa.box))
        .flat()
        [0] || [0,0]

    const [caixaWidth, caixaHeight] = [
        parseInt(caixaAttributes.width),
        parseInt(caixaAttributes.height)
    ]

    const caixesXYs = caixesTransfs
        .map(pilar => pilar.map(([a,b,c,d,x,y]) => [x,y]))

    const isRotated = caixesTransfs
        .map(pilar => pilar.map(([a,b,c,d,x,y]) => a*c + b*d < 0))

    // Lowest point of the pilar
    const lowestXYs = caixesXYs
        .map(pilar => pilar.reduce((acc, [x,y]) => y > acc[1] ? [x,y] : acc, [-Infinity,-Infinity]))

    // Fix infinite values
    const lowestXYsFixed = lowestXYs
        .map(([x,y], i) => [x === -Infinity && i > 0 ? lowestXYs[i-1][0] + caixaWidth + 10 : x, y === -Infinity && i > 0 ? lowestXYs[i-1][1] : y])

    const lowestTransfs = lowestXYsFixed
        .map(([x,y], i) => !isRotated[i] ? [x, parseInt(y) + caixaWidth] : [x, parseInt(y) + caixaHeight])
        .map(([x,y]) => [x, y + 10])
        .map(([x,y]) => `translate(${x}px, ${y}px)`)

    const lowestTransformStyle = i => ({
        position: 'absolute',
        transform: lowestTransfs[i],
    })

    return (
        <div>
            { pestanya.toLowerCase() === 'tronc' && lowestTransfs.map((transform, i) => (
                <div key={`baixos-${i}`} className="fusta" style={{
                    ...lowestTransformStyle(i),
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                }}>
                    {
                        pilarsCaixes[i]
                            .filter((id, j) => doDisplay[i][j])
                            .map((caixa_id, j) => {
                                const boxProps = json[caixa_id]["box"]
                                const alteredBoxProps = { ...boxProps }
                                alteredBoxProps.transform = [1,0,0,1,0,0]
                                alteredBoxProps.relative = true

                                if (boxProps.width < boxProps.height) {
                                    alteredBoxProps.width = boxProps.height
                                    alteredBoxProps.height = boxProps.width
                                }

                                const textProps = json[caixa_id]["text"]
                                const alteredTextProps = { ...textProps }
                                alteredTextProps.transform = [1,0,0,1,0,0]

                                const assignat = caixa_id in posicions.caixes ? posicions.caixes[caixa_id] : -1

                                const assistencia = props.assistenciesEvent
                                    ?.filter(assistencia => assistencia.id === assignat)
                                    ?.map(assistencia => assistencia['assistència'])
                                    ?.[0]

                                return (
                                    <div
                                        key={`duplicated-${caixa_id}`}
                                        style={{ position: 'relative' }}
                                    >
                                        {
                                            !readonly && (
                                                <div
                                                    className="individual-display"
                                                    style={{ position: 'absolute', top: -5, left: -5 }}
                                                >
                                                    { cummulativeAltures[i][j] }
                                                </div>
                                            )
                                        }

                                        <Caixa
                                            key={caixa_id}
                                            {...json[caixa_id]}
                                            id={caixa_id}
                                            boxProps={alteredBoxProps}    
                                            textProps={alteredTextProps}  
                                            className="noselectable"
                                            fill={json[caixa_id].fill || 'white'}
                                            assignat={assignat}
                                            hasClone={'clone' in json[caixa_id]}
                                            fontSize={14}
                                            assistencia={assistencia}
                                            {...props}
                                            disabled={true}
                                        />
                                    </div>
                                )
                            })
                            .reverse()
                            .concat(
                                <div
                                    key={`fustes`}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Fustes
                                        i={i}
                                        pilarsCaixes={pilarsCaixes}
                                        json={json}
                                        posicions={posicions}
                                        pestanya={pestanya}
                                        {...props}
                                    />
                                </div>
                            )
                            .concat(
                                <div
                                    key={`nom-columna`}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        marginTop: 20,
                                        width: Math.max(caixaWidth, caixaHeight),
                                    }}
                                >
                                    <NomColumna
                                        i={i}
                                        addons={addons}
                                        setAddons={setAddons}
                                        {...props}
                                    />
                                </div>
                            )
                    }
                </div>
            )) }
        </div>
    )
}

function TroncCalculations({ opacity, json, posicions, castellersInfo, pestanya, ...props }) {
    const possiblePilars = [...new Set(
        Object.values(json)
            .filter(caixa => caixa.pilar || caixa.pilar === 0)
            .filter(caixa => !isNaN(caixa.pilar))
            .map(caixa => caixa.pilar)
        || []
    )]
        .sort((a,b) => a > b ? 1 : -1)

    // Fetch values
    const orderedTabs = ['pinya', 'folre', 'manilles', 'puntals', 'tronc', 'organització'].reverse()

    const pilarsCaixes = possiblePilars
        .map(pilar => Object.keys(json)
            .filter(id => json[id].pilar === pilar)
        )
        .map(pilar =>
            pilar
                .filter(id => json[id]?.box?.transform)
                .filter(id => json[id].box.transform.length >= 1)
                .sort((a,b) => {
                    const a_pestanya = json[a].pestanya.toLowerCase()
                    const b_pestanya = json[b].pestanya.toLowerCase()

                    if (a_pestanya !== b_pestanya) {
                        if (orderedTabs.includes(a_pestanya) && orderedTabs.includes(b_pestanya)) {
                            return orderedTabs.indexOf(a_pestanya) < orderedTabs.indexOf(b_pestanya) ? 1 : -1;
                        } else if (orderedTabs.includes(a_pestanya)) {
                            return 1;
                        } else if (orderedTabs.includes(b_pestanya)) {  
                            return -1;
                        }
                    }

                    const a_y = json[a].box.transform.at(-1);
                    const b_y = json[b].box.transform.at(-1);

                    return a_y < b_y ? 1 : -1;
                })   
        )

        const pilarsAltures = pilarsCaixes
            .map(pilar => pilar.map(
                id =>
                    id in posicions.caixes ?
                        posicions.caixes[id] in castellersInfo ?
                            castellersInfo[posicions.caixes[id]]
                        : null
                    :
                    json[id].clone in posicions.caixes ?
                        posicions.caixes[json[id].clone] in castellersInfo ?
                            castellersInfo[posicions.caixes[json[id].clone]]
                        : null
                    : null
            ))
            .map(pilar => pilar.map(user => user?.altura))
            .map(pilar => pilar.map(altura => parseInt(altura)))
            .map(pilar => pilar.map(altura => isNaN(altura) ? 0 : altura))

    const pilarsAlturesMans = pilarsCaixes
        .map(pilar => pilar.map(
            id =>
                id in posicions.caixes ?
                    posicions.caixes[id] in castellersInfo ?
                        castellersInfo[posicions.caixes[id]]
                    : null
                :
                json[id].clone in posicions.caixes ?
                    posicions.caixes[json[id].clone] in castellersInfo ?
                        castellersInfo[posicions.caixes[json[id].clone]]
                    : null
                : null
        ))
        .map(pilar => pilar.map(user => user?.altura_mans))
        .map(pilar => pilar.map(altura_mans => isNaN(altura_mans) ? null : parseInt(altura_mans)))

    const [fustes, setFustes] = useState([])

    const cummulativeAltures = pilarsAltures
        .map((pilar, i) => pilar.map((sum => value => sum += value)(parseInt(fustes[i]) || 0)))

    return (
        <div
            style={{
                opacity: opacity
            }}
        >
            {
                !props.readonly && <IndividualDisplays
                    pilarsCaixes={pilarsCaixes}
                    json={json}
                    pilarsAltures={pilarsAltures}
                    pilarsAlturesMans={pilarsAlturesMans}
                    cummulativeAltures={cummulativeAltures}
                    pestanya={pestanya}
                />
            }

            <DuplicatedBaixos
                pilarsCaixes={pilarsCaixes}
                json={json}
                pilarsAltures={pilarsAltures}
                pilarsAlturesMans={pilarsAlturesMans}
                cummulativeAltures={cummulativeAltures}
                pestanya={pestanya}
                posicions={posicions}
                castellersInfo={castellersInfo}
                fustes={fustes}
                setFustes={setFustes}
                {...props}
            />
        </div>
    )
}

export default TroncCalculations;